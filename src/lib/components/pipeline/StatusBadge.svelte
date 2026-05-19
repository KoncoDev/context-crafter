<script lang="ts">
	import type { ProjectStatus, VariantStatus } from '$lib/types/pipeline';
	import { PROJECT_STATUS_CONFIG, VARIANT_STATUS_CONFIG } from '$lib/config/pipeline';

	let {
		status,
		type = 'project'
	}: {
		status: ProjectStatus | VariantStatus;
		type?: 'project' | 'variant';
	} = $props();

	const config = $derived(
		type === 'project'
			? PROJECT_STATUS_CONFIG[status as ProjectStatus]
			: VARIANT_STATUS_CONFIG[status as VariantStatus]
	);
</script>

<span
	class="inline-flex items-center gap-1.5 border px-2 py-0.5 text-[10px] tracking-[0.1em] uppercase font-sans {config.color}"
>
	{#if config.isAIProcessing}
		<span class="inline-block h-1 w-1 animate-pulse rounded-full bg-current"></span>
	{:else}
		<span class="inline-block h-1 w-1 rounded-full bg-current opacity-50"></span>
	{/if}
	{config.label}
</span>
