<svelte:head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
</svelte:head>

<script lang="ts">
    import "../app.css";
    import { ModeWatcher } from "mode-watcher";
    import { setAuthContext } from "$lib/auth.svelte.js";
    import { clientOnlyPb } from "$lib/db/pocketbase";

    let { data, children } = $props();

    // Hydrate clientOnlyPb synchronously — runs before any child onMount,
    // ensuring SSE subscriptions in child pages have a valid auth token.
    if (clientOnlyPb) {
        if (data.pbAuthToken) {
            clientOnlyPb.authStore.save(data.pbAuthToken, null);
        } else {
            clientOnlyPb.authStore.clear();
        }
    }

    const auth = setAuthContext(data.user || null);

    $effect(() => {
        if (data.user) {
            auth.login(data.user);
        } else {
            if (auth.isAuthenticated) auth.logout();
        }
    });

    // Keep clientOnlyPb token in sync whenever server data refreshes (e.g. invalidateAll)
    $effect(() => {
        if (!clientOnlyPb) return;
        if (data.pbAuthToken) {
            clientOnlyPb.authStore.save(data.pbAuthToken, null);
        } else {
            clientOnlyPb.authStore.clear();
        }
    });
</script>

<ModeWatcher />
{@render children()}
