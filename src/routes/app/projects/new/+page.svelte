<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client as zodClient } from 'sveltekit-superforms/adapters';
	import { z } from 'zod';

	const createProjectSchema = z.object({
		name: z.string().min(1),
		raw_data: z.string().min(20),
		target_language: z.enum(['french', 'english', 'arabic'])
	});

	let { data } = $props();

	const { form, errors, message, enhance, submitting } = superForm(data.form, {
		validators: zodClient(createProjectSchema)
	});
</script>

<div class="mx-auto max-w-2xl">
	<!-- Breadcrumb -->
	<div class="flex items-center gap-2 text-[11px] tracking-[0.08em] text-ink-3 mb-10">
		<a href="/app" class="hover:text-ink transition-colors duration-150 active:opacity-75">Projects</a>
		<span class="text-rule-2">—</span>
		<span>New Pipeline</span>
	</div>

	<!-- Title -->
	<div class="mb-12">
		<h1 class="font-display text-6xl font-light text-ink tracking-tight leading-none mb-4">
			New Pipeline
		</h1>
		<div class="h-px bg-rule-2"></div>
		<p class="mt-4 text-sm text-ink-3">
			Provide the raw product data that will seed the entire content generation pipeline.
		</p>
	</div>

	<form method="POST" use:enhance class="space-y-10">

		<!-- Project Name -->
		<div>
			<label for="name" class="block text-[10px] tracking-[0.2em] uppercase text-ink-3 mb-3">
				Project Name
			</label>
			<div class="border-b {$errors.name ? 'border-rust' : 'border-rule-2 focus-within:border-bone'} transition-colors duration-200">
				<input
					id="name"
					name="name"
					type="text"
					bind:value={$form.name}
					placeholder="e.g. AgroSmart Morocco — Spring 2026"
					class="w-full bg-transparent py-3 text-base text-ink placeholder-ink-3 focus:outline-none font-sans"
				/>
			</div>
			{#if $errors.name}
				<p class="mt-2 text-[11px] text-rust">{$errors.name}</p>
			{/if}
		</div>

		<!-- Target Language -->
		<div>
			<label for="target_language" class="block text-[10px] tracking-[0.2em] uppercase text-ink-3 mb-3">
				Target Language
			</label>
			<div class="border-b {$errors.target_language ? 'border-rust' : 'border-rule-2 focus-within:border-bone'} transition-colors duration-200">
				<select
					id="target_language"
					name="target_language"
					bind:value={$form.target_language}
					class="w-full bg-transparent py-3 text-base text-ink focus:outline-none font-sans appearance-none cursor-pointer"
				>
					<option value="" class="bg-panel text-ink-2">Select language…</option>
					<option value="french" class="bg-panel text-ink">French</option>
					<option value="english" class="bg-panel text-ink">English</option>
					<option value="arabic" class="bg-panel text-ink">Arabic</option>
				</select>
			</div>
			{#if $errors.target_language}
				<p class="mt-2 text-[11px] text-rust">{$errors.target_language}</p>
			{/if}
		</div>

		<!-- Raw Data -->
		<div>
			<label for="raw_data" class="block text-[10px] tracking-[0.2em] uppercase text-ink-3 mb-3">
				Raw Product / Service Data
			</label>
			<p class="text-[11px] text-ink-3 mb-4 leading-relaxed">
				Paste all available information: features, pricing, technical specs, existing copy, competitor notes — everything the AI should draw from.
			</p>
			<div class="border {$errors.raw_data ? 'border-rust' : 'border-rule focus-within:border-rule-2'} transition-colors duration-200 bg-panel">
				<textarea
					id="raw_data"
					name="raw_data"
					bind:value={$form.raw_data}
					rows="14"
					placeholder="Paste raw product data here…"
					class="w-full bg-transparent px-4 py-3.5 text-sm text-ink placeholder-ink-3 focus:outline-none font-mono resize-y leading-relaxed"
				></textarea>
			</div>
			{#if $errors.raw_data}
				<p class="mt-2 text-[11px] text-rust">{$errors.raw_data}</p>
			{/if}
		</div>

		<!-- Server error message -->
		{#if $message}
			<div class="border border-rust/30 bg-rust/5 px-4 py-3">
				<p class="text-sm text-rust">{$message}</p>
			</div>
		{/if}

		<!-- Actions -->
		<div class="flex items-center justify-between pt-4 border-t border-rule">
			<a
				href="/app"
				class="text-[11px] tracking-[0.12em] uppercase text-ink-3 hover:text-ink transition-colors duration-150 active:opacity-75"
			>
				Cancel
			</a>
			<button
				type="submit"
				disabled={$submitting}
				class="select-none text-[11px] tracking-[0.2em] uppercase border-b pb-0.5 transition-colors duration-150 active:opacity-75 disabled:opacity-40 disabled:cursor-not-allowed {$submitting ? 'text-ink-3 border-rule-2' : 'text-ink border-ink hover:text-bone hover:border-bone'}"
			>
				{$submitting ? 'Creating…' : 'Create Pipeline →'}
			</button>
		</div>
	</form>
</div>
