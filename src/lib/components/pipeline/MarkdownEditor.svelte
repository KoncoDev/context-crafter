<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Editor } from '@tiptap/core';

	interface Props {
		value?: string;
		name?: string;
		readonly?: boolean;
		placeholder?: string;
	}

	let {
		value = $bindable(''),
		name = '',
		readonly = false,
		placeholder = 'Start writing…'
	}: Props = $props();

	let editorEl: HTMLDivElement | undefined = $state();
	let editor: Editor | undefined;
	let editorReady = $state(false);
	let updatingFromExternal = false;

	let active = $state({
		bold: false,
		italic: false,
		h1: false,
		h2: false,
		h3: false,
		bullet: false,
		ordered: false,
		code: false,
		blockquote: false
	});

	function syncActive() {
		if (!editor) return;
		active = {
			bold:       editor.isActive('bold'),
			italic:     editor.isActive('italic'),
			h1:         editor.isActive('heading', { level: 1 }),
			h2:         editor.isActive('heading', { level: 2 }),
			h3:         editor.isActive('heading', { level: 3 }),
			bullet:     editor.isActive('bulletList'),
			ordered:    editor.isActive('orderedList'),
			code:       editor.isActive('codeBlock'),
			blockquote: editor.isActive('blockquote')
		};
	}

	onMount(async () => {
		const { Editor } = await import('@tiptap/core');
		const { default: StarterKit } = await import('@tiptap/starter-kit');
		const { Markdown } = await import('tiptap-markdown');
		const { Placeholder } = await import('@tiptap/extension-placeholder');

		editor = new Editor({
			element: editorEl!,
			extensions: [
				StarterKit,
				Markdown.configure({ html: false, transformPastedText: true }),
				Placeholder.configure({ placeholder })
			],
			content: value,
			editable: !readonly,
			editorProps: {
				attributes: { class: 'focus:outline-none' }
			},
			onUpdate: () => {
				if (updatingFromExternal) return;
				value = (editor!.storage as any).markdown.getMarkdown();
				syncActive();
			},
			onSelectionUpdate: syncActive
		});
		editorReady = true;
	});

	onDestroy(() => editor?.destroy());

	// Keep Tiptap's editable flag in sync with the readonly prop
	$effect(() => {
		if (!editorReady || !editor) return;
		editor.setEditable(!readonly);
	});

	// Sync external value changes into the editor (skip when user is typing)
	$effect(() => {
		if (!editorReady || !editor) return;
		const v = value; // track `value` as reactive dep
		if (editor.isFocused) return;
		const current = (editor.storage as any).markdown.getMarkdown();
		if (v !== current) {
			updatingFromExternal = true;
			editor.commands.setContent(v);
			updatingFromExternal = false;
		}
	});

	function run(fn: (e: Editor) => void) {
		if (!editor) return;
		fn(editor);
		syncActive();
	}
</script>

<div class="rich-editor overflow-hidden border border-rule bg-canvas">

	<!-- ── Toolbar ──────────────────────────────────────────── -->
	{#if !readonly}
		<div class="select-none flex flex-wrap items-center gap-0 border-b border-rule bg-panel px-3 py-1.5">

			<!-- Headings -->
			<div class="flex items-center">
				<button
					type="button"
					onclick={() => run(e => e.chain().focus().toggleHeading({ level: 1 }).run())}
					class="toolbar-btn {active.h1 ? 'toolbar-btn--on' : ''}"
					title="Heading 1"
				>
					<span class="font-display text-sm font-medium leading-none">H1</span>
				</button>
				<button
					type="button"
					onclick={() => run(e => e.chain().focus().toggleHeading({ level: 2 }).run())}
					class="toolbar-btn {active.h2 ? 'toolbar-btn--on' : ''}"
					title="Heading 2"
				>
					<span class="font-display text-sm font-medium leading-none">H2</span>
				</button>
				<button
					type="button"
					onclick={() => run(e => e.chain().focus().toggleHeading({ level: 3 }).run())}
					class="toolbar-btn {active.h3 ? 'toolbar-btn--on' : ''}"
					title="Heading 3"
				>
					<span class="font-display text-sm font-medium leading-none">H3</span>
				</button>
			</div>

			<span class="toolbar-sep"></span>

			<!-- Inline marks -->
			<div class="flex items-center">
				<button
					type="button"
					onclick={() => run(e => e.chain().focus().toggleBold().run())}
					class="toolbar-btn {active.bold ? 'toolbar-btn--on' : ''}"
					title="Bold (⌘B)"
				>
					<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
						<path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
						<path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
					</svg>
				</button>
				<button
					type="button"
					onclick={() => run(e => e.chain().focus().toggleItalic().run())}
					class="toolbar-btn {active.italic ? 'toolbar-btn--on' : ''}"
					title="Italic (⌘I)"
				>
					<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
						<line x1="19" y1="4" x2="10" y2="4"/>
						<line x1="14" y1="20" x2="5" y2="20"/>
						<line x1="15" y1="4" x2="9" y2="20"/>
					</svg>
				</button>
			</div>

			<span class="toolbar-sep"></span>

			<!-- Lists -->
			<div class="flex items-center">
				<button
					type="button"
					onclick={() => run(e => e.chain().focus().toggleBulletList().run())}
					class="toolbar-btn {active.bullet ? 'toolbar-btn--on' : ''}"
					title="Bullet list"
				>
					<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
						<circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/>
						<line x1="8" y1="6" x2="21" y2="6"/>
						<circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/>
						<line x1="8" y1="12" x2="21" y2="12"/>
						<circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/>
						<line x1="8" y1="18" x2="21" y2="18"/>
					</svg>
				</button>
				<button
					type="button"
					onclick={() => run(e => e.chain().focus().toggleOrderedList().run())}
					class="toolbar-btn {active.ordered ? 'toolbar-btn--on' : ''}"
					title="Numbered list"
				>
					<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
						<line x1="10" y1="6" x2="21" y2="6"/>
						<line x1="10" y1="12" x2="21" y2="12"/>
						<line x1="10" y1="18" x2="21" y2="18"/>
						<text x="2" y="7.5" font-size="5.5" font-family="monospace" fill="currentColor" stroke="none">1</text>
						<text x="2" y="13.5" font-size="5.5" font-family="monospace" fill="currentColor" stroke="none">2</text>
						<text x="2" y="19.5" font-size="5.5" font-family="monospace" fill="currentColor" stroke="none">3</text>
					</svg>
				</button>
			</div>

			<span class="toolbar-sep"></span>

			<!-- Blockquote + Code -->
			<div class="flex items-center">
				<button
					type="button"
					onclick={() => run(e => e.chain().focus().toggleBlockquote().run())}
					class="toolbar-btn {active.blockquote ? 'toolbar-btn--on' : ''}"
					title="Blockquote"
				>
					<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
						<path d="M3 6h6v6H3zm0 8h6v6H3zM12 6h6v6h-6zm0 8h6v6h-6z" opacity=".15"/>
						<path d="M4.5 7.5c0-.83.67-1.5 1.5-1.5h3v3H4.5V7.5zM4.5 14.5c0-.83.67-1.5 1.5-1.5h3v3H4.5v-1.5zM13.5 7.5c0-.83.67-1.5 1.5-1.5h3v3h-4.5V7.5zM13.5 14.5c0-.83.67-1.5 1.5-1.5h3v3h-4.5v-1.5z"/>
						<rect x="3" y="6" width="6" height="5" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>
						<rect x="13" y="6" width="6" height="5" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>
					</svg>
				</button>
				<button
					type="button"
					onclick={() => run(e => e.chain().focus().toggleCodeBlock().run())}
					class="toolbar-btn font-mono text-xs {active.code ? 'toolbar-btn--on' : ''}"
					title="Code block"
				>
					&lt;/&gt;
				</button>
			</div>

			<span class="toolbar-sep"></span>

			<!-- Divider -->
			<button
				type="button"
				onclick={() => run(e => e.chain().focus().setHorizontalRule().run())}
				class="toolbar-btn text-xs tracking-widest"
				title="Horizontal rule"
			>
				——
			</button>
		</div>
	{/if}

	<!-- ── Editor content area ──────────────────────────────── -->
	<div
		bind:this={editorEl}
		class="editor-content"
		class:opacity-60={readonly}
		class:cursor-default={readonly}
		class:cursor-text={!readonly}
	></div>

	{#if name}
		<input type="hidden" {name} {value} />
	{/if}
</div>

<style>
	/* ── Toolbar button base ── */
	:global(.toolbar-btn) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 2rem;
		height: 2rem;
		padding: 0 0.375rem;
		color: var(--color-ink-3);
		transition: color 0.15s, background-color 0.15s;
		border-radius: 2px;
	}
	:global(.toolbar-btn:hover) {
		color: var(--color-ink);
		background-color: var(--color-panel-2);
	}
	:global(.toolbar-btn:active) {
		opacity: 0.75;
	}
	:global(.toolbar-btn--on) {
		color: var(--color-ink) !important;
		background-color: var(--color-panel-2) !important;
		box-shadow: inset 0 0 0 1px var(--color-rule-2);
	}

	/* ── Toolbar separator ── */
	:global(.toolbar-sep) {
		display: inline-block;
		width: 1px;
		height: 1.125rem;
		background-color: var(--color-rule);
		margin: 0 0.5rem;
		flex-shrink: 0;
	}

	/* ── Editor prose styles ── */
	:global(.editor-content .ProseMirror) {
		outline: none;
		min-height: 20rem;
		/* Padding lives here so the full area is clickable / focusable */
		padding: 1.5rem 2rem;
		caret-color: var(--color-bone);
		font-family: var(--font-sans);
		font-size: 0.9375rem;
		line-height: 1.8;
		color: var(--color-ink);
	}

	/* Placeholder */
	:global(.editor-content .ProseMirror p.is-editor-empty:first-child::before) {
		content: attr(data-placeholder);
		float: left;
		color: var(--color-ink-3);
		pointer-events: none;
		height: 0;
		font-style: italic;
	}

	/* Selection */
	:global(.editor-content .ProseMirror ::selection) {
		background-color: color-mix(in srgb, var(--color-bone) 20%, transparent);
	}

	/* Headings */
	:global(.editor-content .ProseMirror h1) {
		font-family: var(--font-display);
		font-size: 1.875rem;
		font-weight: 500;
		color: var(--color-ink);
		margin-top: 2.25rem;
		margin-bottom: 0.875rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--color-rule);
		line-height: 1.25;
	}
	:global(.editor-content .ProseMirror h1:first-child) {
		margin-top: 0;
	}
	:global(.editor-content .ProseMirror h2) {
		font-family: var(--font-display);
		font-size: 1.375rem;
		font-weight: 500;
		color: var(--color-ink);
		margin-top: 2rem;
		margin-bottom: 0.625rem;
		line-height: 1.3;
	}
	:global(.editor-content .ProseMirror h3) {
		font-size: 0.6875rem;
		font-weight: 600;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-ink-3);
		margin-top: 1.75rem;
		margin-bottom: 0.625rem;
	}

	/* Paragraph */
	:global(.editor-content .ProseMirror p) {
		margin-bottom: 0.875rem;
		color: var(--color-ink-2);
	}
	:global(.editor-content .ProseMirror p:last-child) {
		margin-bottom: 0;
	}

	/* Strong / Em */
	:global(.editor-content .ProseMirror strong) {
		font-weight: 600;
		color: var(--color-ink);
	}
	:global(.editor-content .ProseMirror em) {
		font-style: italic;
		color: var(--color-ink-2);
	}

	/* Lists */
	:global(.editor-content .ProseMirror ul) {
		list-style: none;
		padding-left: 1.25rem;
		margin-bottom: 0.875rem;
	}
	:global(.editor-content .ProseMirror ul li::before) {
		content: '—';
		position: absolute;
		margin-left: -1.25rem;
		color: var(--color-ink-3);
	}
	:global(.editor-content .ProseMirror ul li) {
		position: relative;
		margin-bottom: 0.3rem;
		color: var(--color-ink-2);
	}
	:global(.editor-content .ProseMirror ol) {
		list-style: decimal;
		padding-left: 1.5rem;
		margin-bottom: 0.875rem;
	}
	:global(.editor-content .ProseMirror ol li) {
		margin-bottom: 0.3rem;
		color: var(--color-ink-2);
	}
	:global(.editor-content .ProseMirror li > p) {
		margin-bottom: 0;
	}

	/* Blockquote */
	:global(.editor-content .ProseMirror blockquote) {
		border-left: 2px solid var(--color-bone);
		padding-left: 1.25rem;
		margin: 1.25rem 0;
		font-family: var(--font-display);
		font-style: italic;
		font-size: 1.125rem;
		color: var(--color-ink-3);
		line-height: 1.6;
	}
	:global(.editor-content .ProseMirror blockquote p) {
		color: inherit;
		margin-bottom: 0;
	}

	/* Inline code */
	:global(.editor-content .ProseMirror code) {
		font-family: var(--font-mono);
		font-size: 0.875em;
		background-color: var(--color-panel-2);
		color: var(--color-bone);
		padding: 0.1rem 0.35rem;
		border-radius: 2px;
	}

	/* Code block */
	:global(.editor-content .ProseMirror pre) {
		background-color: var(--color-panel);
		border: 1px solid var(--color-rule);
		padding: 1.25rem 1.5rem;
		margin: 1.25rem 0;
		overflow-x: auto;
	}
	:global(.editor-content .ProseMirror pre code) {
		background: none;
		padding: 0;
		font-size: 0.875rem;
		color: var(--color-ink-2);
		border-radius: 0;
	}

	/* Horizontal rule */
	:global(.editor-content .ProseMirror hr) {
		border: none;
		border-top: 1px solid var(--color-rule-2);
		margin: 2rem 0;
	}
</style>
