import { fail, redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

/** * We use explicit typing with RequestEvent to prevent "implicit any" errors
 * if the ./$types module isn't generated yet.
 */
export const actions = {
    login: async ({ request, locals }: RequestEvent) => {
        const formData = await request.formData();
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;

        // ROBUSTNESS FIX: Check if PocketBase is initialized.
        // Since we defined locals.pb as "PocketBase | null", we must guard against null.
        if (!locals.pb) {
            return fail(503, {
                email,
                error: 'Authentication service unavailable'
            });
        }

        try {
            await locals.pb.collection('users').authWithPassword(email, password);
        } catch (err) {
            console.error('PocketBase Auth Error:', err);
            return fail(400, {
                email,
                error: 'Invalid email or password'
            });
        }

        // Redirect to dashboard or home upon success
        throw redirect(303, '/app');
    }
};
