import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { Actions, PageServerLoad } from './$types';
import type { Project, Variant } from '$lib/types/pipeline';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.pb) throw redirect(303, `/app/projects/${params.id}`);

	let project;
	try {
		project = await locals.pb.collection('projects').getOne(params.id, { requestKey: null });
	} catch {
		throw redirect(303, '/app');
	}

	if (['draft', 'extracting_master'].includes(project.status)) {
		throw redirect(303, `/app/projects/${params.id}`);
	}

	let variants: unknown[] = [];
	if (project.status !== 'pending_master_validation') {
		try {
			variants = await locals.pb.collection('variants').getFullList({
				filter: `project = "${params.id}"`,
				sort: 'created',
				expand: 'persona',
				requestKey: null
			});
		} catch {
			variants = [];
		}
	}

	return {
		project: project as unknown as Project,
		variants: variants as unknown as Variant[]
	};
};

export const actions: Actions = {
	configure: async ({ params, request, locals, fetch }) => {
		if (!locals.pb) return fail(503, { message: 'Database unavailable' });

		const formData = await request.formData();
		const target_areas = (formData.getAll('target_area') as string[])
			.map((v) => v.trim())
			.filter(Boolean);
		const raw_count = formData.get('persona_count');
		const persona_count = Math.max(1, Math.min(10, parseInt(raw_count?.toString() ?? '3', 10)));

		if (isNaN(persona_count)) {
			return fail(400, { message: 'Personas per area must be a number between 1 and 10' });
		}
		if (target_areas.length === 0) {
			return fail(400, { message: 'Add at least one target area before starting' });
		}

		const webhookUrl = env.N8N_WEBHOOK_STEP2;
		if (!webhookUrl) return fail(500, { message: 'Step 2 webhook not configured' });

		const res = await fetch(webhookUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ project_id: params.id, target_area_list: target_areas, persona_count })
		});

		if (!res.ok) {
			return fail(502, { message: 'Failed to reach the N8N webhook. Check your configuration.' });
		}

		return { success: true, target_areas, persona_count };
	},

	approve: async ({ params, locals }) => {
		if (!locals.pb) return fail(503, { message: 'Database unavailable' });

		await locals.pb.collection('projects').update(params.id, { status: 'processing_variants' });

		redirect(303, `/app/projects/${params.id}`);
	}
};
