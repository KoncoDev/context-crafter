// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
import type PocketBase from 'pocketbase';
import type { AuthModel } from 'pocketbase';

declare global {
    namespace App {
        // interface Error {}
        interface Locals {
            pb: PocketBase | null;
            user: AuthModel | null;
        }
        interface PageData {
            user?: UserSession | null;
        }
        // interface PageState {}
        // interface Platform {}
    }
}

export { };
