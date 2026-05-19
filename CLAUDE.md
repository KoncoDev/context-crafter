# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server at http://localhost:5173
npm run build        # Build for production (adapter selected by DEPLOY_TARGET env var)
npm run preview      # Preview the production build
npm run check        # Type-check with svelte-check
npm run check:watch  # Type-check in watch mode
```

## Environment Setup

Copy `.env.example` to `.env` and fill in:

```
PUBLIC_POCKETBASE_URL=https://your-pb-instance.com
DEPLOY_TARGET=cloudflare   # or 'vercel'
ENABLE_POCKETBASE=true

# N8N Webhook URLs (server-side only)
N8N_WEBHOOK_STEP1=https://...
N8N_WEBHOOK_STEP2=https://...
N8N_WEBHOOK_STEP3=https://...
N8N_WEBHOOK_STEP4=https://...
N8N_WEBHOOK_STEP5=https://...
```

## What this project is

**Context Crafter** is an internal tool for managing a 5-step AI pipeline that generates persona-targeted landing page content variants from raw product/service data.

Pipeline steps:
1. **Fact Extractor** — raw data → master source markdown (`master_source`)
2. **Persona Generator** — master source + areas + count → variant records (JSON persona profiles)
3. **Local Marketing Researcher** *(per variant)* — internet-enriched dynamic context
4. **Lead Conversion Architect** *(per variant)* — UX psychology, SEO metadata, messaging matrix
5. **UX/Brand Design Architect** *(per variant)* — branding narrative, design tokens, asset logic

Each step is triggered via N8N webhook. N8N responds 200 immediately; AI agent nodes write results back to PocketBase asynchronously. The user reviews/edits AI output at each validation gate before triggering the next step.

## Architecture

**Stack:** SvelteKit 2 + Svelte 5 Runes + PocketBase + Tailwind CSS v4 + TypeScript.  
**Pattern:** Backend-for-Frontend (BFF) — all DB access flows through SvelteKit server routes; the browser never talks directly to PocketBase except via `clientOnlyPb`.

### PocketBase instances — the "Shared State" rule

This is the most critical safety constraint in the project:

| Context | What to use | Why |
|---|---|---|
| `.server.ts` files | `event.locals.pb` | Fresh instance per request; prevents cross-user data leaks |
| `.svelte` / client `.ts` files | `import { clientOnlyPb } from '$lib/db/pocketbase'` | Browser singleton that holds the user session |

- **Never** import `clientOnlyPb` in any `.server.ts` file.
- **Never** call `createInstance()` outside of `hooks.server.ts`.
- `clientOnlyPb` is `undefined` on the server by design — use `if (clientOnlyPb)` guards.

### PocketBase collections

| Collection | Purpose |
|---|---|
| `projects` | One record per pipeline run. Status drives the UI. |
| `variants` | One per persona × area combination. Steps 3–5 run independently per variant. |

Both collections require API rules set to `@request.auth.id != ""` in the PocketBase admin to allow authenticated users access.

### Status machines

**Project:** `draft` → `extracting_master` → `pending_master_validation` → `generating_personas` → `pending_persona_validation` → `processing_variants` → `completed` / `error`

**Variant:** `draft` → `researching` → `pending_research_validation` → `architecting` → `pending_architect_validation` → `designing` → `pending_final_validation` → `completed`

AI-processing states (`extracting_master`, `generating_personas`, `researching`, `architecting`, `designing`) have a pulsing indicator in the UI. When PocketBase realtime pushes a transition *away* from one of these states, the client calls `invalidateAll()` to reload server data.

### Route groups and access control

| Route | Purpose | Auth |
|---|---|---|
| `src/routes/(public)/` | Root redirect only (`/` → `/app` or `/login`) | Public |
| `src/routes/app/` | Full pipeline UI | Requires `locals.user` |
| `src/routes/admin/` | Admin area (reserved) | Requires `locals.user.role === 'admin'` |
| `src/routes/login/` | Auth form | Public |
| `src/routes/logout/` | POST endpoint — clears session | Public |

Route protection is enforced in `+layout.server.ts` via redirect — see `src/routes/app/+layout.server.ts`.

### Auth state (Svelte 5)

`src/lib/auth.svelte.ts` is the gold standard for global state:
- `AuthState` class uses `$state()` for reactivity.
- Initialized from server data in the root `+layout.svelte` via `setAuthContext(data.user)`.
- Consumed anywhere with `getAuthContext()`.
- State files must end in `.svelte.ts`.

### Svelte 5 Runes — required patterns

- Use `$state()`, `$derived()`, `$effect()` exclusively. Legacy stores (`writable`, `readable`) are forbidden for new logic.
- Global state: encapsulate in a class in a `.svelte.ts` file, pass via `setContext`/`getContext`.
- Svelte 5 snippets: defined with `{#snippet name(param)}`, called with `{@render name(value)}` — not usable as `<ComponentName />` tags.

### Styling

- Tailwind v4: use `@import "tailwindcss";` in CSS (see `src/app.css`). Do **not** use `@tailwind` directives.
- All app routes use a dark theme (`bg-gray-950` base, `bg-gray-900` cards, `border-gray-800` borders, `indigo-*` accent).
- Use shadcn-svelte components for standard UI where available.

### Forms & validation

Every form submission must follow this pattern:
1. Define a Zod schema.
2. Use `zod4 as zod` from `sveltekit-superforms/adapters` (NOT the standard `zod` adapter — project uses Zod v4).
3. `superValidate(request, zod(schema))` in the server action.
4. `if (!form.valid) return fail(...)`.
5. Execute DB logic, `return { form }` or `return message(form, '...')`.

On the client, use `zod4Client as zodClient` from `sveltekit-superforms/adapters`.

### Deployment adapter

`svelte.config.js` reads `DEPLOY_TARGET` at build time to select either `@sveltejs/adapter-cloudflare` (default) or `@sveltejs/adapter-vercel`.

## Context folder

`/context/` is **read-only input** — brand identity, prototype HTML, content copy, and data models. When implementing features, read from here instead of inventing content.

- `context/brand.json` — colors, typography, tone, SEO defaults
- `context/landing/prototype.html` — reference markup for the public landing page

## Key files

- `src/hooks.server.ts` — only place `createInstance()` is called; handles auth cookie on every request
- `src/lib/config/site.ts` — site metadata (name: "Context Crafter")
- `src/lib/config/pipeline.ts` — status config: labels, colors, `isAIProcessing` flags for both status machines
- `src/lib/types/pipeline.ts` — TypeScript interfaces: `Project`, `Variant`, `VariantProfileData`, all status union types
- `src/lib/db/pocketbase.ts` — exports `createInstance` (server) and `clientOnlyPb` (browser)
- `src/lib/auth.svelte.ts` — canonical global state pattern
- `src/lib/components/pipeline/StatusBadge.svelte` — animated status pill used throughout the pipeline UI
- `.agent/rules/project-architecture-and-safety-rules-guide.md` — full architectural ruleset
