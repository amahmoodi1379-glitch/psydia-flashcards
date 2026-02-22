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
- `docs/ui-kit-inventory.md`: notes on intentionally retained shadcn/ui kit files

## Unused Code Guardrails

CI runs `.github/workflows/unused-check.yml` on push/PR and executes:

1. `npm run check:unused`
2. `npm run audit:imports`

This keeps unused imports/exports/files from growing silently.

## Secure cron for `cleanup-old-data`

This endpoint is intended for server-to-server cron only.

### Required Edge Function settings

- In `supabase/config.toml`, keep JWT verification enabled:
  - `[functions.cleanup-old-data].verify_jwt = true`
- Configure a shared secret in function env:
  - `CRON_SECRET=<strong-random-secret>`

### Allowed authentication methods

`cleanup-old-data` accepts one of these:

1. **Supabase service JWT** via `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`
2. **Cron secret** via `x-cron-secret: <CRON_SECRET>`

If no auth is provided, it returns `401`. If auth is present but invalid, it returns `403`.

### Deployment checklist

1. Set secrets:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... CRON_SECRET=... ATTEMPT_LOG_RETENTION_DAYS=180
```

2. Deploy function:

```bash
supabase functions deploy cleanup-old-data
```

3. Configure your scheduler to call `POST /functions/v1/cleanup-old-data` with either:
   - `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`, or
   - `x-cron-secret: <CRON_SECRET>`
