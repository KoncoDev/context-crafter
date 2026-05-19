import PocketBase from 'pocketbase';
import { PUBLIC_POCKETBASE_URL } from '$env/static/public';
import { browser } from '$app/environment';

// Re-export the URL if needed elsewhere
export { PUBLIC_POCKETBASE_URL };

// Fail early if the environment variable is missing
if (!PUBLIC_POCKETBASE_URL) {
    throw new Error("Missing PUBLIC_POCKETBASE_URL in environment variables");
}

/**
 * 🏭 FACTORY FUNCTION (SERVER-SIDE USAGE)
 * * ⚠️ CRITICAL SAFETY NOTE:
 * On the server (SSR), we MUST create a new PocketBase instance for EVERY request.
 * Never share a single instance across requests, or you risk leaking authentication
 * state between different users (e.g., User A sees User B's data).
 * * Usage:
 * - Used in `hooks.server.ts` to populate `event.locals.pb`.
 * - Do NOT use this directly in components.
 */
export function createInstance() {
    return new PocketBase(PUBLIC_POCKETBASE_URL);
}

/**
 * 🌐 SINGLETON INSTANCE (CLIENT-SIDE ONLY)
 * * This instance is strictly for the browser. It maintains the user's
 * session state in client-side memory.
 * * 🛑 SAFETY MECHANISM:
 * We explicitly initialize this to `undefined` on the server.
 * If code attempts to import and use `clientOnlyPb` in a server-side
 * file (like `+page.server.ts` or `+layout.server.ts`), it will crash
 * immediately with a "cannot read properties of undefined" error.
 * * This prevents the "Shared State" security vulnerability.
 */
export const clientOnlyPb = browser
    ? new PocketBase(PUBLIC_POCKETBASE_URL)
    : undefined;

// Configure the client instance only if we are strictly in the browser
if (clientOnlyPb) {
    // Optional: Disable auto-cancellation globally for the client
    // This prevents race conditions if multiple requests fire rapidly
    clientOnlyPb.autoCancellation(false);
}