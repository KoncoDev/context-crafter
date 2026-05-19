<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { clientOnlyPb } from '$lib/db/pocketbase';
	import StatusBadge from '$lib/components/pipeline/StatusBadge.svelte';
	import MarkdownEditor from '$lib/components/pipeline/MarkdownEditor.svelte';
	import type { Project } from '$lib/types/pipeline';

	let { data } = $props();

	let project = $state(data.project as Project);
	let masterSource = $state(data.masterForm.data.master_source ?? '');

	let isEditing = $state(false);
	let saving = $state(false);
	let saved = $state(false);
	let saveError = $state<string | null>(null);
	let resubmitting = $state(false);
	let resubmitError = $state<string | null>(null);
	let saveTimer: ReturnType<typeof setTimeout>;

	const isFirstReview = $derived(project?.status === 'pending_master_validation');
	const isExtracting = $derived(project?.status === 'extracting_master');
	const isPastStep1 = $derived(
		!!project && !['draft', 'extracting_master', 'pending_master_validation'].includes(project.status)
	);

	$effect(() => { if (data.project) project = data.project as Project; });
	$effect(() => {
		if (data.masterForm?.data?.master_source && !isEditing) {
			masterSource = data.masterForm.data.master_source;
		}
	});

	onMount(() => {
		if (!clientOnlyPb || !project) return;
		if (project.status !== 'extracting_master') return;

		const projectId = project.id;
		let unsubscribeFn: (() => void) | undefined;
		let destroyed = false;

		clientOnlyPb.collection('projects').subscribe(projectId, ({ record }) => {
			project = record as unknown as Project;
			if (record.status !== 'extracting_master') invalidateAll();
		}).then(fn => {
			if (destroyed) fn();
			else unsubscribeFn = fn;
		});

		return () => { destroyed = true; unsubscribeFn?.(); };
	});
</script>

<div class="mx-auto max-w-3xl">

	<!-- Breadcrumb -->
	<div class="flex items-center gap-2 text-[11px] tracking-[0.08em] text-ink-3 mb-8">
		<a href="/app" class="hover:text-ink transition-colors">Projects</a>
		<span>—</span>
		<a href="/app/projects/{project?.id}" class="hover:text-ink transition-colors">{project?.name ?? 'Project'}</a>
		<span>—</span>
		<span class="text-ink-2">Master Source</span>
	</div>

	<!-- Chapter header -->
	<div class="mb-8">
		<div class="flex items-start justify-between gap-6 mb-4">
			<div class="flex items-center gap-4">
				<span class="font-display text-3xl font-light leading-none {
					isPastStep1 ? 'text-moss' :
					isExtracting ? 'text-parchment' :
					'text-ochre'
				}">01</span>
				<div>
					<h1 class="font-display text-4xl font-light text-ink tracking-tight leading-none mb-1">
						Master Source
					</h1>
					<p class="text-[11px] text-ink-3">
						{#if isExtracting}AI is extracting content from your raw data
						{:else if isFirstReview}Review and edit before proceeding to Step 02
						{:else}The foundation for all persona variants{/if}
					</p>
				</div>
			</div>
			<div class="flex shrink-0 items-center gap-4 pt-1">
				{#if project}
					<StatusBadge status={project.status} type="project" />
				{/if}
				{#if isPastStep1 && !isEditing}
					<button
						type="button"
						onclick={() => { isEditing = true; resubmitError = null; saveError = null; }}
						class="text-[11px] tracking-[0.12em] uppercase text-ink-3 border-b border-rule-2 pb-0.5 hover:text-ink hover:border-ink-3 transition-colors"
					>
						Re-edit
					</button>
				{:else if isEditing}
					<button
						type="button"
						onclick={() => { isEditing = false; masterSource = data.masterForm.data.master_source ?? ''; }}
						class="text-[11px] tracking-[0.12em] uppercase text-ink-3 hover:text-ink transition-colors"
					>
						Cancel
					</button>
				{/if}
			</div>
		</div>
		<div class="h-px bg-rule-2"></div>
	</div>

	<!-- ── Extracting state ─────────────────────────────────── -->
	{#if isExtracting}
		<div class="border border-rule bg-panel p-8 mb-8">
			<div class="flex items-center gap-4">
				<svg class="h-4 w-4 animate-spin text-parchment shrink-0" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
				</svg>
				<div>
					<p class="text-sm text-ink-2">Extracting master source…</p>
					<p class="text-[11px] text-ink-3 mt-0.5">This page will update automatically when extraction completes.</p>
				</div>
			</div>
		</div>

	<!-- ── First review ──────────────────────────────────────── -->
	{:else if isFirstReview}
		<div class="border border-rule bg-panel p-6 space-y-5 mb-8">
			<div class="flex items-center justify-between">
				<p class="text-[10px] tracking-[0.2em] uppercase text-ink-3">Extracted Content</p>
				{#if saved}
					<span class="text-[11px] text-moss">Saved</span>
				{/if}
			</div>

			<MarkdownEditor bind:value={masterSource} placeholder="Master source content…" />

			{#if saveError}
				<p class="text-xs text-rust">{saveError}</p>
			{/if}

			<div class="flex items-center justify-between gap-4 border-t border-rule pt-5">
				<form
					method="POST"
					action="?/saveMaster"
					use:enhance={() => {
						saving = true;
						saveError = null;
						return async ({ result }) => {
							saving = false;
							if (result.type === 'failure') {
								saveError = (result.data as Record<string, string>)?.message ?? 'Save failed';
							} else {
								saved = true;
								clearTimeout(saveTimer);
								saveTimer = setTimeout(() => (saved = false), 2000);
							}
						};
					}}
				>
					<input type="hidden" name="master_source" value={masterSource} />
					<button
						type="submit"
						disabled={saving}
						class="text-[11px] tracking-[0.12em] uppercase text-ink-3 border-b border-rule-2 pb-0.5 hover:text-ink hover:border-ink-3 transition-colors disabled:opacity-40"
					>
						{saving ? 'Saving…' : 'Save Changes'}
					</button>
				</form>

				<a
					href="/app/projects/{project?.id}/generate-personas"
					class="text-[11px] tracking-[0.18em] uppercase text-ink border-b border-ink pb-0.5 hover:text-bone hover:border-bone transition-colors"
				>
					Continue to Step 02 →
				</a>
			</div>
		</div>

	<!-- ── Post-step-1: read-only or re-edit ─────────────────── -->
	{:else if isPastStep1}
		{#if isEditing}
			<div class="border-l-2 border-ochre/50 pl-5 mb-6">
				<p class="text-sm text-ochre mb-1">Re-editing Master Source</p>
				<p class="text-[11px] text-ink-3 leading-relaxed">
					<strong class="text-ink-2">Save Changes</strong> updates the text without affecting the pipeline.
					<strong class="text-ink-2">Save & Restart Step 2</strong> deletes all variants and personas, then reopens Step 2 configuration.
				</p>
			</div>
		{/if}

		<div class="border border-rule bg-panel p-6 space-y-5 mb-8">
			<MarkdownEditor bind:value={masterSource} readonly={!isEditing} placeholder="Master source content…" />

			{#if isEditing}
				{#if saveError}
					<p class="text-xs text-rust">{saveError}</p>
				{/if}
				{#if resubmitError}
					<div class="border-l-2 border-rust pl-4">
						<p class="text-sm text-rust">{resubmitError}</p>
					</div>
				{/if}

				<div class="flex flex-wrap items-center gap-5 border-t border-rule pt-5">
					<form
						method="POST"
						action="?/saveMaster"
						use:enhance={() => {
							saving = true;
							saveError = null;
							return async ({ result }) => {
								saving = false;
								if (result.type === 'failure') {
									saveError = (result.data as Record<string, string>)?.message ?? 'Save failed';
								} else {
									saved = true;
									clearTimeout(saveTimer);
									saveTimer = setTimeout(() => (saved = false), 2000);
								}
							};
						}}
					>
						<input type="hidden" name="master_source" value={masterSource} />
						<button
							type="submit"
							disabled={saving || resubmitting}
							class="text-[11px] tracking-[0.12em] uppercase text-ink-3 border-b border-rule-2 pb-0.5 hover:text-ink hover:border-ink-3 transition-colors disabled:opacity-40"
						>
							{saving ? 'Saving…' : 'Save Changes'}
						</button>
					</form>

					{#if saved}
						<span class="text-[11px] text-moss">Saved</span>
					{/if}

					<form
						method="POST"
						action="?/resubmitMaster"
						use:enhance={() => {
							resubmitting = true;
							resubmitError = null;
							return async ({ result }) => {
								resubmitting = false;
								if (result.type === 'failure') {
									resubmitError = (result.data as Record<string, string>)?.message ?? 'Failed to restart pipeline';
								}
							};
						}}
						class="ml-auto"
					>
						<input type="hidden" name="master_source" value={masterSource} />
						<button
							type="submit"
							disabled={saving || resubmitting}
							class="text-[11px] tracking-[0.18em] uppercase text-ochre border-b border-ochre/50 pb-0.5 hover:text-ink hover:border-ink transition-colors disabled:opacity-40"
						>
							{resubmitting ? 'Restarting…' : 'Save & Restart Step 02 →'}
						</button>
					</form>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Back -->
	<div class="h-px bg-rule mb-6"></div>
	<a href="/app/projects/{project?.id}" class="text-[11px] tracking-[0.12em] uppercase text-ink-3 hover:text-ink transition-colors border-b border-rule-2 pb-0.5">
		← Back to Project
	</a>
</div>
