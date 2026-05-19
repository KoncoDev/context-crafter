<script lang="ts">
	import { Palette, Type, Eye, Layers, AlertTriangle, Zap, ChevronDown, ChevronUp } from 'lucide-svelte';

	interface ServicePaletteItem {
		feature: string;
		token: string;
	}

	interface TypographyItem {
		font: string;
		category: string;
		weights: number[];
	}

	interface DesigningData {
		branding_narrative?: {
			atmosphere?: string;
			ux_philosophy?: string;
			abstract_anchors?: string[];
		};
		design_tokens?: {
			color_palette?: Record<string, string>;
			service_palette?: ServicePaletteItem[];
			typography?: TypographyItem[];
		};
		asset_logic?: {
			hero_asset_prompt?: string;
			structural_anti_patterns?: string[];
			micro_interactions?: string[];
		};
	}

	let { data }: { data: Record<string, unknown> } = $props();

	const d = $derived(data as DesigningData);
	const narrative = $derived(d?.branding_narrative);
	const tokens = $derived(d?.design_tokens);
	const assets = $derived(d?.asset_logic);

	let showPrompt = $state(false);

	// Bucket the flat color_palette object into semantic groups
	const colorGroups = $derived.by(() => {
		const p = tokens?.color_palette ?? {};
		const surfaceKeys = ['background', 'surface', 'surface_elevated', 'shadow'];
		const textKeys = ['text_primary', 'text_secondary', 'text_muted', 'border'];
		const semanticKeys = ['accent_primary', 'accent_secondary', 'alert', 'success', 'warning'];
		return {
			surfaces: Object.entries(p).filter(([k]) => surfaceKeys.includes(k)),
			text: Object.entries(p).filter(([k]) => textKeys.includes(k)),
			semantic: Object.entries(p).filter(([k]) => semanticKeys.includes(k)),
			other: Object.entries(p).filter(
				([k]) => !surfaceKeys.includes(k) && !textKeys.includes(k) && !semanticKeys.includes(k)
			)
		};
	});
</script>

{#snippet swatchRow(entries: [string, string][])}
	<div class="flex flex-wrap gap-4">
		{#each entries as [key, value]}
			<div class="flex flex-col items-center gap-1.5">
				<div
					class="h-11 w-11 rounded-sm border border-white/10 shadow-sm"
					style="background-color: {value}"
					title="{key}: {value}"
				></div>
				<p class="max-w-[52px] truncate text-center font-mono text-[9px] leading-tight text-ink-3">
					{value}
				</p>
				<p
					class="max-w-[60px] truncate text-center text-[9px] capitalize leading-tight text-ink-3/60"
				>
					{key.replace(/_/g, ' ')}
				</p>
			</div>
		{/each}
	</div>
{/snippet}

<div class="space-y-10">

	<!-- ── Design Tokens ─────────────────────────────────── -->
	{#if tokens}
		<div class="space-y-8">
			<p class="flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase text-ink-3">
				<Palette class="h-3 w-3" />
				Design Tokens
			</p>

			<!-- Color Palette -->
			{#if tokens.color_palette && Object.keys(tokens.color_palette).length > 0}
				{@const groups = colorGroups}
				<div class="space-y-6">
					{#if groups.surfaces.length}
						<div>
							<p class="mb-4 text-[10px] tracking-[0.15em] uppercase text-ink-3">Surfaces</p>
							{@render swatchRow(groups.surfaces)}
						</div>
					{/if}
					{#if groups.text.length}
						<div>
							<p class="mb-4 text-[10px] tracking-[0.15em] uppercase text-ink-3">Text & Borders</p>
							{@render swatchRow(groups.text)}
						</div>
					{/if}
					{#if groups.semantic.length}
						<div>
							<p class="mb-4 text-[10px] tracking-[0.15em] uppercase text-ink-3">Semantic</p>
							{@render swatchRow(groups.semantic)}
						</div>
					{/if}
					{#if groups.other.length}
						<div>
							<p class="mb-4 text-[10px] tracking-[0.15em] uppercase text-ink-3">Other</p>
							{@render swatchRow(groups.other)}
						</div>
					{/if}
				</div>
			{/if}

			<!-- Service Palette -->
			{#if tokens.service_palette?.length}
				<div>
					<p class="mb-3 text-[10px] tracking-[0.15em] uppercase text-ink-3">Service Palette</p>
					<div class="space-y-2">
						{#each tokens.service_palette as item}
							<div class="flex items-center gap-4 border border-rule bg-panel px-4 py-3">
								<div
									class="h-6 w-6 shrink-0 rounded-sm"
									style="background-color: {item.token}"
								></div>
								<p class="flex-1 text-sm leading-relaxed text-ink-2">{item.feature}</p>
								<p class="shrink-0 font-mono text-[10px] text-ink-3">{item.token}</p>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Typography -->
			{#if tokens.typography?.length}
				<div>
					<p class="mb-4 flex items-center gap-2 text-[10px] tracking-[0.15em] uppercase text-ink-3">
						<Type class="h-3 w-3" />
						Typography
					</p>
					<div class="grid gap-3 sm:grid-cols-3">
						{#each tokens.typography as font}
							<div class="space-y-2 border border-rule bg-panel px-4 py-3.5">
								<p class="text-base font-medium text-ink">{font.font}</p>
								<p class="text-[10px] uppercase tracking-[0.15em] text-ink-3">{font.category}</p>
								<div class="flex flex-wrap gap-1 pt-1">
									{#each font.weights as weight}
										<span
											class="border border-rule-2 px-1.5 py-0.5 font-mono text-[9px] text-ink-3"
											>{weight}</span
										>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<div class="h-px bg-rule"></div>

	<!-- ── Branding Narrative ─────────────────────────────── -->
	{#if narrative}
		<div class="space-y-7">
			<p class="flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase text-ink-3">
				<Eye class="h-3 w-3" />
				Branding Narrative
			</p>

			{#if narrative.atmosphere}
				<div>
					<p class="mb-4 text-[10px] tracking-[0.15em] uppercase text-ink-3">Atmosphere</p>
					<blockquote
						class="border-l-2 border-bone py-1 pl-6 font-display text-xl font-light italic leading-relaxed text-ink"
					>
						{narrative.atmosphere}
					</blockquote>
				</div>
			{/if}

			{#if narrative.ux_philosophy}
				<div>
					<p class="mb-3 text-[10px] tracking-[0.15em] uppercase text-ink-3">UX Philosophy</p>
					<p class="text-sm leading-relaxed text-ink-2">{narrative.ux_philosophy}</p>
				</div>
			{/if}

			{#if narrative.abstract_anchors?.length}
				<div>
					<p class="mb-5 text-[10px] tracking-[0.15em] uppercase text-ink-3">Abstract Anchors</p>
					<ol class="space-y-4">
						{#each narrative.abstract_anchors as anchor, i}
							<li class="flex items-start gap-4">
								<span
									class="w-8 shrink-0 font-display text-3xl font-light leading-none tabular-nums text-ink-3/30"
								>
									{String(i + 1).padStart(2, '0')}
								</span>
								<p class="pt-0.5 font-display text-base italic leading-relaxed text-ink-2">
									{anchor}
								</p>
							</li>
						{/each}
					</ol>
				</div>
			{/if}
		</div>
	{/if}

	<div class="h-px bg-rule"></div>

	<!-- ── Asset Logic ────────────────────────────────────── -->
	{#if assets}
		<div class="space-y-7">
			<p class="flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase text-ink-3">
				<Layers class="h-3 w-3" />
				Asset Logic
			</p>

			<!-- Hero asset prompt (collapsible) -->
			{#if assets.hero_asset_prompt}
				<div>
					<button
						type="button"
						onclick={() => (showPrompt = !showPrompt)}
						class="select-none flex w-full items-center justify-between border border-rule px-5 py-3.5 text-left transition-colors duration-150 hover:bg-panel active:opacity-75"
					>
						<p class="text-[10px] tracking-[0.2em] uppercase text-ink-3">Hero Asset Prompt</p>
						{#if showPrompt}
							<ChevronUp class="h-3.5 w-3.5 shrink-0 text-ink-3" />
						{:else}
							<ChevronDown class="h-3.5 w-3.5 shrink-0 text-ink-3" />
						{/if}
					</button>
					{#if showPrompt}
						<div class="border border-t-0 border-rule bg-panel px-5 py-4">
							<p class="whitespace-pre-wrap font-mono text-xs leading-relaxed text-ink-2">
								{assets.hero_asset_prompt}
							</p>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Anti-patterns + Micro-interactions side-by-side -->
			<div class="grid gap-6 sm:grid-cols-2">
				{#if assets.structural_anti_patterns?.length}
					<div>
						<p
							class="mb-4 flex items-center gap-2 text-[10px] tracking-[0.15em] uppercase text-ink-3"
						>
							<AlertTriangle class="h-3 w-3" />
							Anti-Patterns
						</p>
						<ul class="space-y-3">
							{#each assets.structural_anti_patterns as pattern}
								<li class="flex items-start gap-3">
									<span class="shrink-0 font-mono text-sm leading-relaxed text-rust/60">⊘</span>
									<p class="text-sm leading-relaxed text-ink-2">{pattern}</p>
								</li>
							{/each}
						</ul>
					</div>
				{/if}

				{#if assets.micro_interactions?.length}
					<div>
						<p
							class="mb-4 flex items-center gap-2 text-[10px] tracking-[0.15em] uppercase text-ink-3"
						>
							<Zap class="h-3 w-3" />
							Micro-Interactions
						</p>
						<ul class="space-y-3">
							{#each assets.micro_interactions as interaction}
								<li class="flex items-start gap-3">
									<span class="shrink-0 text-sm leading-relaxed text-moss/70">●</span>
									<p class="text-sm leading-relaxed text-ink-2">{interaction}</p>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>
		</div>
	{/if}

</div>
