import { fail } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 as zod } from 'sveltekit-superforms/adapters';
import { z } from 'zod';
import { env } from '$env/dynamic/private';
import type { Actions, PageServerLoad } from './$types';
import type { Project, Variant } from '$lib/types/pipeline';

const jsonEditSchema = z.object({
	json_data: z.string().min(1, 'Data cannot be empty').refine((v) => {
		try {
			JSON.parse(v);
			return true;
		} catch {
			return false;
		}
	}, 'Must be valid JSON')
});

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.pb) {
		return {
			variant: null,
			project: null,
			researchEditForm: await superValidate(zod(jsonEditSchema))
		};
	}

	const [variant, project] = await Promise.all([
		locals.pb.collection('variants').getOne(params.variantId, { expand: 'persona', requestKey: null }),
		locals.pb.collection('projects').getOne(params.id, { requestKey: null })
	]);

	const researchEditForm = await superValidate(
		{ json_data: JSON.stringify(variant.researching_data ?? {}, null, 2) },
		zod(jsonEditSchema)
	);

	return {
		variant: variant as unknown as Variant,
		project: project as unknown as Project,
		researchEditForm
	};
};

async function triggerWebhook(
	webhookUrl: string | undefined,
	payload: Record<string, unknown>,
	fetch: typeof globalThis.fetch
): Promise<{ ok: boolean }> {
	if (!webhookUrl) return { ok: false };
	console.log('[webhook]', webhookUrl, payload);
	const res = await fetch(webhookUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload)
	});
	console.log('[webhook response]', res.status, res.statusText);
	return { ok: res.ok };
}

export const actions: Actions = {
	approveResearch: async ({ params, request, locals, fetch }) => {
		if (!locals.pb) return fail(503, { message: 'Database unavailable' });

		const form = await superValidate(request, zod(jsonEditSchema));
		if (!form.valid) return fail(400, { researchEditForm: form });

		await locals.pb.collection('variants').update(params.variantId, {
			researching_data: JSON.parse(form.data.json_data)
		});

		const { ok } = await triggerWebhook(
			env.N8N_WEBHOOK_STEP4,
			{ variant_id: params.variantId },
			fetch
		);

		if (!ok) return fail(502, { researchEditForm: form, message: 'Step 4 webhook failed' });

		return message(form, 'Architecture started');
	},

	approveFinal: async ({ params, locals }) => {
		if (!locals.pb) return fail(503, { message: 'Database unavailable' });

		await locals.pb.collection('variants').update(params.variantId, { status: 'completed' });

		const allVariants = await locals.pb.collection('variants').getFullList({
			filter: `project = "${params.id}"`,
			requestKey: null
		});

		const allDone = allVariants.every((v) => v.status === 'completed');
		if (allDone) {
			await locals.pb.collection('projects').update(params.id, { status: 'completed' });
		}

		return { success: true };
	},

	rerunResearch: async ({ params, locals, fetch }) => {
		if (!locals.pb) return fail(503, { message: 'Database unavailable' });

		const variant = await locals.pb.collection('variants').getOne(params.variantId, { requestKey: null });

		if (!variant.timeframe) {
			return fail(400, { message: 'No timeframe saved — use the Research page to configure and relaunch.' });
		}

		await locals.pb.collection('variants').update(params.variantId, { researching_data: null });

		const { ok } = await triggerWebhook(
			env.N8N_WEBHOOK_STEP3,
			{ variant_id: params.variantId, timeframe: variant.timeframe },
			fetch
		);

		if (!ok) return fail(502, { message: 'Step 3 webhook failed' });

		return { success: true };
	},

	rerunArchitect: async ({ params, locals, fetch }) => {
		if (!locals.pb) return fail(503, { message: 'Database unavailable' });

		await locals.pb.collection('variants').update(params.variantId, {
			architecting_data: null
		});

		const { ok } = await triggerWebhook(
			env.N8N_WEBHOOK_STEP4,
			{ variant_id: params.variantId },
			fetch
		);

		if (!ok) return fail(502, { message: 'Step 4 webhook failed' });

		return { success: true };
	},

	rerunDesign: async ({ params, locals, fetch }) => {
		if (!locals.pb) return fail(503, { message: 'Database unavailable' });

		await locals.pb.collection('variants').update(params.variantId, {
			designing_data: null
		});

		const { ok } = await triggerWebhook(
			env.N8N_WEBHOOK_STEP4,
			{ variant_id: params.variantId },
			fetch
		);

		if (!ok) return fail(502, { message: 'Step 4 webhook failed' });

		return { success: true };
	}
};
