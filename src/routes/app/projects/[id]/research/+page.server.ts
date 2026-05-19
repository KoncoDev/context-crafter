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

	if (!['processing_variants', 'completed'].includes(project.status)) {
		throw redirect(303, `/app/projects/${params.id}`);
	}

	let variants: unknown[] = [];
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

	return {
		project: project as unknown as Project,
		variants: variants as unknown as Variant[]
	};
};

export const actions: Actions = {
	updatePersona: async ({ request, locals }) => {
		if (!locals.pb) return fail(503, { message: 'Database unavailable' });

		const formData = await request.formData();
		const personaId = formData.get('persona_id')?.toString();
		if (!personaId) return fail(400, { message: 'Missing persona ID' });

		const update: Record<string, string> = {};
		for (const field of ['name', 'target_area', 'demographic_summary', 'psychological_driver', 'buying_trigger', 'primary_objection', 'preferred_tone']) {
			update[field] = formData.get(field)?.toString().trim() ?? '';
		}

		try {
			await locals.pb.collection('personas').update(personaId, update);
		} catch {
			return fail(500, { message: 'Failed to update persona' });
		}

		return { success: true };
	},

	deleteVariant: async ({ request, locals }) => {
		if (!locals.pb) return fail(503, { message: 'Database unavailable' });

		const formData = await request.formData();
		const variantId = formData.get('variant_id')?.toString();
		if (!variantId) return fail(400, { message: 'Missing variant ID' });

		try {
			await locals.pb.collection('variants').delete(variantId);
		} catch {
			return fail(500, { message: 'Failed to delete variant' });
		}

		return { success: true };
	},

	launchResearch: async ({ request, locals, fetch }) => {
		if (!locals.pb) return fail(503, { message: 'Database unavailable' });

		const formData = await request.formData();
		const timeframe = formData.get('timeframe')?.toString().trim();
		const variantIds = formData.getAll('variant_id') as string[];

		if (!timeframe) return fail(400, { message: 'Timeframe is required' });
		if (variantIds.length === 0) return fail(400, { message: 'Select at least one variant' });

		const webhookUrl = env.N8N_WEBHOOK_STEP3;
		if (!webhookUrl) return fail(500, { message: 'Step 3 webhook not configured' });

		const failures: string[] = [];
		for (const variantId of variantIds) {
			try {
				const res = await fetch(webhookUrl, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ variant_id: variantId, timeframe })
				});
				if (!res.ok) failures.push(variantId);
			} catch {
				failures.push(variantId);
			}
		}

		if (failures.length === variantIds.length) {
			return fail(502, { message: 'All webhook calls failed. Check N8N configuration.' });
		}

		return {
			success: true,
			launched: variantIds.length - failures.length,
			...(failures.length > 0 ? { partialFail: failures.length } : {})
		};
	}
};
