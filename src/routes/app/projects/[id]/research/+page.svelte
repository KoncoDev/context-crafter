<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { clientOnlyPb } from '$lib/db/pocketbase';
	import StatusBadge from '$lib/components/pipeline/StatusBadge.svelte';
	import type { Project, Variant } from '$lib/types/pipeline';

	let { data } = $props();

	let project = $state(data.project as Project);
	let variants = $state(data.variants as Variant[]);

	$effect(() => { if (data.project) project = data.project as Project; });
	$effect(() => {
		variants = data.variants as unknown as Variant[];
		const draftIds = new Set(
			(data.variants as Variant[]).filter(v => v.status === 'draft').map(v => v.id)
		);
		selectedIds = untrack(() => selectedIds).filter(id => draftIds.has(id));
		const eid = untrack(() => editingId);
		if (eid && !(data.variants as Variant[]).some(v => v.id === eid)) editingId = null;
		const cdid = untrack(() => confirmDeleteId);
		if (cdid && !(data.variants as Variant[]).some(v => v.id === cdid)) confirmDeleteId = null;
	});

	let timeframe = $state('');
	let selectedIds = $state<string[]>(
		(data.variants as Variant[]).filter(v => v.status === 'draft').map(v => v.id)
	);

	let editingId = $state<string | null>(null);
	let editFields = $state({
		name: '', target_area: '', demographic_summary: '',
		psychological_driver: '', buying_trigger: '', primary_objection: '', preferred_tone: ''
	});
	let editSaving = $state(false);
	let editError = $state<string | null>(null);

	let confirmDeleteId = $state<string | null>(null);
	let deletingId = $state<string | null>(null);
	let deleteErrors = $state<Record<string, string>>({});

	let launching = $state(false);
	let launchError = $state<string | null>(null);
	let launchedCount = $state(0);
	let launchPartialFail = $state(0);

	const draftVariants = $derived(variants.filter(v => v.status === 'draft'));
	const researchingVariants = $derived(variants.filter(v => v.status === 'researching'));
	const pendingReviewVariants = $derived(variants.filter(v => v.status === 'pending_research_validation'));
	const furtherVariants = $derived(
		variants.filter(v => !['draft', 'researching', 'pending_research_validation'].includes(v.status))
	);
	const allDraftSelected = $derived(
		draftVariants.length > 0 && draftVariants.every(v => selectedIds.includes(v.id))
	);

	function toggleSelect(id: string) {
		selectedIds = selectedIds.includes(id)
			? selectedIds.filter(x => x !== id)
			: [...selectedIds, id];
	}

	function toggleAll() {
		selectedIds = allDraftSelected ? [] : draftVariants.map(v => v.id);
	}

	function startEdit(v: Variant) {
		const p = v.expand?.persona;
		editingId = v.id;
		editError = null;
		editFields = {
			name: p?.name ?? '',
			target_area: p?.target_area ?? '',
			demographic_summary: p?.demographic_summary ?? '',
			psychological_driver: p?.psychological_driver ?? '',
			buying_trigger: p?.buying_trigger ?? '',
			primary_objection: p?.primary_objection ?? '',
			preferred_tone: p?.preferred_tone ?? ''
		};
	}

	onMount(() => {
		if (!clientOnlyPb || !project) return;
		let destroyed = false;
		let unsubFn: (() => void) | undefined;

		clientOnlyPb.collection('variants').subscribe('*', ({ record, action }) => {
			if ((record as unknown as { project: string }).project !== project.id) return;
			if (action === 'delete' || ['researching', 'pending_research_validation'].includes(record.status)) {
				invalidateAll();
			}
		}).then(fn => {
			if (destroyed) fn();
			else unsubFn = fn;
		}).catch(err => console.error('[realtime] variants subscribe failed:', err));

		return () => { destroyed = true; unsubFn?.(); };
	});

	const iClass = 'w-full bg-transparent border-b border-rule-2 focus-within:border-bone py-2.5 text-sm text-ink placeholder-ink-3 focus:outline-none transition-colors';
	const lClass = 'block text-[10px] tracking-[0.15em] uppercase text-ink-3 mb-2';
</script>

<div class="mx-auto max-w-3xl">

	<!-- Breadcrumb -->
	<div class="flex items-center gap-2 text-[11px] tracking-[0.08em] text-ink-3 mb-8">
		<a href="/app" class="hover:text-ink transition-colors">Projects</a>
		<span>—</span>
		<a href="/app/projects/{project?.id}" class="hover:text-ink transition-colors">{project?.name ?? 'Project'}</a>
		<span>—</span>
		<span class="text-ink-2">Local Market Research</span>
	</div>

	<!-- Chapter header -->
	<div class="mb-8">
		<div class="flex items-start justify-between gap-6 mb-4">
			<div class="flex items-center gap-4">
				<span class="font-display text-3xl font-light leading-none text-ink-3">03</span>
				<div>
					<h1 class="font-display text-4xl font-light text-ink tracking-tight leading-none mb-1">
						Local Market Research
					</h1>
					<p class="text-[11px] text-ink-3">
						{#if draftVariants.length > 0}
							{draftVariants.length} variant{draftVariants.length !== 1 ? 's' : ''} ready — set a timeframe and launch
						{:else if researchingVariants.length > 0}
							{researchingVariants.length} variant{researchingVariants.length !== 1 ? 's' : ''} being researched — page updates automatically
						{:else}
							All variants have passed research
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

	<!-- ── Timeframe input ───────────────────────────────────── -->
	{#if draftVariants.length > 0}
		<div class="mb-8">
			<label for="timeframe-input" class={lClass}>Target Timeframe</label>
			<div class="border-b border-rule-2 focus-within:border-bone transition-colors">
				<input
					id="timeframe-input"
					type="text"
					bind:value={timeframe}
					placeholder="e.g. Spring 2026, Q3 2025, Next 6 months"
					class="w-full bg-transparent py-3 text-sm text-ink placeholder-ink-3 focus:outline-none"
				/>
			</div>
			<p class="mt-2 text-[11px] text-ink-3">
				Sent to N8N with each variant ID. Stored on the variant after research completes.
			</p>
		</div>
	{/if}

	<!-- ── Draft variants — Ready to Launch ─────────────────── -->
	{#if draftVariants.length > 0}
		<div class="mb-10">
			<div class="flex items-center justify-between pb-3 border-b border-rule">
				<span class="text-[10px] tracking-[0.2em] uppercase text-ink-3">
					Ready to Launch · {draftVariants.length}
				</span>
				<button
					type="button"
					onclick={toggleAll}
					class="text-[11px] tracking-[0.1em] uppercase text-ink-3 hover:text-ink transition-colors"
				>
					{allDraftSelected ? 'Deselect all' : 'Select all'}
				</button>
			</div>

			<div class="divide-y divide-rule">
				{#each draftVariants as v (v.id)}
					{@const p = v.expand?.persona}
					<div class="py-4 {editingId === v.id ? 'border-l-2 border-bone pl-4 -ml-4' : ''}">
						<!-- Row -->
						<div class="flex items-center gap-4">
							<input
								type="checkbox"
								checked={selectedIds.includes(v.id)}
								onchange={() => toggleSelect(v.id)}
								class="h-3.5 w-3.5 shrink-0 cursor-pointer rounded-sm border-rule-2 accent-bone"
							/>
							<div class="min-w-0 flex-1">
								<p class="font-display text-lg font-light text-ink leading-tight">{p?.name ?? 'Unnamed Persona'}</p>
								{#if p?.target_area}
									<p class="text-[11px] text-ink-3">{p.target_area}</p>
								{/if}
							</div>
							<StatusBadge status={v.status} type="variant" />
							<div class="flex shrink-0 items-center gap-3">
								<button
									type="button"
									onclick={() => editingId === v.id ? (editingId = null) : startEdit(v)}
									class="text-[11px] tracking-[0.1em] uppercase text-ink-3 border-b border-rule-2 pb-0.5 hover:text-ink hover:border-ink-3 transition-colors"
								>
									{editingId === v.id ? 'Cancel' : 'Edit'}
								</button>

								{#if confirmDeleteId === v.id}
									<form
										method="POST"
										action="?/deleteVariant"
										use:enhance={() => {
											const id = v.id;
											deletingId = id;
											confirmDeleteId = null;
											return async ({ result, update }) => {
												deletingId = null;
												if (result.type === 'failure') {
													deleteErrors = { ...deleteErrors, [id]: (result.data as Record<string, string>)?.message ?? 'Delete failed' };
												} else {
													await update();
												}
											};
										}}
									>
										<input type="hidden" name="variant_id" value={v.id} />
										<button
											type="submit"
											disabled={deletingId === v.id}
											class="text-[11px] tracking-[0.1em] uppercase text-rust border-b border-rust/40 pb-0.5 hover:border-rust transition-colors disabled:opacity-40"
										>
											{deletingId === v.id ? '…' : 'Confirm'}
										</button>
									</form>
									<button
										type="button"
										onclick={() => confirmDeleteId = null}
										class="text-[11px] tracking-[0.1em] uppercase text-ink-3 hover:text-ink transition-colors"
									>Cancel</button>
								{:else}
									<button
										type="button"
										onclick={() => confirmDeleteId = v.id}
										disabled={deletingId === v.id}
										class="text-[11px] tracking-[0.1em] uppercase text-rust/60 border-b border-rust/20 pb-0.5 hover:text-rust hover:border-rust/50 transition-colors disabled:opacity-40"
									>Delete</button>
								{/if}
							</div>
						</div>

						{#if deleteErrors[v.id]}
							<p class="mt-2 text-[11px] text-rust">{deleteErrors[v.id]}</p>
						{/if}

						<!-- Inline edit panel -->
						{#if editingId === v.id}
							<form
								method="POST"
								action="?/updatePersona"
								use:enhance={() => {
									editSaving = true;
									editError = null;
									return async ({ result, update }) => {
										editSaving = false;
										if (result.type === 'failure') {
											editError = (result.data as Record<string, string>)?.message ?? 'Save failed';
										} else {
											editingId = null;
											await update();
										}
									};
								}}
								class="mt-5 space-y-5"
							>
								<input type="hidden" name="persona_id" value={p?.id} />
								<div class="grid gap-5 sm:grid-cols-2">
									<div>
										<label class={lClass} for="name-{v.id}">Name</label>
										<div class="border-b border-rule-2 focus-within:border-bone transition-colors">
											<input id="name-{v.id}" name="name" type="text" bind:value={editFields.name} class={iClass} />
										</div>
									</div>
									<div>
										<label class={lClass} for="area-{v.id}">Target Area</label>
										<div class="border-b border-rule-2 focus-within:border-bone transition-colors">
											<input id="area-{v.id}" name="target_area" type="text" bind:value={editFields.target_area} class={iClass} />
										</div>
									</div>
									<div class="sm:col-span-2">
										<label class={lClass} for="demo-{v.id}">Demographic Summary</label>
										<div class="border-b border-rule-2 focus-within:border-bone transition-colors">
											<textarea id="demo-{v.id}" name="demographic_summary" bind:value={editFields.demographic_summary} rows="2" class="{iClass} resize-none w-full"></textarea>
										</div>
									</div>
									<div>
										<label class={lClass} for="driver-{v.id}">Psychological Driver</label>
										<div class="border-b border-rule-2 focus-within:border-bone transition-colors">
											<input id="driver-{v.id}" name="psychological_driver" type="text" bind:value={editFields.psychological_driver} class={iClass} />
										</div>
									</div>
									<div>
										<label class={lClass} for="trigger-{v.id}">Buying Trigger</label>
										<div class="border-b border-rule-2 focus-within:border-bone transition-colors">
											<input id="trigger-{v.id}" name="buying_trigger" type="text" bind:value={editFields.buying_trigger} class={iClass} />
										</div>
									</div>
									<div>
										<label class={lClass} for="objection-{v.id}">Primary Objection</label>
										<div class="border-b border-rule-2 focus-within:border-bone transition-colors">
											<input id="objection-{v.id}" name="primary_objection" type="text" bind:value={editFields.primary_objection} class={iClass} />
										</div>
									</div>
									<div>
										<label class={lClass} for="tone-{v.id}">Preferred Tone</label>
										<div class="border-b border-rule-2 focus-within:border-bone transition-colors">
											<input id="tone-{v.id}" name="preferred_tone" type="text" bind:value={editFields.preferred_tone} class={iClass} />
										</div>
									</div>
								</div>
								{#if editError}
									<p class="text-[11px] text-rust">{editError}</p>
								{/if}
								<div class="flex items-center gap-5 pt-2">
									<button
										type="submit"
										disabled={editSaving}
										class="text-[11px] tracking-[0.15em] uppercase border-b pb-0.5 transition-colors disabled:opacity-40 {editSaving ? 'text-ink-3 border-rule-2' : 'text-ink border-ink hover:text-bone hover:border-bone'}"
									>
										{editSaving ? 'Saving…' : 'Save Changes'}
									</button>
									<button
										type="button"
										onclick={() => editingId = null}
										class="text-[11px] tracking-[0.1em] uppercase text-ink-3 hover:text-ink transition-colors"
									>
										Cancel
									</button>
								</div>
							</form>
						{/if}
					</div>
				{/each}
			</div>

			<!-- Launch action bar -->
			<form
				method="POST"
				action="?/launchResearch"
				use:enhance={() => {
					launching = true;
					launchError = null;
					return async ({ result, update }) => {
						launching = false;
						if (result.type === 'failure') {
							launchError = (result.data as Record<string, string>)?.message ?? 'Launch failed';
						} else if (result.type === 'success') {
							const d = result.data as { launched?: number; partialFail?: number };
							launchedCount = d?.launched ?? 0;
							launchPartialFail = d?.partialFail ?? 0;
							await update();
						}
					};
				}}
				class="mt-6 border border-rule bg-panel p-5 space-y-4"
			>
				<input type="hidden" name="timeframe" value={timeframe} />
				{#each selectedIds as id}
					<input type="hidden" name="variant_id" value={id} />
				{/each}

				{#if launchError}
					<div class="border-l-2 border-rust pl-4">
						<p class="text-sm text-rust">{launchError}</p>
					</div>
				{/if}
				{#if launchedCount > 0}
					<div class="border-l-2 border-moss pl-4">
						<p class="text-sm text-moss">
							Research launched for {launchedCount} variant{launchedCount !== 1 ? 's' : ''}.
							{#if launchPartialFail > 0}
								<span class="text-ochre"> {launchPartialFail} webhook{launchPartialFail !== 1 ? 's' : ''} failed.</span>
							{/if}
						</p>
					</div>
				{/if}

				<div class="flex items-center justify-between gap-4">
					<p class="text-sm text-ink-3">
						<span class="text-ink">{selectedIds.length}</span>
						variant{selectedIds.length !== 1 ? 's' : ''} selected
						{#if timeframe.trim() === '' && selectedIds.length > 0}
							<span class="ml-2 text-[11px] text-ochre">· Enter a timeframe first</span>
						{/if}
					</p>
					<button
						type="submit"
						disabled={launching || selectedIds.length === 0 || !timeframe.trim()}
						class="text-[11px] tracking-[0.18em] uppercase border-b pb-0.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed {launching || selectedIds.length === 0 || !timeframe.trim() ? 'text-ink-3 border-rule-2' : 'text-ink border-ink hover:text-bone hover:border-bone'}"
					>
						{launching ? 'Launching…' : 'Launch Research →'}
					</button>
				</div>
			</form>
		</div>
	{/if}

	<!-- ── Researching (in progress) ─────────────────────────── -->
	{#if researchingVariants.length > 0}
		<div class="mb-8">
			<div class="text-[10px] tracking-[0.2em] uppercase text-ink-3 pb-3 border-b border-rule mb-4">
				In Progress · {researchingVariants.length}
			</div>
			<div class="space-y-3">
				{#each researchingVariants as v}
					{@const p = v.expand?.persona}
					<div class="flex items-center gap-4 border border-rule bg-panel px-5 py-3.5">
						<svg class="h-3.5 w-3.5 shrink-0 animate-spin text-parchment" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
						</svg>
						<div class="min-w-0 flex-1">
							<p class="font-display text-lg font-light text-ink leading-tight">{p?.name ?? 'Unnamed Persona'}</p>
							{#if p?.target_area}<p class="text-[11px] text-ink-3">{p.target_area}</p>{/if}
						</div>
						<StatusBadge status={v.status} type="variant" />
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- ── Pending review ────────────────────────────────────── -->
	{#if pendingReviewVariants.length > 0}
		<div class="mb-8">
			<div class="text-[10px] tracking-[0.2em] uppercase text-ink-3 pb-3 border-b border-rule mb-4">
				Awaiting Review · {pendingReviewVariants.length}
			</div>
			<div class="space-y-3">
				{#each pendingReviewVariants as v}
					{@const p = v.expand?.persona}
					<div class="flex items-center gap-4 border border-ochre/20 bg-panel px-5 py-3.5">
						<div class="min-w-0 flex-1">
							<p class="font-display text-lg font-light text-ink leading-tight">{p?.name ?? 'Unnamed Persona'}</p>
							{#if p?.target_area}<p class="text-[11px] text-ink-3">{p.target_area}</p>{/if}
						</div>
						<StatusBadge status={v.status} type="variant" />
						<a
							href="/app/projects/{project?.id}/variants/{v.id}"
							class="shrink-0 text-[11px] tracking-[0.1em] uppercase text-ochre hover:text-ink transition-colors"
						>
							Review →
						</a>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- ── Research done / further along ─────────────────────── -->
	{#if furtherVariants.length > 0}
		<div class="mb-8">
			<div class="text-[10px] tracking-[0.2em] uppercase text-ink-3 pb-3 border-b border-rule mb-4">
				Research Done · {furtherVariants.length}
			</div>
			<div class="space-y-3">
				{#each furtherVariants as v}
					{@const p = v.expand?.persona}
					<div class="flex items-center gap-4 border border-rule bg-panel px-5 py-3.5">
						<div class="min-w-0 flex-1">
							<p class="font-display text-lg font-light text-ink-2 leading-tight">{p?.name ?? 'Unnamed Persona'}</p>
							{#if p?.target_area}<p class="text-[11px] text-ink-3">{p.target_area}</p>{/if}
						</div>
						<StatusBadge status={v.status} type="variant" />
						<a
							href="/app/projects/{project?.id}/variants/{v.id}"
							class="shrink-0 text-[11px] tracking-[0.1em] uppercase text-ink-3 hover:text-ink transition-colors"
						>
							Open →
						</a>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	{#if variants.length === 0}
		<div class="py-12 text-center">
			<p class="text-sm text-ink-3">No variants found for this project.</p>
		</div>
	{/if}

	<!-- Back -->
	<div class="h-px bg-rule mb-6"></div>
	<a href="/app/projects/{project?.id}" class="text-[11px] tracking-[0.12em] uppercase text-ink-3 hover:text-ink transition-colors border-b border-rule-2 pb-0.5">
		← Back to Project
	</a>
</div>
