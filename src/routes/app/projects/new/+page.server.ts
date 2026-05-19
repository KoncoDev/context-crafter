import { fail, redirect } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 as zod } from 'sveltekit-superforms/adapters';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';

const createProjectSchema = z.object({
	name: z.string().min(1, 'Project name is required'),
	raw_data: z.string().min(20, 'Raw data must be at least 20 characters'),
	target_language: z.enum(['french', 'english', 'arabic'])
});

export const load: PageServerLoad = async () => {
	return { form: await superValidate(zod(createProjectSchema)) };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await superValidate(request, zod(createProjectSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		if (!locals.pb) {
			return message(form, 'Database unavailable', { status: 503 });
		}

		let record;
		try {
			record = await locals.pb.collection('projects').create({
				name: form.data.name,
				raw_data: form.data.raw_data,
				target_language: form.data.target_language,
				status: 'draft'
			});
		} catch (e: unknown) {
			const pb = e as { message?: string; data?: Record<string, unknown>; status?: number };
			const fieldErrors = pb.data ? JSON.stringify(pb.data) : '';
			const detail = fieldErrors || pb.message || 'Unknown error';
			return message(form, `PocketBase error (${pb.status ?? '?'}): ${detail}`, { status: 500 });
		}

		redirect(303, `/app/projects/${record.id}`);
	}
};
