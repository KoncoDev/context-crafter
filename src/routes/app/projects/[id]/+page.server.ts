import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { Actions, PageServerLoad } from './$types';
import type { Project, Variant } from '$lib/types/pipeline';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.pb) {
		return { project: null, variants: [] };
	}

	const [project, variants] = await Promise.all([
		locals.pb.collection('projects').getOne(params.id, { requestKey: null }),
		locals.pb.collection('variants').getFullList({
			filter: `project = "${params.id}"`,
			sort: 'created',
			expand: 'persona',
			requestKey: null
		})
	]);

	return {
		project: project as unknown as Project,
		variants: variants as unknown as Variant[]
	};
};

export const actions: Actions = {
	triggerExtraction: async ({ params, locals, fetch }) => {
		if (!locals.pb) return fail(503, { message: 'Database unavailable' });

		const webhookUrl = env.N8N_WEBHOOK_STEP1;
		if (!webhookUrl) return fail(500, { message: 'Step 1 webhook not configured' });

		const res = await fetch(webhookUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ project_id: params.id })
		});

		if (!res.ok) return fail(502, { message: 'N8N webhook failed' });

		return { success: true };
	},

	approvePersonas: async ({ params, locals }) => {
		if (!locals.pb) return fail(503, { message: 'Database unavailable' });

		await locals.pb.collection('projects').update(params.id, { status: 'processing_variants' });

		return { success: true };
	},

	retryPipeline: async ({ params, locals }) => {
		if (!locals.pb) return fail(503, { message: 'Database unavailable' });

		await locals.pb.collection('projects').update(params.id, { status: 'draft' });

		return { success: true };
	}
};
