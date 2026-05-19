// src/hooks.server.ts
import { createInstance } from '$lib/db/pocketbase';
import { dev } from '$app/environment';
import { ENABLE_POCKETBASE } from '$env/static/private';

export const handle = async ({ event, resolve }) => {
    // Avoid interfering with devtools
    if (dev && event.url.pathname === '/.well-known/appspecific/com.chrome.devtools.json') {
        return new Response(undefined, { status: 404 });
    }

    // Only initialize PocketBase if enabled
    if (ENABLE_POCKETBASE === 'true') {
        event.locals.pb = createInstance();

        // load the store data from the request cookie string
        event.locals.pb.authStore.loadFromCookie(event.request.headers.get('cookie') || '');

        try {
            // get an up-to-date auth store state by verifying and refreshing the loaded auth model (if any)
            if (event.locals.pb.authStore.isValid) {
                await event.locals.pb.collection('users').authRefresh();
                event.locals.user = event.locals.pb.authStore.record;
            }
        } catch (_) {
            // clear the auth store on failed refresh
            event.locals.pb.authStore.clear();
            event.locals.user = null;
        }
    } else {
        // Correct: No longer need 'as any', null is now a valid type
        event.locals.pb = null;
        event.locals.user = null;
    }

    const response = await resolve(event);

    // send back the default 'pb_auth' cookie to the client with the latest store state
    if (ENABLE_POCKETBASE === 'true' && event.locals.pb) {
        response.headers.append('set-cookie', event.locals.pb.authStore.exportToCookie({
            secure: import.meta.env.PROD,
            httpOnly: true
        }));
    }
    return response;
};