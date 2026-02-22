# Psydia Flashcards

A React + TypeScript web app for exam practice, review, and progress tracking with Supabase-backed auth/data.

## Tech Stack

- React 18 + Vite 5
- TypeScript
- TanStack Query
- React Router
- Tailwind CSS + shadcn/ui
- Supabase

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Install

```bash
npm install
```

### Run in development

```bash
npm run dev
```

### Build production bundle

```bash
npm run build
```

## Available Scripts

- `npm run dev`: start Vite dev server
- `npm run build`: production build
- `npm run build:dev`: development-mode build
- `npm run lint`: run ESLint
- `npm run preview`: preview production build locally
- `npm run audit:imports`: print files in `src/` that are unreachable or unreferenced from app entrypoints
- `npm run check:unused`: detect unused imports/exports via the TypeScript-based audit script

## Project Structure

- `src/pages/`: route pages (exam, review, profile, auth, admin)
- `src/components/`: reusable UI and feature components
- `src/hooks/`: domain and data hooks
- `src/contexts/`: auth/theme providers
- `src/integrations/supabase/`: Supabase client/types
- `docs/ui-kit-inventory.md`: internal policy for the `template inventory` (archived shadcn/ui primitives in `src/components/ui-archive/`)

## Team Note: Template vs Production-Critical

### Template inventory (safe to keep as archive)

- `src/components/ui-archive/**`: shadcn/ui templates that are not imported by live product flows.
- `docs/ui-kit-inventory.md`: inventory policy and migration rule for moving templates back to active UI.

### Production-critical (must stay stable and covered by checks)

- `src/components/ui/**`: active UI primitives used by app pages/components.
- `src/pages/**`: route-level product experiences.
- `src/hooks/**`: data and business-flow hooks.
- `src/integrations/supabase/**` and `supabase/functions/**`: backend integration + edge logic.
- `.github/workflows/unused-check.yml`: CI guardrail preventing unused import/export/file buildup.

## Unused Code Guardrails

CI runs `.github/workflows/unused-check.yml` on push/PR and executes:

1. `npm run lint:unused`
2. `npm run check:unused`
3. `npm run audit:imports`

This keeps unused imports/exports/files from growing silently.

## Secure cron for `cleanup-old-data`

This endpoint is intended for server-to-server cron only.

### Final auth policy (single path)

`cleanup-old-data` uses **only cron secret auth**:

- Header: `x-cron-secret: <CLEANUP_CRON_SECRET>`
- Any other auth mechanism is ignored.

### Required Edge Function settings

- In `supabase/config.toml`, keep JWT verification disabled for this function:
  - `[functions.cleanup-old-data].verify_jwt = false`
- Configure both required secrets for the function runtime:
  - `SUPABASE_SERVICE_ROLE_KEY` (database access)
  - `CLEANUP_CRON_SECRET` (request authentication)

### Deployment checklist

1. Set secrets:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... CLEANUP_CRON_SECRET=... ATTEMPT_LOG_RETENTION_DAYS=180
```

2. Deploy function:

```bash
supabase functions deploy cleanup-old-data
```

3. Configure your scheduler to call `POST /functions/v1/cleanup-old-data` with the cron secret header:

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/cleanup-old-data" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: <CLEANUP_CRON_SECRET>"
```

Security notes for scheduler setup:
- Store `CLEANUP_CRON_SECRET` only in an encrypted secret manager (never inline in jobs).
- Restrict callers to cron infrastructure / trusted backend only.
- Rotate the cron secret immediately if exposure is suspected.

## Telegram auth deprecation note

- Telegram login/WebApp auth flow is fully removed from `src/` and Supabase Edge Functions.
- Deployment pipeline should only deploy active functions (currently `cleanup-old-data` in this repo).
- `profiles.telegram_id` is intentionally retained only for admin visibility/search and historical audit (see `supabase/migrations/20260301110000_keep_telegram_id_for_admin_audit.sql`).
