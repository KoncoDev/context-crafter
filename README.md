# Context Crafter

Internal tool for generating persona-targeted landing page content variants through a human-in-the-loop AI pipeline.

## What it does

Takes raw product/service text and runs it through a 5-step AI pipeline (via N8N + AI agent nodes) with a human validation gate at each step. The final output is structured branding and design directives — one set per persona × geographic area — consumed by the frontend team to build PPC/SEO landing pages.

### Pipeline steps

| Step | Name | Input → Output |
|------|------|----------------|
| 1 | Fact Extractor | Raw data → master source markdown |
| 2 | Persona Generator | Master source + areas + count → variant records |
| 3 | Local Marketing Researcher | Variant profile → internet-enriched context |
| 4 | Lead Conversion Architect | Research data → UX psychology, SEO metadata, messaging matrix |
| 5 | UX/Brand Design Architect | Architecture data → branding narrative, design tokens, asset logic |

Steps 1–2 run at the project level. Steps 3–5 run independently per variant (persona × area).

## Stack

- **SvelteKit 2** + Svelte 5 Runes + TypeScript
- **PocketBase** — auth, database, realtime subscriptions
- **N8N** — webhook orchestration for AI agent steps
- **Tailwind CSS v4**
- **sveltekit-superforms** + **Zod v4**

## Getting started

### Prerequisites

- Node.js 22+
- A running [PocketBase](https://pocketbase.io/) instance
- An N8N instance with the 5 pipeline workflows configured

### Installation

```bash
git clone <repo-url> context-crafter
cd context-crafter
npm install
```

### Environment

```bash
cp .env.example .env
```

Fill in `.env`:

```
PUBLIC_POCKETBASE_URL=https://your-pb-instance.com
DEPLOY_TARGET=cloudflare   # or 'vercel'
ENABLE_POCKETBASE=true

N8N_WEBHOOK_STEP1=https://your-n8n/webhook/step1
N8N_WEBHOOK_STEP2=https://your-n8n/webhook/step2
N8N_WEBHOOK_STEP3=https://your-n8n/webhook/step3
N8N_WEBHOOK_STEP4=https://your-n8n/webhook/step4
N8N_WEBHOOK_STEP5=https://your-n8n/webhook/step5
```

### PocketBase setup

Create two collections in the PocketBase admin:

**`projects`**
| Field | Type |
|-------|------|
| `name` | text |
| `raw_data` | text |
| `target_language` | select (`french`, `english`, `arabic`) |
| `master_source` | text |
| `status` | text |

**`variants`**
| Field | Type |
|-------|------|
| `project` | relation → projects |
| `variant_profile_data` | json |
| `researching_data` | json |
| `architecting_data` | json |
| `designing_data` | json |
| `status` | text |

Set API rules on both collections to `@request.auth.id != ""` for all operations (List, View, Create, Update, Delete).

### Run locally

```bash
npm run dev
```

Visit `http://localhost:5173`. Sign in with a PocketBase user account.

## Deployment

```bash
# Cloudflare Pages / Workers
DEPLOY_TARGET=cloudflare npm run build

# Vercel
DEPLOY_TARGET=vercel npm run build
```

## Architecture notes

This project follows a strict **BFF (Backend for Frontend)** pattern — the browser never talks directly to PocketBase except through a client-side singleton for realtime subscriptions.

See `CLAUDE.md` for full architectural rules and the PocketBase shared-state safety protocol.
