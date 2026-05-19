import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { Project } from '$lib/types/pipeline';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.pb) {
		return { projects: [] };
	}

	const records = await locals.pb.collection('projects').getFullList({
		sort: '-created',
		requestKey: null
	});

	return {
		projects: records as unknown as Project[]
	};
};
