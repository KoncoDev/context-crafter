<script>
	import { getAuthContext } from '$lib/auth.svelte.js';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	const auth = getAuthContext();
	let { children } = $props();

	$effect(() => {
		if (!auth.isLoading && !auth.isAuthenticated) {
			goto(`/login?from=${page.url.pathname}`);
		}
	});
</script>

{#if auth.isLoading}
	<div class="flex min-h-screen items-center justify-center bg-gray-950">
		<p class="text-sm text-gray-500">Verifying credentials...</p>
	</div>
{:else if auth.isAuthenticated}
	{@render children()}
{:else}
	<div class="flex min-h-screen items-center justify-center bg-gray-950">
		<p class="text-sm text-gray-500">Redirecting...</p>
	</div>
{/if}
