<script lang="ts">
	import StatusBadge from '$lib/components/pipeline/StatusBadge.svelte';
	import { PROJECT_STATUS_CONFIG } from '$lib/config/pipeline';
	import type { Project } from '$lib/types/pipeline';

	let { data } = $props();
	const projects = data.projects as Project[];

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}
</script>

<div>
	<!-- Page header -->
	<div class="mb-10">
		<div class="flex items-end justify-between mb-4">
			<h1 class="font-display text-6xl font-light text-ink tracking-tight leading-none">Projects</h1>
			<a
				href="/app/projects/new"
				class="text-[11px] tracking-[0.18em] uppercase text-ink-3 hover:text-ink border-b border-rule-2 hover:border-ink-3 pb-0.5 transition-colors duration-150 active:opacity-75"
			>
				New Pipeline ↗
			</a>
		</div>
		<div class="h-px bg-rule-2"></div>
	</div>

	{#if projects.length === 0}
		<!-- Empty state -->
		<div class="py-20 text-center">
			<p class="font-display text-3xl font-light text-ink-3 mb-3">No pipelines yet</p>
			<p class="text-sm text-ink-3 mb-8">
				Create your first project to begin generating persona-targeted content.
			</p>
			<a
				href="/app/projects/new"
				class="text-[11px] tracking-[0.2em] uppercase text-ink-2 border-b border-rule-2 pb-0.5 hover:text-ink hover:border-ink-2 transition-colors duration-150 active:opacity-75"
			>
				Start a new pipeline →
			</a>
		</div>
	{:else}
		<!-- Ledger header -->
		<div class="grid grid-cols-[1fr_auto_auto_auto_1rem] gap-x-8 pb-3 border-b border-rule">
			<span class="text-[10px] tracking-[0.2em] uppercase text-ink-3">Project</span>
			<span class="text-[10px] tracking-[0.2em] uppercase text-ink-3">Language</span>
			<span class="text-[10px] tracking-[0.2em] uppercase text-ink-3">Status</span>
			<span class="text-[10px] tracking-[0.2em] uppercase text-ink-3">Created</span>
			<span></span>
		</div>

		<!-- Ledger rows -->
		{#each projects as project}
			{@const statusColor = PROJECT_STATUS_CONFIG[project.status].color}
			{@const isProcessing = PROJECT_STATUS_CONFIG[project.status].isAIProcessing}
			{@const isPending = project.status === 'pending_master_validation' || project.status === 'pending_persona_validation'}
			<a
				href="/app/projects/{project.id}"
				class="group relative grid grid-cols-[1fr_auto_auto_auto_1rem] gap-x-8 items-center py-5 border-b border-rule hover:bg-panel transition-colors duration-150 active:opacity-75 select-none overflow-hidden"
			>
				<!-- Status color strip -->
				<span
					class="absolute left-0 top-0 bottom-0 w-[3px] transition-opacity duration-150 {isProcessing || isPending ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}"
					class:bg-parchment={isProcessing}
					class:bg-ochre={isPending}
					class:bg-moss={project.status === 'completed'}
					class:bg-bone={project.status === 'processing_variants' || project.status === 'draft'}
					class:bg-rust={project.status === 'error'}
				></span>
				<span class="pl-3 font-display text-2xl font-light text-ink group-hover:text-bone transition-colors leading-tight">
					{project.name}
				</span>
				<span class="text-[11px] capitalize text-ink-3 font-sans">{project.target_language}</span>
				<StatusBadge status={project.status} type="project" />
				<span class="text-[11px] text-ink-3 font-mono tabular-nums">{formatDate(project.created)}</span>
				<span class="text-ink-3 group-hover:text-ink transition-colors text-sm">→</span>
			</a>
		{/each}
	{/if}
</div>
