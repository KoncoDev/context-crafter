# context/ (Project Inputs)

This folder contains **project-specific inputs** to build the app.
Treat it as **read-only** source material.

## What’s inside

- brand.json
  - Brand identity: name, tone, colors, typography, CTAs, SEO defaults

- landing/
  - prototype.html      → single-file landing page reference (public)
  - content.md          → copy for landing page sections
  - assets/             → logos, images, icons used by landing + app

- app/
  - models.md           → data model definitions (users/roles)
  - flows.md            → user/admin workflows (screens + actions)
  - seed.json (optional)→ initial sample content for PB + UI

## Agent usage hint (non-binding)
When implementing, **read from context/** instead of inventing content unless otherwise specified by the user.
