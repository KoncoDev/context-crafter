import type { LayoutServerLoad } from './$types';
import type { UserSession } from '$lib/auth.svelte';

export const load: LayoutServerLoad = async ({ locals }) => {
    let user: UserSession | null = null;

    // Check if PocketBase has a valid user model
    if (locals.pb?.authStore.isValid && locals.pb?.authStore.record) {
        const pbUser = locals.pb?.authStore.record;

        // SAFE TRANSFORMATION:
        // We manually pick fields. If PB changes internal structure,
        // this is the ONLY place code breaks.
        user = {
            id: pbUser.id,
            email: pbUser.email,
            name: pbUser.name || pbUser.email,
            // Strict casting for the role
            role: (pbUser.role === 'admin' ? 'admin' : 'user')
        };
    }

    return {
        user,
        pbAuthToken: locals.pb?.authStore.token ?? null
    };
};