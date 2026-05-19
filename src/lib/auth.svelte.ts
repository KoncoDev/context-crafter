// src/lib/auth.svelte.ts
import { setContext, getContext } from 'svelte';

const AUTH_KEY = Symbol('AUTH');

export interface UserSession {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'user';
}

export class AuthState {
    // Initialize directly from the constructor argument
    session = $state<UserSession | null>(null);

    // We can default this to false because we now trust the server data immediately
    isLoading = $state(false);

    constructor(initialSession: UserSession | null = null) {
        this.session = initialSession;
    }

    login(userData: UserSession) {
        this.session = userData;
    }

    logout() {
        this.session = null;
    }

    get isAuthenticated() {
        return !!this.session;
    }
}

// Update factory to accept the server data
export function setAuthContext(initialSession: UserSession | null) {
    const auth = new AuthState(initialSession);
    setContext(AUTH_KEY, auth);
    return auth;
}

export function getAuthContext(): AuthState {
    return getContext<AuthState>(AUTH_KEY);
}