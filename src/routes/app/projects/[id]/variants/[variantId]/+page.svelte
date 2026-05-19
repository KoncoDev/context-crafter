<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { superForm } from 'sveltekit-superforms';
	import { clientOnlyPb } from '$lib/db/pocketbase';
	import StatusBadge from '$lib/components/pipeline/StatusBadge.svelte';
	import ArchitectingDataView from '$lib/components/pipeline/ArchitectingDataView.svelte';
	import DesigningDataView from '$lib/components/pipeline/DesigningDataView.svelte';
	import type { Variant, Project } from '$lib/types/pipeline';
	import { MapPin, Target, Palette, ChevronRight, ChevronDown, ChevronUp } from 'lucide-svelte';

	let { data } = $props();

	let variant = $state(data.variant as Variant);
	let project = $state(data.project as Project);
	let approvingFinal = $state(false);
	let rerunningResearch = $state(false);
	let rerunResearchError = $state<string | null>(null);
	let rerunningArchitect = $state(false);
	let rerunningDesign = $state(false);
	let showRawArchitecting = $state(false);
	let showRawDesigning = $state(false);

	const {
		form: researchEditForm,
		errors: researchEditErrors,
		enhance: researchEditEnhance,
		submitting: researchEditSubmitting
	} = superForm(data.researchEditForm, {
		id: 'research-edit',
		onUpdated({ form }) {
			if (form.valid) invalidateAll();
		}
	});

	$effect(() => {
		if (data.variant) {
			const newVariant = data.variant as unknown as Variant;
			const existingPersona = untrack(() => variant?.expand?.persona);
			variant =
				!newVariant.expand?.persona && existingPersona
					? { ...newVariant, expand: { persona: existingPersona } }
					: newVariant;
		}
	});

	onMount(() => {
		if (!clientOnlyPb || !variant) return;

		const variantId = variant.id;
		let unsubscribeFn: (() => void) | undefined;
		let destroyed = false;

		clientOnlyPb
			.collection('variants')
			.subscribe(variantId, ({ record }) => {
				const existingPersona = variant?.expand?.persona;
				variant = record as unknown as Variant;
				if (!variant.expand?.persona && existingPersona) {
					variant = { ...variant, expand: { persona: existingPersona } };
				}
				const refreshOn = ['pending_research_validation', 'pending_final_validation', 'completed', 'draft'];
				if (refreshOn.includes(record.status)) invalidateAll();
			})
			.then((fn) => {
				if (destroyed) fn();
				else unsubscribeFn = fn;
			})
			.catch((err) => console.error('[realtime] variant subscribe failed:', err));

		return () => {
			destroyed = true;
			unsubscribeFn?.();
		};
	});

	const persona = $derived(variant?.expand?.persona ?? null);

	const researchDone = $derived(
		!!variant && !['draft', 'researching'].includes(variant.status)
	);
	const architectDone = $derived(
		!!variant &&
			['designing', 'pending_final_validation', 'completed'].includes(variant.status)
	);

	type AgentState = 'waiting' | 'processing' | 'active' | 'done';

	function agentIconClass(state: AgentState): string {
		const base = 'w-9 h-9 border flex items-center justify-center shrink-0 transition-colors';
		const states: Record<AgentState, string> = {
			waiting: 'border-rule-2 text-ink-3',
			processing: 'border-parchment/50 text-parchment',
			active: 'border-ochre/50 text-ochre',
			done: 'border-moss/40 text-moss'
		};
		return `${base} ${states[state]}`;
	}
</script>

{#snippet spinnerBlock(label: string)}
	<div class="flex items-center gap-3">
		<svg class="h-3.5 w-3.5 shrink-0 animate-spin text-parchment" fill="none" viewBox="0 0 24 24">
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
			></circle>
			<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
			></path>
		</svg>
		<div>
			<p class="text-sm text-ink-2">{label}</p>
			<p class="mt-0.5 text-[11px] text-ink-3">Page updates automatically when complete.</p>
		</div>
	</div>
{/snippet}

{#snippet rerunButton(action: string, label: string, running: boolean, onclick: () => void)}
	<form
		method="POST"
		{action}
		use:enhance={() => {
			onclick();
			return async ({ update }) => {
				await update();
			};
		}}
	>
		<button
			type="submit"
			disabled={running}
			class="border-b border-rule-2 pb-0.5 text-[11px] uppercase tracking-[0.12em] text-ink-3 transition-colors hover:border-ink-3 hover:text-ink disabled:opacity-40"
		>
			{running ? 'Rerunning…' : label}
		</button>
	</form>
{/snippet}

{#if !variant}
	<div class="py-20 text-center">
		<p class="mb-3 font-display text-3xl font-light text-ink-3">Variant not found</p>
		<a
			href="/app"
			class="border-b border-rule-2 pb-0.5 text-[11px] uppercase tracking-[0.15em] text-ink-3 hover:text-ink"
		>
			← Back to Projects
		</a>
	</div>
{:else}
	<div>

		<!-- ── Variant header ──────────────────────────────── -->
		<div class="mb-6">
			<div class="mb-6 flex items-center gap-1.5 text-[11px] tracking-[0.08em] text-ink-3">
				<a href="/app" class="transition-colors hover:text-ink">Projects</a>
				<ChevronRight class="h-3 w-3 text-ink-3/50" />
				<a href="/app/projects/{project?.id}" class="transition-colors hover:text-ink">
					{project?.name ?? 'Project'}
				</a>
				<ChevronRight class="h-3 w-3 text-ink-3/50" />
				<span class="text-ink-2">{persona?.name ?? 'Variant'}</span>
			</div>

			<div class="mb-4 flex items-start justify-between gap-6">
				<div>
					<h1 class="mb-2 font-display text-5xl font-light leading-none tracking-tight text-ink">
						{persona?.name ?? 'Variant'}
					</h1>
					{#if persona?.target_area}
						<p class="text-sm text-ink-3">
							{persona.target_area}{#if variant.timeframe} · {variant.timeframe}{/if}
						</p>
					{/if}
				</div>
				<div class="shrink-0 pt-2">
					<StatusBadge status={variant.status} type="variant" />
				</div>
			</div>

			<div class="h-px bg-rule-2"></div>
		</div>

		<!-- ── Persona Profile ─────────────────────────────── -->
		{#if persona}
			<div class="my-8 border border-rule bg-panel p-6">
				<p class="mb-5 text-[10px] uppercase tracking-[0.25em] text-ink-3">Persona Profile</p>
				<div class="grid gap-x-8 gap-y-5 sm:grid-cols-2">
					{#if persona.demographic_summary}
						<div class="sm:col-span-2">
							<p class="mb-1.5 text-[10px] uppercase tracking-[0.15em] text-ink-3">Demographic</p>
							<p class="text-sm leading-relaxed text-ink-2">{persona.demographic_summary}</p>
						</div>
					{/if}
					{#if persona.psychological_driver}
						<div>
							<p class="mb-1.5 text-[10px] uppercase tracking-[0.15em] text-ink-3">
								Psychological Driver
							</p>
							<p class="text-sm text-ink-2">{persona.psychological_driver}</p>
						</div>
					{/if}
					{#if persona.buying_trigger}
						<div>
							<p class="mb-1.5 text-[10px] uppercase tracking-[0.15em] text-ink-3">Buying Trigger</p>
							<p class="text-sm text-ink-2">{persona.buying_trigger}</p>
						</div>
					{/if}
					{#if persona.primary_objection}
						<div>
							<p class="mb-1.5 text-[10px] uppercase tracking-[0.15em] text-ink-3">
								Primary Objection
							</p>
							<p class="text-sm text-ink-2">{persona.primary_objection}</p>
						</div>
					{/if}
					{#if persona.preferred_tone}
						<div>
							<p class="mb-1.5 text-[10px] uppercase tracking-[0.15em] text-ink-3">Preferred Tone</p>
							<p class="text-sm text-ink-2">{persona.preferred_tone}</p>
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<div class="h-px bg-rule"></div>

		<!-- ── Agent 03: Local Marketing Researcher ───────── -->
		<section class="mb-0 pb-10 pt-8">
			<div class="mb-6 flex items-center gap-4">
				<div
					class={agentIconClass(
						researchDone
							? 'done'
							: variant.status === 'researching'
								? 'processing'
								: variant.status === 'pending_research_validation'
									? 'active'
									: 'waiting'
					)}
				>
					<MapPin class="h-4 w-4" />
				</div>
				<div class="flex-1">
					<p class="text-[10px] uppercase tracking-[0.15em] text-ink-3">Agent 03</p>
					<p class="text-base font-medium leading-tight text-ink">Local Marketing Researcher</p>
				</div>
				{#if researchDone}
					<div class="shrink-0">
						{@render rerunButton('?/rerunResearch', 'Rerun Research', rerunningResearch, () => {
							rerunningResearch = true;
						})}
					</div>
				{/if}
			</div>

			{#if variant.status === 'draft'}
				<div
					class="flex items-center justify-between gap-4 border border-rule bg-panel px-5 py-4"
				>
					<p class="text-sm text-ink-3">Research not started yet.</p>
					<a
						href="/app/projects/{project?.id}/research"
						class="shrink-0 border-b border-ink pb-0.5 text-[11px] uppercase tracking-[0.15em] text-ink transition-colors hover:border-bone hover:text-bone"
					>
						Go to Research Launch →
					</a>
				</div>

			{:else if variant.status === 'researching'}
				{@render spinnerBlock('Running local market research…')}

			{:else if variant.status === 'pending_research_validation'}
				<form method="POST" action="?/approveResearch" use:researchEditEnhance class="space-y-5">
					<p class="text-sm text-ink-3">
						Review and edit the research output before proceeding to architecture.
					</p>

					{#if variant.researching_data}
						{@const research = variant.researching_data as Record<string, string>}
						{#if research.internet_research}
							<div class="border-l-2 border-rule-2 py-1 pl-5">
								<p class="mb-2 text-[10px] uppercase tracking-[0.15em] text-ink-3">
									Market Research Summary
								</p>
								<p class="whitespace-pre-wrap text-sm leading-relaxed text-ink-2">
									{research.internet_research}
								</p>
							</div>
						{/if}
					{/if}

					<div>
						<label
							for="research_json"
							class="mb-3 block text-[10px] uppercase tracking-[0.2em] text-ink-3"
						>
							Edit Raw JSON
						</label>
						<div
							class="border border-rule bg-panel transition-colors focus-within:border-rule-2"
						>
							<textarea
								id="research_json"
								name="json_data"
								bind:value={$researchEditForm.json_data}
								rows="8"
								class="w-full resize-y bg-transparent px-4 py-3.5 font-mono text-xs leading-relaxed text-ink-2 focus:outline-none"
							></textarea>
						</div>
						{#if $researchEditErrors.json_data}
							<p class="mt-2 text-[11px] text-rust">{$researchEditErrors.json_data}</p>
						{/if}
					</div>

					<div class="flex items-center justify-between pt-2">
						{#if rerunResearchError}
							<div>
								<p class="mb-1 text-xs text-rust">{rerunResearchError}</p>
								<a
									href="/app/projects/{project?.id}/research"
									class="border-b border-rule-2 pb-0.5 text-[11px] text-ink-3 hover:text-ink"
								>
									Go to Research page →
								</a>
							</div>
						{:else}
							<span></span>
						{/if}
						<button
							type="submit"
							disabled={$researchEditSubmitting}
							class="border-b pb-0.5 text-[11px] uppercase tracking-[0.18em] transition-colors disabled:opacity-40 {$researchEditSubmitting
								? 'border-rule-2 text-ink-3'
								: 'border-ink text-ink hover:border-bone hover:text-bone'}"
						>
							{$researchEditSubmitting
								? 'Submitting…'
								: 'Approve Research → Lead Conversion Architect'}
						</button>
					</div>
				</form>

			{:else if researchDone && variant.researching_data}
				{@const r = variant.researching_data as Record<string, string>}
				{#if r.internet_research}
					<p class="line-clamp-2 text-sm leading-relaxed text-ink-3">{r.internet_research}</p>
				{:else}
					<p class="text-[11px] text-ink-3">Research data available.</p>
				{/if}
			{/if}
		</section>

		<div class="h-px bg-rule"></div>

		<!-- ── Agent 04: Lead Conversion Architect ────────── -->
		<section class="pb-10 pt-8 {!researchDone ? 'pointer-events-none opacity-30' : ''}">
			<div class="mb-6 flex items-center gap-4">
				<div
					class={agentIconClass(
						architectDone ? 'done' : variant.status === 'architecting' ? 'processing' : 'waiting'
					)}
				>
					<Target class="h-4 w-4" />
				</div>
				<div class="flex-1">
					<p class="text-[10px] uppercase tracking-[0.15em] text-ink-3">Agent 04</p>
					<p class="text-base font-medium leading-tight text-ink">Lead Conversion Architect</p>
				</div>
				{#if architectDone}
					<div class="shrink-0">
						{@render rerunButton('?/rerunArchitect', 'Rerun Agents 4+5', rerunningArchitect, () => {
							rerunningArchitect = true;
						})}
					</div>
				{/if}
			</div>

			{#if !researchDone}
				<p class="text-sm text-ink-3">Waiting for Local Marketing Researcher to complete.</p>
			{:else if variant.status === 'architecting'}
				{@render spinnerBlock('Building messaging & UX framework…')}
			{:else if architectDone}
				{#if variant.architecting_data}
					<!-- Rendered view -->
					<ArchitectingDataView data={variant.architecting_data} />

					<!-- Raw JSON toggle -->
					<div class="mt-6 border-t border-rule pt-5">
						<button
							type="button"
							onclick={() => (showRawArchitecting = !showRawArchitecting)}
							class="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-ink-3 transition-colors hover:text-ink"
						>
							{showRawArchitecting ? 'Hide' : 'Show'} Raw JSON
							{#if showRawArchitecting}
								<ChevronUp class="h-3 w-3" />
							{:else}
								<ChevronDown class="h-3 w-3" />
							{/if}
						</button>
						{#if showRawArchitecting}
							<pre
								class="mt-3 max-h-72 overflow-auto border border-rule bg-panel p-4 font-mono text-xs leading-relaxed text-ink-3"
							>{JSON.stringify(variant.architecting_data, null, 2)}</pre>
						{/if}
					</div>
				{:else}
					<p class="text-sm text-ink-3">Architecture complete — design phase started automatically.</p>
				{/if}
			{/if}
		</section>

		<div class="h-px bg-rule"></div>

		<!-- ── Agent 05: UX/UI Design Architect ───────────── -->
		<section class="pb-12 pt-8 {!architectDone ? 'pointer-events-none opacity-30' : ''}">
			<div class="mb-6 flex items-center gap-4">
				<div
					class={agentIconClass(
						variant.status === 'completed'
							? 'done'
							: variant.status === 'designing'
								? 'processing'
								: variant.status === 'pending_final_validation'
									? 'active'
									: 'waiting'
					)}
				>
					<Palette class="h-4 w-4" />
				</div>
				<div class="flex-1">
					<p class="text-[10px] uppercase tracking-[0.15em] text-ink-3">Agent 05</p>
					<p class="text-base font-medium leading-tight text-ink">UX/UI Design Architect</p>
				</div>
				{#if variant.status === 'pending_final_validation' || variant.status === 'completed'}
					<div class="shrink-0">
						{@render rerunButton('?/rerunDesign', 'Rerun Agents 4+5', rerunningDesign, () => {
							rerunningDesign = true;
						})}
					</div>
				{/if}
			</div>

			{#if !architectDone}
				<p class="text-sm text-ink-3">Waiting for Lead Conversion Architect to complete.</p>

			{:else if variant.status === 'designing'}
				{@render spinnerBlock('Crafting brand narrative & design system…')}

			{:else if variant.status === 'pending_final_validation'}
				<div class="space-y-6">
					<p class="text-sm text-ink-3">
						Final review: branding narrative, design tokens, and asset directives.
					</p>

					{#if variant.designing_data}
						<DesigningDataView data={variant.designing_data} />

						<!-- Raw JSON toggle -->
						<div class="border-t border-rule pt-5">
							<button
								type="button"
								onclick={() => (showRawDesigning = !showRawDesigning)}
								class="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-ink-3 transition-colors hover:text-ink"
							>
								{showRawDesigning ? 'Hide' : 'Show'} Raw JSON
								{#if showRawDesigning}
									<ChevronUp class="h-3 w-3" />
								{:else}
									<ChevronDown class="h-3 w-3" />
								{/if}
							</button>
							{#if showRawDesigning}
								<pre
									class="mt-3 max-h-72 overflow-auto border border-rule bg-panel p-4 font-mono text-xs leading-relaxed text-ink-3"
								>{JSON.stringify(variant.designing_data, null, 2)}</pre>
							{/if}
						</div>
					{/if}

					<div class="flex items-center justify-end border-t border-rule pt-4">
						<form
							method="POST"
							action="?/approveFinal"
							use:enhance={() => {
								approvingFinal = true;
								return async ({ update }) => {
									await update();
									approvingFinal = false;
								};
							}}
						>
							<button
								type="submit"
								disabled={approvingFinal}
								class="border-b pb-0.5 text-[11px] uppercase tracking-[0.18em] transition-colors disabled:opacity-40 {approvingFinal
									? 'border-rule-2 text-ink-3'
									: 'border-moss text-moss hover:border-ink hover:text-ink'}"
							>
								{approvingFinal ? 'Approving…' : 'Approve Final — Mark as Completed →'}
							</button>
						</form>
					</div>
				</div>

			{:else if variant.status === 'completed'}
				<div class="space-y-5">
					<div class="border-l-2 border-moss py-1 pl-5">
						<p class="text-sm text-moss">Variant completed — payload locked.</p>
					</div>

					{#if variant.designing_data}
						<DesigningDataView data={variant.designing_data} />

						<!-- Raw JSON toggle -->
						<div class="border-t border-rule pt-5">
							<button
								type="button"
								onclick={() => (showRawDesigning = !showRawDesigning)}
								class="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-ink-3 transition-colors hover:text-ink"
							>
								{showRawDesigning ? 'Hide' : 'Show'} Raw JSON
								{#if showRawDesigning}
									<ChevronUp class="h-3 w-3" />
								{:else}
									<ChevronDown class="h-3 w-3" />
								{/if}
							</button>
							{#if showRawDesigning}
								<pre
									class="mt-3 max-h-72 overflow-auto border border-rule bg-panel p-4 font-mono text-xs leading-relaxed text-ink-3"
								>{JSON.stringify(variant.designing_data, null, 2)}</pre>
							{/if}
						</div>
					{/if}
				</div>
			{/if}
		</section>

		<!-- ── Back navigation ───────────────────────────── -->
		<div class="h-px bg-rule mb-8"></div>
		<a
			href="/app/projects/{project?.id}"
			class="border-b border-rule-2 pb-0.5 text-[11px] uppercase tracking-[0.12em] text-ink-3 transition-colors hover:text-ink"
		>
			← Back to Project
		</a>

	</div>
{/if}
