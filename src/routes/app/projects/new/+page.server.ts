import { fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
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
			return fail(503, { form, message: 'Database unavailable' });
		}

		let record;
		try {
			record = await locals.pb.collection('projects').create({
				name: form.data.name,
				raw_data: form.data.raw_data,
				target_language: form.data.target_language,
				status: 'draft'
			});
		} catch {
			return fail(500, { form, message: 'Failed to create project' });
		}

		redirect(303, `/app/projects/${record.id}`);
	}
};
