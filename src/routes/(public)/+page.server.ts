import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.pb?.authStore.isValid) {
		redirect(303, '/app');
	}
	redirect(303, '/login');
};
