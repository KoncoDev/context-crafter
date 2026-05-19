import { fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 as zod } from 'sveltekit-superforms/adapters';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import type { Project } from '$lib/types/pipeline';

const masterSourceSchema = z.object({
	master_source: z.string().min(10, 'Master source cannot be empty')
});

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.pb) throw redirect(303, `/app/projects/${params.id}`);

	let project;
	try {
		project = await locals.pb.collection('projects').getOne(params.id, { requestKey: null });
	} catch {
		throw redirect(303, '/app');
	}

	if (project.status === 'draft') {
		throw redirect(303, `/app/projects/${params.id}`);
	}

	const masterForm = await superValidate(
		{ master_source: (project.master_source as string) ?? '' },
		zod(masterSourceSchema)
	);

	return { project: project as unknown as Project, masterForm };
};

export const actions: Actions = {
	saveMaster: async ({ params, request, locals }) => {
		if (!locals.pb) return fail(503, { message: 'Database unavailable' });

		const formData = await request.formData();
		const master_source = (formData.get('master_source') as string) ?? '';

		if (master_source.trim().length < 10) {
			return fail(400, { message: 'Master source is too short' });
		}

		await locals.pb.collection('projects').update(params.id, { master_source });
		return { success: true };
	},

	resubmitMaster: async ({ params, request, locals }) => {
		if (!locals.pb) return fail(503, { message: 'Database unavailable' });

		const form = await superValidate(request, zod(masterSourceSchema));
		if (!form.valid) return fail(400, { masterForm: form });

		const existing = await locals.pb.collection('variants').getFullList({
			filter: `project = "${params.id}"`,
			requestKey: null
		});
		await Promise.all(existing.map((v) => locals.pb!.collection('variants').delete(v.id)));

		await locals.pb.collection('projects').update(params.id, {
			master_source: form.data.master_source,
			status: 'pending_master_validation'
		});

		redirect(303, `/app/projects/${params.id}/generate-personas`);
	}
};
