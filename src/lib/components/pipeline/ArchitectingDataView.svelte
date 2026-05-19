<script lang="ts">
	import {
		Target,
		Brain,
		AlertCircle,
		ChevronDown,
		ChevronUp,
		ExternalLink,
		ArrowRight,
		TrendingUp
	} from 'lucide-svelte';

	interface FeatureBenefit {
		feature: string;
		benefit: string;
	}

	interface ArchitectingData {
		ux_psychology?: {
			core_trigger?: string;
			visual_metaphor?: string;
			selected_styles?: string[];
			style_justification?: string;
			dynamic_pivot?: string;
		};
		seo_metadata?: {
			meta_title?: string;
			meta_description?: string;
			schema_markup?: Record<string, unknown>;
		};
		targeted_messaging_matrix?: {
			primary_hook?: string;
			value_proposition?: string;
			objection_mitigation?: string;
			contextual_urgency?: string;
			feature_benefit_mapping?: FeatureBenefit[];
			conversion_actions?: string[];
		};
	}

	let { data }: { data: Record<string, unknown> } = $props();

	const d = $derived(data as ArchitectingData);
	const matrix = $derived(d?.targeted_messaging_matrix);
	const ux = $derived(d?.ux_psychology);
	const seo = $derived(d?.seo_metadata);

	let showSchema = $state(false);
	let showJustification = $state(false);

	const rowAccents = ['bg-bone', 'bg-moss', 'bg-ochre', 'bg-parchment', 'bg-bone'];
</script>

<div class="space-y-8">

	<!-- ── Primary Hook ──────────────────────────────────── -->
	{#if matrix?.primary_hook}
		<div>
			<p class="mb-4 flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase text-ink-3">
				<Target class="h-3 w-3" />
				Primary Hook
			</p>
			<div class="border-l-2 border-bone py-1 pl-6">
				<blockquote class="font-display text-2xl font-light italic leading-relaxed text-ink">
					"{matrix.primary_hook}"
				</blockquote>
			</div>
		</div>
	{/if}

	<!-- ── Value Proposition ─────────────────────────────── -->
	{#if matrix?.value_proposition}
		<div>
			<p class="mb-3 text-[10px] tracking-[0.22em] uppercase text-ink-3">Value Proposition</p>
			<p class="text-sm leading-relaxed text-ink-2">{matrix.value_proposition}</p>
		</div>
	{/if}

	<!-- ── Contextual Urgency ────────────────────────────── -->
	{#if matrix?.contextual_urgency}
		<div class="border-l-2 border-ochre/60 bg-ochre/5 py-3 pl-5 pr-5">
			<p class="mb-2 flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-ochre">
				<AlertCircle class="h-3 w-3" />
				Contextual Urgency
			</p>
			<p class="text-sm leading-relaxed text-ink-2">{matrix.contextual_urgency}</p>
		</div>
	{/if}

	<!-- ── Objection Mitigation ──────────────────────────── -->
	{#if matrix?.objection_mitigation}
		<div class="border border-rule bg-panel px-5 py-4">
			<p class="mb-2.5 text-[10px] tracking-[0.2em] uppercase text-ink-3">Objection Mitigation</p>
			<p class="text-sm leading-relaxed text-ink-2">{matrix.objection_mitigation}</p>
		</div>
	{/if}

	<!-- ── Feature → Benefit Map ─────────────────────────── -->
	{#if matrix?.feature_benefit_mapping?.length}
		<div>
			<p class="mb-4 flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase text-ink-3">
				<TrendingUp class="h-3 w-3" />
				Feature → Benefit Map
			</p>
			<div class="overflow-hidden border border-rule">
				<!-- Header row -->
				<div class="grid grid-cols-2 border-b border-rule bg-panel">
					<div class="border-r border-rule px-5 py-2.5">
						<p class="text-[10px] tracking-[0.2em] uppercase text-ink-3">Capability</p>
					</div>
					<div class="px-5 py-2.5">
						<p class="text-[10px] tracking-[0.2em] uppercase text-ink-3">Outcome</p>
					</div>
				</div>
				<!-- Data rows -->
				{#each matrix.feature_benefit_mapping as row, i}
					<div class="relative grid grid-cols-2 border-b border-rule last:border-b-0">
						<div class="absolute bottom-0 left-0 top-0 w-[3px] {rowAccents[i % rowAccents.length]}"></div>
						<div class="border-r border-rule py-4 pl-6 pr-5">
							<p class="text-sm leading-relaxed text-ink-2">{row.feature}</p>
						</div>
						<div class="flex items-start gap-2.5 px-5 py-4">
							<ArrowRight class="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-3" />
							<p class="text-sm leading-relaxed text-ink-2">{row.benefit}</p>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- ── Conversion Actions ────────────────────────────── -->
	{#if matrix?.conversion_actions?.length}
		<div>
			<p class="mb-3 flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase text-ink-3">
				<ExternalLink class="h-3 w-3" />
				Conversion Actions
			</p>
			<div class="flex flex-wrap gap-2">
				{#each matrix.conversion_actions as action}
					<span
						class="inline-flex items-center gap-2 border border-ink/20 px-3.5 py-2 text-xs tracking-wide text-ink-2 transition-colors hover:border-ink/40"
					>
						{action}
					</span>
				{/each}
			</div>
		</div>
	{/if}

	<div class="h-px bg-rule"></div>

	<!-- ── Two-col: UX Psychology + SEO ──────────────────── -->
	<div class="grid gap-6 lg:grid-cols-2">

		<!-- UX Psychology -->
		{#if ux}
			<div class="space-y-5 border border-rule bg-panel p-5">
				<p class="flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase text-ink-3">
					<Brain class="h-3 w-3" />
					UX Psychology
				</p>

				{#if ux.selected_styles?.length}
					<div class="flex flex-wrap gap-1.5">
						{#each ux.selected_styles as style}
							<span
								class="border border-ink/25 px-3 py-1.5 text-[10px] font-medium tracking-[0.1em] uppercase text-ink-2"
							>
								{style}
							</span>
						{/each}
					</div>
				{/if}

				{#if ux.core_trigger}
					<div>
						<p class="mb-1.5 text-[10px] tracking-[0.15em] uppercase text-ink-3">Core Trigger</p>
						<p class="text-sm font-medium leading-relaxed text-ink">{ux.core_trigger}</p>
					</div>
				{/if}

				{#if ux.visual_metaphor}
					<div>
						<p class="mb-1.5 text-[10px] tracking-[0.15em] uppercase text-ink-3">Visual Metaphor</p>
						<p class="font-display text-lg font-light italic leading-snug text-ink-2">
							{ux.visual_metaphor}
						</p>
					</div>
				{/if}

				{#if ux.dynamic_pivot}
					<div>
						<p class="mb-1.5 text-[10px] tracking-[0.15em] uppercase text-ink-3">Dynamic Pivot</p>
						<p class="text-sm leading-relaxed text-ink-3">{ux.dynamic_pivot}</p>
					</div>
				{/if}

				{#if ux.style_justification}
					<div>
						<button
							type="button"
							onclick={() => (showJustification = !showJustification)}
							class="flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase text-ink-3 transition-colors hover:text-ink"
						>
							Style Justification
							{#if showJustification}
								<ChevronUp class="h-3 w-3" />
							{:else}
								<ChevronDown class="h-3 w-3" />
							{/if}
						</button>
						{#if showJustification}
							<p class="mt-3 text-sm leading-relaxed text-ink-3">{ux.style_justification}</p>
						{/if}
					</div>
				{/if}
			</div>
		{/if}

		<!-- SEO Metadata -->
		{#if seo}
			<div class="space-y-4">
				<p class="text-[10px] tracking-[0.22em] uppercase text-ink-3">SEO Metadata</p>

				<!-- Google search result preview -->
				<div class="space-y-1.5 border border-rule bg-canvas p-5">
					<p class="mb-3 text-[9px] tracking-[0.15em] uppercase text-ink-3/60">Search Preview</p>
					{#if seo.schema_markup}
						{@const provider = (seo.schema_markup as Record<string, unknown>)
							?.provider as Record<string, unknown> | undefined}
						<p class="truncate text-[11px] text-ink-3">{provider?.url ?? '—'}</p>
					{/if}
					{#if seo.meta_title}
						<p class="cursor-default text-base font-medium leading-snug text-bone hover:underline">
							{seo.meta_title}
						</p>
					{/if}
					{#if seo.meta_description}
						<p class="pt-0.5 text-sm leading-relaxed text-ink-2">{seo.meta_description}</p>
					{/if}
				</div>

				<!-- Schema markup collapsible -->
				{#if seo.schema_markup}
					<div class="overflow-hidden border border-rule">
						<button
							type="button"
							onclick={() => (showSchema = !showSchema)}
							class="flex w-full items-center justify-between px-4 py-3 text-[10px] tracking-[0.15em] uppercase text-ink-3 transition-colors hover:bg-panel hover:text-ink"
						>
							<span>Schema Markup</span>
							{#if showSchema}
								<ChevronUp class="h-3 w-3" />
							{:else}
								<ChevronDown class="h-3 w-3" />
							{/if}
						</button>
						{#if showSchema}
							<pre
								class="max-h-64 overflow-auto border-t border-rule bg-panel px-4 py-4 font-mono text-xs leading-relaxed text-ink-3"
							>{JSON.stringify(seo.schema_markup, null, 2)}</pre>
						{/if}
					</div>
				{/if}
			</div>
		{/if}

	</div>
</div>
