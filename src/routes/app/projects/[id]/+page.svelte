<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { clientOnlyPb } from '$lib/db/pocketbase';
	import StatusBadge from '$lib/components/pipeline/StatusBadge.svelte';
	import MarkdownEditor from '$lib/components/pipeline/MarkdownEditor.svelte';
	import { VARIANT_STATUS_CONFIG, AGENT_NAMES } from '$lib/config/pipeline';
	import type { Project, Variant, Persona, VariantStatus } from '$lib/types/pipeline';
	import {
		ScanText,
		Brain,
		MapPin,
		Target,
		Palette,
		FileText,
		Users,
		Layers,
		AlertCircle,
		CheckCircle2,
		ChevronRight,
		Pencil,
		X,
		Zap,
		Shield,
		MessageSquare
	} from 'lucide-svelte';

	let { data } = $props();

	let project = $state(data.project as Project);
	let variants = $state(data.variants as Variant[]);

	$effect(() => {
		variants = data.variants as unknown as Variant[];
	});
	$effect(() => {
		if (data.project) project = data.project as Project;
	});

	type TabId = 'overview' | 'pipeline' | 'variants';
	let activeTab = $state<TabId>('overview');

	let triggering = $state(false);
	let triggerSent = $state(false);
	let triggerError = $state<string | null>(null);
	let approvingPersonas = $state(false);
	let approvePersonasError = $state<string | null>(null);

	let editing = $state(false);
	let editSubmitting = $state(false);
	let editError = $state<string | null>(null);
	let editName = $state('');
	let editLanguage = $state<'french' | 'english' | 'arabic'>('english');
	let editRawData = $state('');

	function openEdit() {
		if (!project) return;
		editName = project.name;
		editLanguage = project.target_language;
		editRawData = project.raw_data ?? '';
		editError = null;
		editing = true;
	}

	onMount(() => {
		if (!clientOnlyPb || !project) return;

		const projectId = project.id;
		let unsubscribeFn: (() => void) | undefined;
		let destroyed = false;

		clientOnlyPb
			.collection('projects')
			.subscribe(projectId, ({ record }) => {
				project = record as unknown as Project;
				const refreshOn = [
					'pending_master_validation',
					'pending_persona_validation',
					'processing_variants',
					'completed',
					'error'
				];
				if (refreshOn.includes(record.status)) invalidateAll();
			})
			.then((fn) => {
				if (destroyed) fn();
				else unsubscribeFn = fn;
			});

		return () => {
			destroyed = true;
			unsubscribeFn?.();
		};
	});

	type CardState = 'waiting' | 'processing' | 'active' | 'done';

	const step1State = $derived((): CardState => {
		if (!project) return 'waiting';
		if (project.status === 'draft') return 'waiting';
		if (project.status === 'extracting_master') return 'processing';
		if (project.status === 'pending_master_validation') return 'active';
		return 'done';
	});

	const step2State = $derived((): CardState => {
		if (!project) return 'waiting';
		if (['draft', 'extracting_master', 'pending_master_validation'].includes(project.status)) return 'waiting';
		if (project.status === 'generating_personas') return 'processing';
		if (project.status === 'pending_persona_validation') return 'active';
		return 'done';
	});

	const showVariantsTab = $derived(
		!!project && ['processing_variants', 'completed'].includes(project.status)
	);

	const personas = $derived(
		variants
			.map((v) => v.expand?.persona)
			.filter((p): p is Persona => !!p)
			.filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i)
	);

	const variantsByStatus = $derived({
		total: variants.length,
		completed: variants.filter((v) => v.status === 'completed').length,
		needsAction: variants.filter((v) =>
			['pending_research_validation', 'pending_final_validation'].includes(v.status)
		).length,
		inProgress: variants.filter((v) =>
			['researching', 'architecting', 'designing'].includes(v.status)
		).length,
		draft: variants.filter((v) => v.status === 'draft').length
	});

	// Auto-select pipeline tab if there's an immediate pending action
	$effect(() => {
		if (
			project?.status === 'pending_master_validation' ||
			project?.status === 'pending_persona_validation'
		) {
			if (activeTab === 'overview') activeTab = 'pipeline';
		}
	});

	const pipelineBadge = $derived((): number | null => {
		if (!project) return null;
		if (
			project.status === 'pending_master_validation' ||
			project.status === 'pending_persona_validation'
		)
			return 1;
		return null;
	});

	function getVariantLabel(v: Variant): string {
		const p = v.expand?.persona;
		if (!p) return `Variant ${v.id.slice(0, 6)}`;
		return `${p.name} — ${p.target_area}`;
	}

	function formatDate(d: string) {
		return new Date(d).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	function capitalize(s: string) {
		return s.charAt(0).toUpperCase() + s.slice(1);
	}

	function agentIconClass(state: CardState): string {
		const base = 'w-9 h-9 border flex items-center justify-center shrink-0 transition-colors';
		const states: Record<CardState, string> = {
			waiting: 'border-rule text-ink-3/50 bg-canvas',
			processing: 'border-parchment/50 bg-parchment/12 text-parchment',
			active: 'border-ochre/50 bg-ochre/12 text-ochre',
			done: 'border-moss/40 bg-moss/12 text-moss'
		};
		return `${base} ${states[state]}`;
	}

	function variantStepStatus(v: Variant) {
		const s = v.status;
		return {
			research: (['architecting', 'designing', 'pending_final_validation', 'completed'].includes(s) ? 'done'
				: ['researching', 'pending_research_validation'].includes(s) ? 'active' : 'waiting') as CardState,
			architect: (['designing', 'pending_final_validation', 'completed'].includes(s) ? 'done'
				: s === 'architecting' ? 'processing' : 'waiting') as CardState,
			design: (s === 'completed' ? 'done'
				: ['designing', 'pending_final_validation'].includes(s) ? 'active' : 'waiting') as CardState
		};
	}

	function variantAccentColor(status: VariantStatus): string {
		if (['researching', 'architecting', 'designing'].includes(status)) return 'var(--color-parchment)';
		if (['pending_research_validation', 'pending_final_validation'].includes(status)) return 'var(--color-ochre)';
		if (status === 'completed') return 'var(--color-moss)';
		return 'var(--color-bone)';
	}

	// Grouped variants for the Variants tab
	const groupedVariants = $derived({
		needsAction: variants.filter((v) =>
			['pending_research_validation', 'pending_final_validation'].includes(v.status)
		),
		inProgress: variants.filter((v) =>
			['researching', 'architecting', 'designing'].includes(v.status)
		),
		draft: variants.filter((v) => v.status === 'draft'),
		completed: variants.filter((v) => v.status === 'completed')
	});
</script>

{#if !project}
	<div class="py-20 text-center">
		<p class="mb-3 font-display text-3xl font-light text-ink-3">Project not found</p>
		<a
			href="/app"
			class="border-b border-rule-2 pb-0.5 text-[11px] uppercase tracking-[0.15em] text-ink-3 hover:text-ink"
		>
			← Back to Projects
		</a>
	</div>
{:else}
	<div>

		<!-- ── Project Header ──────────────────────────────── -->
		<div class="mb-6">
			<!-- Breadcrumb -->
			<div class="mb-6 flex items-center gap-1.5 text-[11px] tracking-[0.08em] text-ink-3">
				<a href="/app" class="transition-colors hover:text-ink">Projects</a>
				<ChevronRight class="h-3 w-3 text-ink-3/50" />
				<span class="text-ink-2">{project.name}</span>
			</div>

			<!-- Title row -->
			<div class="mb-4 flex items-start justify-between gap-6">
				<h1 class="font-display text-6xl font-light leading-none tracking-tight text-ink">
					{project.name}
				</h1>
				<div class="flex shrink-0 items-center gap-3 pt-2">
					{#if project.status === 'error'}
						<form method="POST" action="?/retryPipeline" use:enhance>
							<button
								type="submit"
								class="border-b border-rust/40 pb-0.5 text-[11px] uppercase tracking-[0.12em] text-rust transition-colors duration-150 hover:border-rust active:opacity-75"
							>
								Reset to Draft
							</button>
						</form>
					{/if}
					{#if !editing}
						<button
							type="button"
							onclick={openEdit}
							class="select-none flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-ink-3 transition-colors duration-150 hover:text-ink active:opacity-75"
						>
							<Pencil class="h-3 w-3" />
							Edit
						</button>
					{:else}
						<button
							type="button"
							onclick={() => (editing = false)}
							class="select-none flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-ink-3 transition-colors duration-150 hover:text-ink active:opacity-75"
						>
							<X class="h-3 w-3" />
							Cancel
						</button>
					{/if}
					<StatusBadge status={project.status} type="project" />
				</div>
			</div>

			<!-- Meta row -->
			<div class="flex items-center gap-4 text-[11px] text-ink-3">
				<span class="flex items-center gap-1.5">
					<FileText class="h-3 w-3" />
					{capitalize(project.target_language)}
				</span>
				<span class="text-rule-2">·</span>
				<span>Created {formatDate(project.created)}</span>
				{#if showVariantsTab && variantsByStatus.total > 0}
					<span class="text-rule-2">·</span>
					<span class="flex items-center gap-1.5">
						<Layers class="h-3 w-3" />
						{variantsByStatus.completed}/{variantsByStatus.total} variants
					</span>
				{/if}
			</div>
		</div>

		<!-- ── Inline Edit Panel ─────────────────────────── -->
		{#if editing}
			<form
				method="POST"
				action="?/updateProject"
				use:enhance={() => {
					editSubmitting = true;
					editError = null;
					return async ({ result, update }) => {
						editSubmitting = false;
						if (result.type === 'failure') {
							editError = (result.data as Record<string, string>)?.message ?? 'Update failed';
						} else {
							editing = false;
							await update();
						}
					};
				}}
				class="mb-6 border border-rule bg-panel p-6 space-y-6"
			>
				<p class="text-[10px] uppercase tracking-[0.2em] text-ink-3">Edit Project</p>

				<div class="grid gap-6 sm:grid-cols-2">
					<!-- Name -->
					<div>
						<label for="edit-name" class="block text-[10px] uppercase tracking-[0.15em] text-ink-3 mb-2">
							Project Name
						</label>
						<div class="border-b border-rule-2 focus-within:border-bone transition-colors duration-200">
							<input
								id="edit-name"
								name="name"
								type="text"
								bind:value={editName}
								class="w-full bg-transparent py-2 text-sm text-ink placeholder-ink-3 focus:outline-none"
							/>
						</div>
					</div>

					<!-- Language -->
					<div>
						<label for="edit-language" class="block text-[10px] uppercase tracking-[0.15em] text-ink-3 mb-2">
							Target Language
						</label>
						<div class="border-b border-rule-2 focus-within:border-bone transition-colors duration-200">
							<select
								id="edit-language"
								name="target_language"
								bind:value={editLanguage}
								class="w-full bg-transparent py-2 text-sm text-ink focus:outline-none appearance-none cursor-pointer"
							>
								<option value="french">French</option>
								<option value="english">English</option>
								<option value="arabic">Arabic</option>
							</select>
						</div>
					</div>
				</div>

				<!-- Raw Data — only editable in draft (extraction hasn't run yet) -->
				{#if project.status === 'draft'}
					<div>
						<label for="edit-raw" class="block text-[10px] uppercase tracking-[0.15em] text-ink-3 mb-2">
							Raw Input Data
						</label>
						<div class="border border-rule focus-within:border-rule-2 transition-colors duration-200">
							<textarea
								id="edit-raw"
								name="raw_data"
								bind:value={editRawData}
								rows="10"
								class="w-full bg-transparent px-4 py-3 font-mono text-xs leading-relaxed text-ink placeholder-ink-3 focus:outline-none resize-y"
							></textarea>
						</div>
					</div>
				{/if}

				{#if editError}
					<p class="text-xs text-rust">{editError}</p>
				{/if}

				<div class="flex items-center gap-6 border-t border-rule pt-4">
					<button
						type="submit"
						disabled={editSubmitting}
						class="select-none text-[11px] uppercase tracking-[0.2em] border-b pb-0.5 transition-colors duration-150 active:opacity-75 disabled:opacity-40 disabled:cursor-not-allowed {editSubmitting ? 'border-rule-2 text-ink-3' : 'border-ink text-ink hover:border-bone hover:text-bone'}"
					>
						{editSubmitting ? 'Saving…' : 'Save Changes →'}
					</button>
					<button
						type="button"
						onclick={() => (editing = false)}
						class="select-none text-[11px] uppercase tracking-[0.12em] text-ink-3 transition-colors duration-150 hover:text-ink active:opacity-75"
					>
						Cancel
					</button>
				</div>
			</form>
		{/if}

		<!-- ── Pipeline ribbon ────────────────────────────── -->
		<div class="mb-6 flex items-center gap-3 text-[10px] uppercase tracking-[0.18em]">
			{#each [
				{ label: 'Fact Extractor', done: step1State() === 'done', processing: step1State() === 'processing', active: step1State() === 'active' },
				{ label: 'Consumer Psych.', done: step2State() === 'done', processing: step2State() === 'processing', active: step2State() === 'active' },
				{ label: 'Variants', done: project.status === 'completed', processing: false, active: project.status === 'processing_variants' }
			] as step, i}
				{#if i > 0}
					<div class="h-px max-w-8 flex-1 {step.done || step.active || step.processing ? 'bg-rule-2' : 'bg-rule'}"></div>
				{/if}
				<span class="flex items-center gap-1.5 transition-colors {step.done ? 'text-moss' : step.active ? 'text-ochre' : step.processing ? 'text-parchment' : 'text-ink-3/40'}">
					<span class="h-1.5 w-1.5 rounded-full transition-colors {step.done ? 'bg-moss' : step.active ? 'bg-ochre' : step.processing ? 'bg-parchment animate-pulse' : 'bg-rule-2'}"></span>
					{step.label}
				</span>
			{/each}
		</div>

		<div class="h-px bg-rule"></div>

		<!-- ── Tab bar ────────────────────────────────────── -->
		<div class="-mb-px mt-0 flex items-end gap-0 border-b border-rule">
			{#each [
				{ id: 'overview' as TabId, label: 'Overview', visible: true, badge: null },
				{ id: 'pipeline' as TabId, label: 'Pipeline', visible: true, badge: pipelineBadge() },
				{ id: 'variants' as TabId, label: `Variants${showVariantsTab && variantsByStatus.total ? ` (${variantsByStatus.total})` : ''}`, visible: showVariantsTab, badge: variantsByStatus.needsAction > 0 ? variantsByStatus.needsAction : null }
			] as tab}
				{#if tab.visible}
					<button
						type="button"
						onclick={() => (activeTab = tab.id)}
						class="relative mr-6 select-none pb-3 pt-5 text-[11px] uppercase tracking-[0.15em] transition-colors duration-150 active:opacity-75 {activeTab ===
						tab.id
							? 'border-b-2 border-bone text-ink'
							: 'border-b-2 border-transparent text-ink-3 hover:text-ink-2'}"
					>
						{tab.label}
						{#if tab.badge}
							<span
								class="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-sm bg-ochre/20 px-1 text-[9px] text-ochre"
							>
								{tab.badge}
							</span>
						{/if}
					</button>
				{/if}
			{/each}
		</div>

		<!-- ═══════════════════════════════════════════════ -->
		<!-- TAB: OVERVIEW                                   -->
		<!-- ═══════════════════════════════════════════════ -->
		{#if activeTab === 'overview'}
			<div class="mt-8 space-y-10">

				<!-- Stats bento -->
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
					<!-- Variants -->
					<div class="border border-rule bg-panel px-5 py-5" style="border-left-width: 3px; border-left-color: var(--color-bone)">
						<div class="mb-3 flex items-center gap-2 text-bone">
							<Layers class="h-3.5 w-3.5" />
							<p class="text-[10px] uppercase tracking-[0.2em]">Variants</p>
						</div>
						{#if showVariantsTab && variantsByStatus.total > 0}
							<p class="font-display text-4xl font-light leading-none text-ink">
								{variantsByStatus.completed}<span class="text-2xl text-ink-3"
									>/{variantsByStatus.total}</span
								>
							</p>
							<p class="mt-2 text-[11px] text-ink-3">
								{variantsByStatus.needsAction > 0
									? `${variantsByStatus.needsAction} awaiting review`
									: variantsByStatus.inProgress > 0
										? `${variantsByStatus.inProgress} in progress`
										: 'all completed'}
							</p>
						{:else}
							<p class="font-display text-4xl font-light leading-none text-ink-3">—</p>
							<p class="mt-2 text-[11px] text-ink-3">not yet generated</p>
						{/if}
					</div>

					<!-- Personas -->
					<div class="border border-rule bg-panel px-5 py-5" style="border-left-width: 3px; border-left-color: var(--color-moss)">
						<div class="mb-3 flex items-center gap-2 text-moss">
							<Users class="h-3.5 w-3.5" />
							<p class="text-[10px] uppercase tracking-[0.2em]">Personas</p>
						</div>
						{#if personas.length > 0}
							<p class="font-display text-4xl font-light leading-none text-ink">{personas.length}</p>
							<p class="mt-2 text-[11px] text-ink-3">profiles generated</p>
						{:else}
							<p class="font-display text-4xl font-light leading-none text-ink-3">—</p>
							<p class="mt-2 text-[11px] text-ink-3">not yet generated</p>
						{/if}
					</div>

					<!-- Language / status -->
					<div class="border border-rule bg-panel px-5 py-5" style="border-left-width: 3px; border-left-color: var(--color-ochre)">
						<div class="mb-3 flex items-center gap-2 text-ochre">
							<CheckCircle2 class="h-3.5 w-3.5" />
							<p class="text-[10px] uppercase tracking-[0.2em]">Language</p>
						</div>
						<p class="font-display text-4xl font-light capitalize leading-none text-ink">
							{project.target_language}
						</p>
						<p class="mt-2 text-[11px] text-ink-3">{formatDate(project.created)}</p>
					</div>
				</div>

				<!-- Master Source document view -->
				{#if step1State() === 'done' && project.master_source}
					<div>
						<div class="mb-5 flex items-center justify-between">
							<p class="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-ink-3">
								<FileText class="h-3 w-3" />
								Master Source Document
							</p>
							<a
								href="/app/projects/{project.id}/master"
								class="text-[10px] uppercase tracking-[0.15em] text-ink-3 transition-colors hover:text-ink"
							>
								Edit →
							</a>
						</div>
						<div class="max-h-[640px] overflow-y-auto border border-rule">
							<MarkdownEditor value={project.master_source} readonly={true} />
						</div>
					</div>

				{:else if step1State() === 'active'}
					<div class="border-l-2 border-ochre/60 bg-ochre/5 py-4 pl-5 pr-5">
						<p class="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-ochre">
							<AlertCircle class="h-3 w-3" />
							Master Source Ready for Review
						</p>
						<p class="mb-4 text-sm text-ink-2">
							Review and edit the extracted content, then configure persona generation.
						</p>
						<a
							href="/app/projects/{project.id}/master"
							class="border-b border-ink pb-0.5 text-[11px] uppercase tracking-[0.15em] text-ink transition-colors duration-150 hover:border-bone hover:text-bone active:opacity-75"
						>
							Review Master Source →
						</a>
					</div>

				{:else if step1State() === 'processing'}
					<div class="flex items-center gap-3 border border-rule bg-panel px-5 py-5">
						<svg
							class="h-3.5 w-3.5 shrink-0 animate-spin text-parchment"
							fill="none"
							viewBox="0 0 24 24"
						>
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
							></path>
						</svg>
						<p class="text-sm text-ink-2">
							Fact Extractor is building the master source — page updates automatically.
						</p>
					</div>

				{:else}
					<!-- draft: launch CTA -->
					<div class="space-y-4">
						<!-- Hero CTA block -->
						<div class="border border-rule bg-panel px-8 py-8" style="border-left-width: 3px; border-left-color: var(--color-bone)">
							<div class="mb-6 flex items-start gap-5">
								<div class="flex h-10 w-10 shrink-0 items-center justify-center border border-bone/40 bg-bone/10 text-bone">
									<ScanText class="h-4 w-4" />
								</div>
								<div>
									<p class="font-display text-2xl font-light leading-snug text-ink">
										Ready to begin extraction
									</p>
									<p class="mt-1 text-sm leading-relaxed text-ink-3">
										The Fact Extractor agent will analyse your raw data and produce a structured Master Source document for review.
									</p>
								</div>
							</div>

							{#if triggerSent}
								<div class="flex items-center gap-3">
									<svg class="h-3.5 w-3.5 shrink-0 animate-spin text-parchment" fill="none" viewBox="0 0 24 24">
										<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
										<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
									</svg>
									<p class="text-sm text-ink-3">Pipeline triggered — waiting for extraction to begin…</p>
									<button
										type="button"
										onclick={() => { triggerSent = false; triggerError = null; }}
										class="ml-auto select-none text-[11px] tracking-wide text-ink-3 transition-colors hover:text-ink active:opacity-75"
									>Try again</button>
								</div>
							{:else}
								<form
									method="POST"
									action="?/triggerExtraction"
									use:enhance={() => {
										triggering = true;
										triggerError = null;
										return async ({ result }) => {
											triggering = false;
											if (result.type === 'failure') {
												triggerError = (result.data as Record<string, string>)?.message ?? 'Failed to trigger extraction';
											} else if (result.type === 'success') {
												triggerSent = true;
											}
										};
									}}
								>
									<div class="flex flex-col gap-3">
										<button
											type="submit"
											disabled={triggering}
											class="select-none self-start border-b pb-0.5 text-[11px] uppercase tracking-[0.2em] transition-colors duration-150 disabled:opacity-40 active:opacity-75 {triggering ? 'border-rule-2 text-ink-3' : 'border-ink text-ink hover:border-bone hover:text-bone'}"
										>
											{triggering ? 'Sending to pipeline…' : 'Run Fact Extractor →'}
										</button>
										{#if triggerError}
											<p class="text-xs text-rust">{triggerError}</p>
										{/if}
									</div>
								</form>
							{/if}
						</div>

						<!-- Raw data preview (collapsible) -->
						<details class="group border border-rule">
							<summary class="select-none flex cursor-pointer items-center justify-between px-5 py-3.5 text-[10px] uppercase tracking-[0.2em] text-ink-3 transition-colors duration-150 hover:bg-panel hover:text-ink active:opacity-75 list-none">
								<span>Raw Input Data</span>
								<span class="font-mono text-[10px] text-ink-3/60">{(project.raw_data ?? '').length.toLocaleString()} chars</span>
							</summary>
							<div class="border-t border-rule bg-panel px-5 py-4">
								<p class="whitespace-pre-wrap font-mono text-xs leading-relaxed text-ink-3">
									{project.raw_data}
								</p>
							</div>
						</details>
					</div>
				{/if}

				<!-- Error notice -->
				{#if project.status === 'error'}
					<div class="flex items-start justify-between gap-6 border-l-2 border-rust py-2 pl-5">
						<div>
							<p class="mb-1 text-sm font-medium text-rust">Pipeline Error</p>
							<p class="text-sm text-ink-3">
								The workflow encountered an error. Reset to draft and retry, or check the N8N logs.
							</p>
						</div>
						<form method="POST" action="?/retryPipeline" use:enhance>
							<button
								type="submit"
								class="shrink-0 border-b border-rust/40 pb-0.5 text-[11px] uppercase tracking-[0.12em] text-rust transition-colors duration-150 hover:border-rust active:opacity-75"
							>
								Reset to Draft
							</button>
						</form>
					</div>
				{/if}

			</div>
		{/if}

		<!-- ═══════════════════════════════════════════════ -->
		<!-- TAB: PIPELINE                                   -->
		<!-- ═══════════════════════════════════════════════ -->
		{#if activeTab === 'pipeline'}
			<div class="mt-8 space-y-0">

				<!-- ── Agent 01: Fact Extractor ───────────── -->
				<section class="border-b border-rule pb-10 pt-2">
					<div class="mb-6 flex items-center gap-4">
						<div class={agentIconClass(step1State())}>
							<ScanText class="h-4 w-4" />
						</div>
						<div class="flex-1">
							<p class="text-[10px] uppercase tracking-[0.15em] text-ink-3">Agent 01</p>
							<p class="text-base font-medium leading-tight text-ink">Fact Extractor</p>
						</div>
						{#if step1State() === 'active' || step1State() === 'done'}
							<a
								href="/app/projects/{project.id}/master"
								class="shrink-0 text-[10px] uppercase tracking-[0.18em] text-ink-3 transition-colors hover:text-ink"
							>
								{step1State() === 'active' ? 'Review & Edit →' : 'View Source →'}
							</a>
						{/if}
					</div>

					{#if step1State() === 'waiting'}
						<div class="space-y-6">
							<div class="border border-rule bg-panel p-5">
								<p class="mb-3 text-[10px] uppercase tracking-[0.2em] text-ink-3">Raw Input Data</p>
								<p
									class="line-clamp-5 whitespace-pre-wrap font-mono text-xs leading-relaxed text-ink-3"
								>
									{project.raw_data}
								</p>
							</div>

							{#if triggerSent}
								<div class="flex items-center gap-3">
									<svg
										class="h-3.5 w-3.5 shrink-0 animate-spin text-parchment"
										fill="none"
										viewBox="0 0 24 24"
									>
										<circle
											class="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											stroke-width="4"
										></circle>
										<path
											class="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
										></path>
									</svg>
									<p class="text-sm text-ink-3">
										Pipeline triggered — waiting for extraction to begin…
									</p>
									<button
										type="button"
										onclick={() => {
											triggerSent = false;
											triggerError = null;
										}}
										class="ml-auto text-[11px] tracking-wide text-ink-3 hover:text-ink"
										>Try again</button
									>
								</div>
							{:else}
								<form
									method="POST"
									action="?/triggerExtraction"
									use:enhance={() => {
										triggering = true;
										triggerError = null;
										return async ({ result }) => {
											triggering = false;
											if (result.type === 'failure') {
												triggerError =
													(result.data as Record<string, string>)?.message ??
													'Failed to trigger extraction';
											} else if (result.type === 'success') {
												triggerSent = true;
											}
										};
									}}
								>
									<div class="flex flex-col gap-3">
										<button
											type="submit"
											disabled={triggering}
											class="self-start border-b pb-0.5 text-[11px] uppercase tracking-[0.2em] transition-colors duration-150 disabled:opacity-40 active:opacity-75 {triggering
												? 'border-rule-2 text-ink-3'
												: 'border-ink text-ink hover:border-bone hover:text-bone'}"
										>
											{triggering ? 'Sending to pipeline…' : 'Run Fact Extractor →'}
										</button>
										{#if triggerError}
											<p class="text-xs text-rust">{triggerError}</p>
										{/if}
									</div>
								</form>
							{/if}
						</div>

					{:else if step1State() === 'processing'}
						<div class="flex items-center gap-3">
							<svg
								class="h-3.5 w-3.5 shrink-0 animate-spin text-parchment"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								></circle>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
								></path>
							</svg>
							<p class="text-sm text-ink-3">Extracting content — page updates automatically.</p>
						</div>

					{:else if step1State() === 'active'}
						<div class="border-l-2 border-ochre/50 py-1 pl-5">
							<p class="mb-3 text-sm text-ink-2">
								Review the extracted master source, make any edits, then proceed to persona
								configuration.
							</p>
							<a
								href="/app/projects/{project.id}/generate-personas"
								class="border-b border-rule-2 pb-0.5 text-[11px] uppercase tracking-[0.15em] text-ink-2 transition-colors hover:border-ink-3 hover:text-ink"
							>
								Configure Consumer Psychology Expert →
							</a>
						</div>

					{:else}
						<div class="flex items-center justify-between">
							<p class="text-sm text-ink-3">
								{project.master_source
									? `${project.master_source.length.toLocaleString()} characters extracted`
									: 'Content extracted and approved'}
							</p>
							<a
								href="/app/projects/{project.id}/master"
								class="text-[11px] uppercase tracking-[0.12em] text-ink-3 transition-colors hover:text-ink"
							>
								Re-edit →
							</a>
						</div>
					{/if}
				</section>

				<!-- ── Agent 02: Consumer Psychology Expert ── -->
				<section
					class="border-b border-rule pb-10 pt-8 {step2State() === 'waiting'
						? 'opacity-40 pointer-events-none'
						: ''}"
				>
					<div class="mb-6 flex items-center gap-4">
						<div class={agentIconClass(step2State())}>
							<Brain class="h-4 w-4" />
						</div>
						<div class="flex-1">
							<p class="text-[10px] uppercase tracking-[0.15em] text-ink-3">Agent 02</p>
							<p class="text-base font-medium leading-tight text-ink">Consumer Psychology Expert</p>
						</div>
						{#if step2State() !== 'waiting'}
							<a
								href="/app/projects/{project.id}/generate-personas"
								class="shrink-0 text-[10px] uppercase tracking-[0.18em] text-ink-3 transition-colors hover:text-ink"
							>
								{step2State() === 'active' ? 'View All Personas →' : 'View →'}
							</a>
						{/if}
					</div>

					{#if step2State() === 'waiting'}
						<p class="text-sm text-ink-3">Complete the Fact Extractor step first.</p>

					{:else if step2State() === 'processing'}
						<div class="flex items-center gap-3">
							<svg
								class="h-3.5 w-3.5 shrink-0 animate-spin text-parchment"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								></circle>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
								></path>
							</svg>
							<p class="text-sm text-ink-3">
								Generating persona profiles — updating automatically.
							</p>
						</div>

					{:else if step2State() === 'active'}
						<!-- Compact persona preview grid -->
						{#if personas.length > 0}
							<div class="mb-6 grid gap-3 sm:grid-cols-2">
								{#each personas as p, i}
									<div
										class="border border-rule bg-panel px-5 py-4"
										style="border-left-width: 3px; border-left-color: {(['var(--color-bone)','var(--color-moss)','var(--color-ochre)','var(--color-parchment)'])[i % 4]}"
									>
										<div class="mb-2 flex items-start justify-between gap-3">
											<p class="font-display text-lg font-light leading-tight text-ink">{p.name}</p>
											<span
												class="shrink-0 border border-rule-2 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-ink-3"
											>
												{p.target_area}
											</span>
										</div>
										{#if p.demographic_summary}
											<p class="line-clamp-2 text-xs leading-relaxed text-ink-3">
												{p.demographic_summary}
											</p>
										{/if}
									</div>
								{/each}
							</div>
						{/if}

						<div class="flex items-center justify-between border-t border-rule pt-5">
							{#if approvePersonasError}
								<p class="text-xs text-rust">{approvePersonasError}</p>
							{:else}
								<p class="text-sm text-ink-3">
									{personas.length} persona{personas.length !== 1 ? 's' : ''} ready for approval.
								</p>
							{/if}
							<form
								method="POST"
								action="?/approvePersonas"
								use:enhance={() => {
									approvingPersonas = true;
									approvePersonasError = null;
									return async ({ result, update }) => {
										approvingPersonas = false;
										if (result.type === 'failure') {
											approvePersonasError =
												(result.data as Record<string, string>)?.message ?? 'Approval failed';
										} else {
											await update();
										}
									};
								}}
							>
								<button
									type="submit"
									disabled={approvingPersonas}
									class="border-b pb-0.5 text-[11px] uppercase tracking-[0.18em] transition-colors duration-150 disabled:opacity-40 active:opacity-75 {approvingPersonas
										? 'border-rule-2 text-ink-3'
										: 'border-ink text-ink hover:border-bone hover:text-bone'}"
								>
									{approvingPersonas
										? 'Approving…'
										: `Approve ${personas.length} Persona${personas.length !== 1 ? 's' : ''} & Begin Processing →`}
								</button>
							</form>
						</div>

					{:else}
						<p class="text-sm text-ink-3">
							{variants.length} variant{variants.length !== 1 ? 's' : ''} queued for processing.
						</p>
					{/if}
				</section>

				<!-- ── Agents 03–05: Variant Pipeline ─────── -->
				{#if showVariantsTab}
					<section class="pt-8">
						<div class="mb-6 flex items-center gap-4">
							<div
								class={agentIconClass(
									project.status === 'completed'
										? 'done'
										: project.status === 'processing_variants'
											? 'processing'
											: 'waiting'
								)}
							>
								<Layers class="h-4 w-4" />
							</div>
							<div class="flex-1">
								<p class="text-[10px] uppercase tracking-[0.15em] text-ink-3">Agents 03 – 05</p>
								<p class="text-base font-medium leading-tight text-ink">Variant Pipeline</p>
							</div>
							{#if variantsByStatus.total > 0}
								<span class="shrink-0 font-mono text-xs text-ink-3">
									{variantsByStatus.completed}/{variantsByStatus.total}
									({Math.round((variantsByStatus.completed / variantsByStatus.total) * 100)}%)
								</span>
							{/if}
						</div>

						<!-- Progress bar -->
						{#if variantsByStatus.total > 0}
							<div class="mb-6 h-px bg-rule">
								<div
									class="h-px bg-moss transition-all duration-700"
									style="width: {(variantsByStatus.completed / variantsByStatus.total) * 100}%"
								></div>
							</div>
						{/if}

						{#if variantsByStatus.needsAction > 0}
							<p class="mb-5 text-sm text-ochre">
								{variantsByStatus.needsAction} variant{variantsByStatus.needsAction !== 1 ? 's' : ''} await{variantsByStatus.needsAction
									=== 1
									? 's'
									: ''} your review —
								<button
									type="button"
									class="border-b border-ochre/50 pb-0.5 text-ochre transition-colors duration-150 hover:border-ochre active:opacity-75"
									onclick={() => (activeTab = 'variants')}>View in Variants tab</button
								>
							</p>
						{/if}

						<!-- Launch research CTA -->
						{#if variantsByStatus.draft > 0}
							<div
								class="mb-6 flex items-center justify-between gap-4 border border-rule bg-panel px-5 py-4"
							>
								<p class="text-sm text-ink-3">
									<span class="font-medium text-ink">{variantsByStatus.draft}</span>
									variant{variantsByStatus.draft !== 1 ? 's' : ''} ready — set a timeframe and launch
									the Local Marketing Researcher.
								</p>
								<a
									href="/app/projects/{project.id}/research"
									class="shrink-0 border-b border-ink pb-0.5 text-[11px] uppercase tracking-[0.15em] text-ink transition-colors duration-150 hover:border-bone hover:text-bone active:opacity-75"
								>
									Launch Research →
								</a>
							</div>
						{/if}

						<!-- Compact variant ledger in pipeline tab -->
						<div class="border-b border-rule">
							<div
								class="grid grid-cols-[1fr_auto_auto_auto] gap-x-6 border-b border-rule pb-3"
							>
								<span class="text-[10px] uppercase tracking-[0.2em] text-ink-3">Variant</span>
								<span class="hidden text-[10px] uppercase tracking-[0.2em] text-ink-3 sm:block"
									>Agent</span
								>
								<span class="hidden text-[10px] uppercase tracking-[0.2em] text-ink-3 sm:block"
									>Status</span
								>
								<span></span>
							</div>
							{#each variants as variant}
								<div
									class="group grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-6 border-b border-rule py-4 transition-colors duration-150 hover:border-rule-2 last:border-b-0"
								>
									<p class="font-display text-lg font-light leading-tight text-ink">
										{getVariantLabel(variant)}
									</p>
									<span class="hidden font-mono text-xs text-ink-3 sm:block">
										{AGENT_NAMES[VARIANT_STATUS_CONFIG[variant.status].step]}
									</span>
									<div class="hidden sm:block">
										<StatusBadge status={variant.status} type="variant" />
									</div>
									<a
										href="/app/projects/{project.id}/variants/{variant.id}"
										class="text-[11px] uppercase tracking-[0.1em] transition-colors {[
											'pending_research_validation',
											'pending_final_validation'
										].includes(variant.status)
											? 'text-ochre hover:text-ink'
											: 'text-ink-3 hover:text-ink'}"
									>
										{['pending_research_validation', 'pending_final_validation'].includes(
											variant.status
										)
											? 'Review →'
											: 'Open →'}
									</a>
								</div>
							{/each}
						</div>
					</section>
				{/if}

			</div>
		{/if}


		<!-- ═══════════════════════════════════════════════ -->
		<!-- TAB: VARIANTS — persona + pipeline cards        -->
		<!-- ═══════════════════════════════════════════════ -->
		{#if activeTab === 'variants'}
			<div class="mt-8">
				{#if variants.length === 0}
					<div class="py-20 text-center">
						<Layers class="mx-auto mb-4 h-8 w-8 animate-pulse text-ink-3/30" />
						<p class="mb-2 font-display text-2xl font-light text-ink-3">Preparing variants…</p>
						<p class="text-sm text-ink-3">Page updates automatically.</p>
					</div>
				{:else}
					<!-- Summary bar -->
					<div class="mb-6 flex flex-wrap items-center gap-5 border-b border-rule pb-5 text-[11px]">
						{#if variantsByStatus.needsAction > 0}
							<span class="flex items-center gap-1.5 font-medium text-ochre">
								<AlertCircle class="h-3 w-3" />
								{variantsByStatus.needsAction} awaiting review
							</span>
						{/if}
						{#if variantsByStatus.inProgress > 0}
							<span class="text-parchment">{variantsByStatus.inProgress} in progress</span>
						{/if}
						{#if variantsByStatus.draft > 0}
							<span class="text-ink-3">{variantsByStatus.draft} not started</span>
						{/if}
						<span class="ml-auto font-medium text-moss">{variantsByStatus.completed}/{variantsByStatus.total} completed</span>
					</div>

					<!-- Draft launch prompt -->
					{#if groupedVariants.draft.length > 0}
						<div class="mb-6 flex items-center justify-between gap-4 border border-dashed border-rule bg-panel/50 px-5 py-3.5">
							<p class="text-sm text-ink-3">
								<span class="font-medium text-ink">{groupedVariants.draft.length}</span> variant{groupedVariants.draft.length !== 1 ? 's' : ''} ready to launch
							</p>
							<a
								href="/app/projects/{project.id}/research"
								class="select-none shrink-0 border-b border-ink pb-0.5 text-[11px] uppercase tracking-[0.15em] text-ink transition-colors duration-150 hover:border-bone hover:text-bone active:opacity-75"
							>Launch Research →</a>
						</div>
					{/if}

					{#snippet variantCard(variant: Variant)}
						{@const persona = variant.expand?.persona}
						{@const needsAction = ['pending_research_validation', 'pending_final_validation'].includes(variant.status)}
						{@const steps = variantStepStatus(variant)}
						<a
							href="/app/projects/{project.id}/variants/{variant.id}"
							class="group relative block overflow-hidden border border-rule bg-canvas transition-all duration-200 hover:bg-panel hover:border-rule-2 active:opacity-90"
						>
							<span
								class="absolute left-0 top-0 bottom-0 w-[3px]"
								style="background-color: {variantAccentColor(variant.status)}"
							></span>
							<div class="py-5 pl-6 pr-5">
								<!-- Header: name + area + status + CTA -->
								<div class="mb-3 flex items-start justify-between gap-4">
									<div class="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
										<p class="font-display text-xl font-light leading-tight text-ink transition-colors duration-200 group-hover:text-bone">
											{persona?.name ?? `Variant ${variant.id.slice(0, 6)}`}
										</p>
										{#if persona?.target_area}
											<span class="shrink-0 border border-rule-2 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] text-ink-3">
												{persona.target_area}
											</span>
										{/if}
									</div>
									<div class="flex shrink-0 items-center gap-3">
										<StatusBadge status={variant.status} type="variant" />
										<span class="text-[10px] uppercase tracking-[0.12em] transition-colors duration-150 {needsAction ? 'text-ochre' : 'text-ink-3 group-hover:text-ink'}">
											{needsAction ? 'Review' : 'Open'} →
										</span>
									</div>
								</div>

								<!-- Demographic summary -->
								{#if persona?.demographic_summary}
									<p class="mb-4 line-clamp-1 text-sm leading-relaxed text-ink-3">{persona.demographic_summary}</p>
								{/if}

								<!-- Traits + mini pipeline -->
								<div class="flex flex-wrap items-end justify-between gap-4 border-t border-rule pt-3">
									<div class="flex flex-wrap gap-x-5 gap-y-3">
										{#if persona?.psychological_driver}
											<div class="flex items-start gap-2">
												<div class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border border-bone/30 bg-bone/8 text-bone">
													<Brain class="h-2.5 w-2.5" />
												</div>
												<div>
													<p class="mb-0.5 text-[9px] uppercase tracking-[0.12em] text-ink-3/60">Driver</p>
													<p class="text-[11px] text-ink-2">{persona.psychological_driver}</p>
												</div>
											</div>
										{/if}
										{#if persona?.buying_trigger}
											<div class="flex items-start gap-2">
												<div class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border border-ochre/30 bg-ochre/8 text-ochre">
													<Zap class="h-2.5 w-2.5" />
												</div>
												<div>
													<p class="mb-0.5 text-[9px] uppercase tracking-[0.12em] text-ink-3/60">Trigger</p>
													<p class="text-[11px] text-ink-2">{persona.buying_trigger}</p>
												</div>
											</div>
										{/if}
										{#if persona?.primary_objection}
											<div class="flex items-start gap-2">
												<div class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border border-rust/25 bg-rust/8 text-rust">
													<Shield class="h-2.5 w-2.5" />
												</div>
												<div>
													<p class="mb-0.5 text-[9px] uppercase tracking-[0.12em] text-ink-3/60">Objection</p>
													<p class="text-[11px] text-ink-2">{persona.primary_objection}</p>
												</div>
											</div>
										{/if}
										{#if persona?.preferred_tone}
											<div class="flex items-start gap-2">
												<div class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border border-moss/30 bg-moss/8 text-moss">
													<MessageSquare class="h-2.5 w-2.5" />
												</div>
												<div>
													<p class="mb-0.5 text-[9px] uppercase tracking-[0.12em] text-ink-3/60">Tone</p>
													<p class="text-[11px] text-ink-2">{persona.preferred_tone}</p>
												</div>
											</div>
										{/if}
									</div>

									<!-- Mini pipeline progress -->
									<div class="flex shrink-0 items-center gap-2 text-[9px] uppercase tracking-[0.1em]">
										<span class="flex items-center gap-1 {steps.research === 'done' ? 'text-moss' : steps.research === 'active' ? 'text-ochre' : 'text-ink-3/35'}">
											<span class="h-1.5 w-1.5 rounded-full bg-current {steps.research === 'active' ? 'animate-pulse' : ''}"></span>
											Research
										</span>
										<span class="h-px w-5 bg-rule"></span>
										<span class="flex items-center gap-1 {steps.architect === 'done' ? 'text-moss' : steps.architect === 'processing' ? 'text-parchment' : 'text-ink-3/35'}">
											<span class="h-1.5 w-1.5 rounded-full bg-current {steps.architect === 'processing' ? 'animate-pulse' : ''}"></span>
											Architect
										</span>
										<span class="h-px w-5 bg-rule"></span>
										<span class="flex items-center gap-1 {steps.design === 'done' ? 'text-moss' : steps.design === 'active' ? 'text-ochre' : 'text-ink-3/35'}">
											<span class="h-1.5 w-1.5 rounded-full bg-current {steps.design === 'active' ? 'animate-pulse' : ''}"></span>
											Design
										</span>
									</div>
								</div>
							</div>
						</a>
					{/snippet}

					{#if groupedVariants.needsAction.length > 0}
						<section class="mb-8">
							<p class="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-ochre">
								<AlertCircle class="h-3 w-3" /> Awaiting Review
							</p>
							<div class="space-y-2">
								{#each groupedVariants.needsAction as v}{@render variantCard(v)}{/each}
							</div>
						</section>
					{/if}

					{#if groupedVariants.inProgress.length > 0}
						<section class="mb-8">
							<p class="mb-3 text-[10px] uppercase tracking-[0.2em] text-parchment">In Progress</p>
							<div class="space-y-2">
								{#each groupedVariants.inProgress as v}{@render variantCard(v)}{/each}
							</div>
						</section>
					{/if}

					{#if groupedVariants.draft.length > 0}
						<section class="mb-8">
							<p class="mb-3 text-[10px] uppercase tracking-[0.2em] text-ink-3">Not Started</p>
							<div class="space-y-2">
								{#each groupedVariants.draft as v}{@render variantCard(v)}{/each}
							</div>
						</section>
					{/if}

					{#if groupedVariants.completed.length > 0}
						<section>
							<p class="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-moss">
								<CheckCircle2 class="h-3 w-3" /> Completed
							</p>
							<div class="space-y-2">
								{#each groupedVariants.completed as v}{@render variantCard(v)}{/each}
							</div>
						</section>
					{/if}
				{/if}
			</div>
		{/if}

	</div>
{/if}

<!-- ── Variant row snippet ─────────────────────────────── -->
{#snippet variantGroup(group: Variant[], highlight: boolean)}
	<div class="border-t border-rule">
		<!-- Table header -->
		<div class="grid grid-cols-[1fr_auto_auto_auto] gap-x-6 border-b border-rule py-2.5">
			<span class="text-[10px] uppercase tracking-[0.2em] text-ink-3">Variant</span>
			<span class="hidden text-[10px] uppercase tracking-[0.2em] text-ink-3 sm:block">Agent</span>
			<span class="hidden text-[10px] uppercase tracking-[0.2em] text-ink-3 sm:block">Status</span>
			<span></span>
		</div>
		{#each group as variant}
			<div
				class="group grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-6 border-b border-rule py-4 transition-colors duration-150 last:border-b-0 hover:border-rule-2"
			>
				<div>
					<p class="font-display text-lg font-light leading-tight text-ink {highlight ? '' : ''}">
						{getVariantLabel(variant)}
					</p>
					{#if variant.expand?.persona?.preferred_tone}
						<p class="mt-0.5 text-[11px] text-ink-3">{variant.expand.persona.preferred_tone}</p>
					{/if}
				</div>
				<span class="hidden font-mono text-xs text-ink-3 sm:block">
					{AGENT_NAMES[VARIANT_STATUS_CONFIG[variant.status].step]}
				</span>
				<div class="hidden sm:block">
					<StatusBadge status={variant.status} type="variant" />
				</div>
				<a
					href="/app/projects/{project.id}/variants/{variant.id}"
					class="text-[11px] uppercase tracking-[0.1em] transition-colors {highlight
						? 'text-ochre hover:text-ink'
						: 'text-ink-3 hover:text-ink'}"
				>
					{highlight ? 'Review →' : 'Open →'}
				</a>
			</div>
		{/each}
	</div>
{/snippet}
