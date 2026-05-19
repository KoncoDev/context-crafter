import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
    // Check for user in locals
    if (!locals.user) {
        throw redirect(303, '/login');
    }

    if (locals.user.role !== 'admin') {
        // Log the attempt for security auditing
        console.warn(`Unauthorized admin access attempt by user: ${locals.user.id}`);
        throw redirect(303, '/'); // Send them to home or an error page
    }

    return {
        user: locals.user
    };
};
