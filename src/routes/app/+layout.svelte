<script lang="ts">
	import { page } from '$app/stores';

	let { data, children } = $props();

	const navItems = [{ href: '/app', label: 'Projects' }];
</script>

<div class="min-h-screen bg-canvas text-ink">
	<header class="border-b border-rule">
		<div class="mx-auto max-w-7xl px-8">
			<div class="flex h-14 items-center justify-between">
				<!-- Masthead left: logotype + nav -->
				<div class="flex items-center gap-8">
					<a href="/app" class="flex flex-col leading-none gap-0.5">
						<span class="font-display text-base font-light tracking-[0.22em] uppercase text-ink">
							Context Crafter
						</span>
						<span class="text-[8px] tracking-[0.35em] uppercase text-ink-3 font-sans">
							Lead Research Platform
						</span>
					</a>

					<div class="h-5 w-px bg-rule-2 hidden sm:block"></div>

					<nav class="hidden sm:flex items-center gap-0.5">
						{#each navItems as item}
							<a
								href={item.href}
								class="px-3 py-1.5 text-[11px] tracking-[0.12em] uppercase transition-colors {$page.url.pathname === item.href
									? 'text-ink'
									: 'text-ink-3 hover:text-ink-2'}"
							>
								{item.label}
							</a>
						{/each}
					</nav>
				</div>

				<!-- Masthead right: user + sign out -->
				<div class="flex items-center gap-6">
					<span class="hidden md:block text-[11px] text-ink-3 font-mono">{data.user?.email}</span>
					<div class="h-3 w-px bg-rule-2 hidden md:block"></div>
					<form method="POST" action="/logout">
						<button
							type="submit"
							class="text-[11px] tracking-[0.12em] uppercase text-ink-3 hover:text-ink transition-colors"
						>
							Sign out
						</button>
					</form>
				</div>
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-7xl px-8 py-12">
		{@render children()}
	</main>
</div>
