<script lang="ts">
	import { getAuthContext } from '$lib/auth.svelte.js';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { ActionData } from './$types';

	const auth = getAuthContext();
	let { form }: { form: ActionData } = $props();
	let isLoggingIn = $state(false);

	const submitLogin: SubmitFunction = () => {
		isLoggingIn = true;
		return async ({ result, update }) => {
			if (result.type === 'redirect') {
				await update();
			} else {
				isLoggingIn = false;
				await update();
			}
		};
	};
</script>

<div class="flex min-h-screen items-center justify-center bg-canvas px-6">
	<div class="w-full max-w-xs">

		<!-- Logotype -->
		<div class="mb-12 text-center">
			<h1 class="font-display text-4xl font-light tracking-[0.2em] uppercase text-ink mb-2">
				Context Crafter
			</h1>
			<p class="text-[9px] tracking-[0.4em] uppercase text-ink-3">Lead Research Platform</p>
		</div>

		<!-- Rule -->
		<div class="h-px bg-rule-2 mb-10"></div>

		{#if form?.error}
			<div class="mb-8 border-l-2 border-rust pl-4">
				<p class="text-xs text-rust">{form.error}</p>
			</div>
		{/if}

		<form method="POST" action="?/login" use:enhance={submitLogin} class="space-y-8">
			<div>
				<label
					for="email"
					class="block text-[10px] tracking-[0.2em] uppercase text-ink-3 mb-3"
				>
					Email
				</label>
				<div class="border-b border-rule-2 focus-within:border-bone transition-colors duration-200">
					<input
						type="email"
						name="email"
						id="email"
						value={form?.email ?? ''}
						required
						placeholder="you@example.com"
						class="w-full bg-transparent py-2.5 text-sm text-ink placeholder-ink-3 focus:outline-none font-sans"
					/>
				</div>
			</div>

			<div>
				<label
					for="password"
					class="block text-[10px] tracking-[0.2em] uppercase text-ink-3 mb-3"
				>
					Password
				</label>
				<div class="border-b border-rule-2 focus-within:border-bone transition-colors duration-200">
					<input
						type="password"
						name="password"
						id="password"
						required
						placeholder="••••••••"
						class="w-full bg-transparent py-2.5 text-sm text-ink placeholder-ink-3 focus:outline-none font-sans"
					/>
				</div>
			</div>

			<div class="pt-4 text-right">
				<button
					type="submit"
					disabled={isLoggingIn}
					class="select-none inline-flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase border-b border-ink-3 pb-0.5 text-ink-2 hover:text-ink hover:border-ink transition-colors duration-150 active:opacity-75 disabled:opacity-40 disabled:cursor-not-allowed"
				>
					{#if isLoggingIn}
						<svg class="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
						</svg>
						Signing in
					{:else}
						Sign in →
					{/if}
				</button>
			</div>
		</form>

	</div>
</div>
