<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { clientOnlyPb } from '$lib/db/pocketbase';
	import StatusBadge from '$lib/components/pipeline/StatusBadge.svelte';
	import type { Project, Variant } from '$lib/types/pipeline';

	let { data } = $props();

	let project = $state(data.project as Project);
	let variants = $state(data.variants as Variant[]);

	$effect(() => { if (data.project) project = data.project as Project; });
	$effect(() => { variants = data.variants as unknown as Variant[]; });

	let areas = $state<string[]>([]);
	let newArea = $state('');
	let personaCount = $state(3);
	let areaInputError = $state<string | null>(null);
	let submitting = $state(false);
	let submitError = $state<string | null>(null);
	let succeeded = $state(false);
	let resultAreas = $state<string[]>([]);
	let resultCount = $state(3);

	let approving = $state(false);

	const totalVariants = $derived(areas.length * personaCount);

	const isConfiguring = $derived(project?.status === 'pending_master_validation');
	const isGenerating = $derived(project?.status === 'generating_personas');
	const isPendingReview = $derived(project?.status === 'pending_persona_validation');
	const isDone = $derived(
		!!project && !['pending_master_validation', 'generating_personas', 'pending_persona_validation'].includes(project.status)
	);

	onMount(() => {
		if (!clientOnlyPb || !project) return;
		if (!['generating_personas', 'pending_persona_validation'].includes(project.status)) return;

		const projectId = project.id;
		let unsubscribeFn: (() => void) | undefined;
		let destroyed = false;

		clientOnlyPb.collection('projects').subscribe(projectId, ({ record }) => {
			project = record as unknown as Project;
			if (['pending_persona_validation', 'processing_variants', 'completed'].includes(record.status)) {
				invalidateAll();
			}
		}).then(fn => {
			if (destroyed) fn();
			else unsubscribeFn = fn;
		});

		return () => { destroyed = true; unsubscribeFn?.(); };
	});

	function addArea() {
		const val = newArea.trim();
		if (!val) { areaInputError = 'Enter a target area'; return; }
		if (areas.includes(val)) { areaInputError = 'This area is already in the list'; return; }
		areas = [...areas, val];
		newArea = '';
		areaInputError = null;
	}

	function removeArea(index: number) {
		areas = areas.filter((_, i) => i !== index);
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') { e.preventDefault(); addArea(); }
	}
</script>

<div class="mx-auto max-w-2xl">

	<!-- Breadcrumb -->
	<div class="flex items-center gap-2 text-[11px] tracking-[0.08em] text-ink-3 mb-8">
		<a href="/app" class="hover:text-ink transition-colors">Projects</a>
		<span>—</span>
		<a href="/app/projects/{project?.id}" class="hover:text-ink transition-colors">{project?.name ?? 'Project'}</a>
		<span>—</span>
		<span class="text-ink-2">Persona Generation</span>
	</div>

	<!-- Chapter header -->
	<div class="mb-8">
		<div class="flex items-start justify-between gap-6 mb-4">
			<div class="flex items-center gap-4">
				<span class="font-display text-3xl font-light leading-none {
					isDone ? 'text-moss' :
					isPendingReview ? 'text-ochre' :
					isGenerating ? 'text-parchment' :
					'text-ink-3'
				}">02</span>
				<div>
					<h1 class="font-display text-4xl font-light text-ink tracking-tight leading-none mb-1">
						Persona Generation
					</h1>
					<p class="text-[11px] text-ink-3">
						{#if isConfiguring}Configure target areas and persona count
						{:else if isGenerating}AI is creating persona profiles…
						{:else if isPendingReview}{variants.length} persona{variants.length !== 1 ? 's' : ''} ready for review
						{:else}{variants.length} persona{variants.length !== 1 ? 's' : ''} approved
						{/if}
					</p>
				</div>
			</div>
			{#if project}
				<div class="pt-1 shrink-0">
					<StatusBadge status={project.status} type="project" />
				</div>
			{/if}
		</div>
		<div class="h-px bg-rule-2"></div>
	</div>

	<!-- ── Generating spinner ─────────────────────────────────── -->
	{#if isGenerating}
		<div class="border border-rule bg-panel p-8 mb-8">
			<div class="flex items-center gap-4">
				<svg class="h-4 w-4 animate-spin text-parchment shrink-0" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
				</svg>
				<div>
					<p class="text-sm text-ink-2">Generating persona profiles…</p>
					<p class="text-[11px] text-ink-3 mt-0.5">This page updates automatically when generation is complete.</p>
				</div>
			</div>
		</div>

	<!-- ── Persona review ─────────────────────────────────────── -->
	{:else if isPendingReview}
		<div class="space-y-8 mb-8">
			<div class="grid gap-4 sm:grid-cols-2">
				{#each variants as v}
					{@const p = v.expand?.persona}
					<div class="border border-rule bg-panel p-5 flex flex-col">
						<div class="flex items-start justify-between gap-3 mb-3">
							<div>
								<p class="font-display text-xl font-light text-ink leading-snug mb-1">
									{p?.name ?? 'Unnamed Persona'}
								</p>
								{#if p?.target_area}
									<span class="text-[10px] tracking-[0.12em] uppercase text-ink-3 border border-rule-2 px-2 py-0.5">
										{p.target_area}
									</span>
								{/if}
							</div>
							<StatusBadge status={v.status} type="variant" />
						</div>
						{#if p?.demographic_summary}
							<p class="text-xs text-ink-3 leading-relaxed mb-4">{p.demographic_summary}</p>
						{/if}
						<div class="mt-auto space-y-2 border-t border-rule pt-3">
							{#if p?.psychological_driver}
								<div class="flex gap-3">
									<span class="w-20 shrink-0 text-[10px] tracking-[0.1em] uppercase text-ink-3">Driver</span>
									<span class="text-xs text-ink-2">{p.psychological_driver}</span>
								</div>
							{/if}
							{#if p?.buying_trigger}
								<div class="flex gap-3">
									<span class="w-20 shrink-0 text-[10px] tracking-[0.1em] uppercase text-ink-3">Trigger</span>
									<span class="text-xs text-ink-2">{p.buying_trigger}</span>
								</div>
							{/if}
							{#if p?.primary_objection}
								<div class="flex gap-3">
									<span class="w-20 shrink-0 text-[10px] tracking-[0.1em] uppercase text-ink-3">Objection</span>
									<span class="text-xs text-ink-2">{p.primary_objection}</span>
								</div>
							{/if}
							{#if p?.preferred_tone}
								<div class="flex gap-3">
									<span class="w-20 shrink-0 text-[10px] tracking-[0.1em] uppercase text-ink-3">Tone</span>
									<span class="text-xs text-ink-2">{p.preferred_tone}</span>
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>

			<div class="flex items-center justify-between gap-4 border-t border-rule pt-6">
				<div>
					<p class="text-sm text-ink-2 mb-0.5">Ready to proceed?</p>
					<p class="text-[11px] text-ink-3">Approving starts independent processing for each variant (Steps 03–05).</p>
				</div>
				<form
					method="POST"
					action="?/approve"
					use:enhance={() => {
						approving = true;
						return async ({ result }) => {
							if (result.type !== 'redirect') approving = false;
						};
					}}
				>
					<button
						type="submit"
						disabled={approving}
						class="shrink-0 text-[11px] tracking-[0.18em] uppercase border-b pb-0.5 transition-colors disabled:opacity-40 {approving ? 'text-ink-3 border-rule-2' : 'text-ink border-ink hover:text-bone hover:border-bone'}"
					>
						{approving ? 'Approving…' : `Approve ${variants.length} Persona${variants.length !== 1 ? 's' : ''} →`}
					</button>
				</form>
			</div>
		</div>

	<!-- ── Done: archived view ───────────────────────────────── -->
	{:else if isDone && variants.length > 0}
		<div class="grid gap-4 sm:grid-cols-2 mb-8">
			{#each variants as v}
				{@const p = v.expand?.persona}
				<div class="border border-rule bg-panel p-5 flex flex-col">
					<div class="flex items-start justify-between gap-3 mb-3">
						<div>
							<p class="font-display text-xl font-light text-ink leading-snug mb-1">
								{p?.name ?? 'Unnamed Persona'}
							</p>
							{#if p?.target_area}
								<span class="text-[10px] tracking-[0.12em] uppercase text-ink-3 border border-rule-2 px-2 py-0.5">
									{p.target_area}
								</span>
							{/if}
						</div>
						<StatusBadge status={v.status} type="variant" />
					</div>
					{#if p?.demographic_summary}
						<p class="text-xs text-ink-3 leading-relaxed mb-3 line-clamp-2">{p.demographic_summary}</p>
					{/if}
					<div class="mt-auto flex items-center justify-between border-t border-rule pt-3">
						{#if p?.preferred_tone}
							<div class="flex gap-2">
								<span class="text-[10px] tracking-[0.1em] uppercase text-ink-3">Tone</span>
								<span class="text-xs text-ink-3">{p.preferred_tone}</span>
							</div>
						{/if}
						<a
							href="/app/projects/{project?.id}/variants/{v.id}"
							class="ml-auto text-[11px] tracking-[0.1em] uppercase text-ink-3 hover:text-ink transition-colors"
						>
							Open →
						</a>
					</div>
				</div>
			{/each}
		</div>

	<!-- ── Configuration form ────────────────────────────────── -->
	{:else if isConfiguring}
		{#if succeeded}
			<div class="border border-moss/30 bg-panel p-8 text-center space-y-4 mb-8">
				<p class="font-display text-3xl font-light text-moss">Generation started</p>
				<p class="text-sm text-ink-3">
					Generating <span class="text-ink">{resultCount} persona{resultCount !== 1 ? 's' : ''}</span>
					across <span class="text-ink">{resultAreas.length} area{resultAreas.length !== 1 ? 's' : ''}</span>
					— up to <span class="text-ink">{resultAreas.length * resultCount} variants</span> total.
				</p>
				<div class="flex flex-wrap justify-center gap-2 pt-1">
					{#each resultAreas as area}
						<span class="text-[10px] tracking-[0.1em] uppercase text-ink-3 border border-rule-2 px-3 py-1">{area}</span>
					{/each}
				</div>
				<div class="pt-2">
					<a href="/app/projects/{project?.id}" class="text-[11px] tracking-[0.15em] uppercase text-ink-3 border-b border-rule-2 pb-0.5 hover:text-ink hover:border-ink-3 transition-colors">
						← Back to Project
					</a>
				</div>
			</div>
		{:else}
			<form
				method="POST"
				action="?/configure"
				use:enhance={() => {
					submitting = true;
					submitError = null;
					return async ({ result }) => {
						submitting = false;
						if (result.type === 'failure') {
							submitError = (result.data as Record<string, string>)?.message ?? 'Something went wrong';
						} else if (result.type === 'success') {
							const d = result.data as { target_areas: string[]; persona_count: number };
							resultAreas = d.target_areas ?? areas;
							resultCount = d.persona_count ?? personaCount;
							succeeded = true;
						}
					};
				}}
				class="space-y-10 mb-8"
			>
				{#each areas as area}
					<input type="hidden" name="target_area" value={area} />
				{/each}

				<!-- Target areas -->
				<div>
					<p class="text-[10px] tracking-[0.2em] uppercase text-ink-3 mb-1">Target Areas</p>
					<p class="text-[11px] text-ink-3 mb-5">
						Use <span class="font-mono text-bone">City — Country</span> format. Each area generates its own set of personas.
					</p>

					<div class="flex gap-3 mb-4">
						<div class="flex-1">
							<div class="border-b {areaInputError ? 'border-rust' : 'border-rule-2 focus-within:border-bone'} transition-colors">
								<input
									type="text"
									bind:value={newArea}
									onkeydown={onKeydown}
									placeholder="e.g. Casablanca — Morocco"
									class="w-full bg-transparent py-3 text-sm text-ink placeholder-ink-3 focus:outline-none"
								/>
							</div>
							{#if areaInputError}
								<p class="mt-1.5 text-[11px] text-rust">{areaInputError}</p>
							{/if}
						</div>
						<button
							type="button"
							onclick={addArea}
							class="shrink-0 text-[11px] tracking-[0.12em] uppercase text-ink-3 border-b border-rule-2 pb-0.5 hover:text-ink hover:border-ink-3 transition-colors self-end mb-0.5"
						>
							Add
						</button>
					</div>

					{#if areas.length > 0}
						<div class="space-y-2">
							{#each areas as area, i}
								<div class="flex items-center justify-between gap-3 border border-rule bg-panel px-4 py-3">
									<div class="flex items-center gap-3">
										<span class="h-1 w-1 rounded-full bg-bone"></span>
										<span class="text-sm text-ink-2">{area}</span>
									</div>
									<button
										type="button"
										onclick={() => removeArea(i)}
										class="text-ink-3 hover:text-rust transition-colors"
										aria-label="Remove {area}"
									>
										<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
										</svg>
									</button>
								</div>
							{/each}
						</div>
					{:else}
						<div class="border border-dashed border-rule-2 py-6 text-center">
							<p class="text-sm text-ink-3">No areas added yet</p>
						</div>
					{/if}
				</div>

				<!-- Personas per area -->
				<div>
					<p class="text-[10px] tracking-[0.2em] uppercase text-ink-3 mb-1">Personas per Area</p>
					<p class="text-[11px] text-ink-3 mb-5">Between 1 and 10.</p>
					<div class="flex items-center gap-6">
						<div class="border-b border-rule-2 focus-within:border-bone transition-colors w-20">
							<input
								type="number"
								name="persona_count"
								bind:value={personaCount}
								min="1"
								max="10"
								class="w-full bg-transparent py-3 text-center text-base text-ink focus:outline-none font-mono"
							/>
						</div>
						{#if areas.length > 0}
							<p class="text-sm text-ink-3">
								<span class="text-ink">{areas.length}</span> area{areas.length !== 1 ? 's' : ''} ×
								<span class="text-ink">{personaCount}</span> =
								<span class="text-bone">{totalVariants} variants</span>
							</p>
						{/if}
					</div>
				</div>

				<!-- Submit -->
				<div>
					{#if submitError}
						<div class="border-l-2 border-rust pl-4 mb-5">
							<p class="text-sm text-rust">{submitError}</p>
						</div>
					{/if}

					<div class="flex items-center gap-5 pt-4 border-t border-rule">
						<button
							type="submit"
							disabled={submitting || areas.length === 0}
							class="text-[11px] tracking-[0.2em] uppercase border-b pb-0.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed {submitting || areas.length === 0 ? 'text-ink-3 border-rule-2' : 'text-ink border-ink hover:text-bone hover:border-bone'}"
						>
							{submitting ? 'Starting…' : 'Start Persona Generation →'}
						</button>
						{#if areas.length === 0}
							<p class="text-[11px] text-ink-3">Add at least one target area</p>
						{/if}
					</div>
				</div>
			</form>
		{/if}
	{/if}

	<!-- Back -->
	<div class="h-px bg-rule mb-6"></div>
	<a href="/app/projects/{project?.id}" class="text-[11px] tracking-[0.12em] uppercase text-ink-3 hover:text-ink transition-colors border-b border-rule-2 pb-0.5">
		← Back to Project
	</a>
</div>
