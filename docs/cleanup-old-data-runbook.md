# Runbook: `cleanup-old-data` scheduler authentication

## Auth contract (authoritative)

This function accepts exactly one authentication method:

- `x-cron-secret: <CLEANUP_CRON_SECRET>`

It does **not** require JWTs from scheduler calls. `Authorization` headers are not part of the auth contract for this endpoint.

## Required function config

In `supabase/config.toml`:

- `[functions.cleanup-old-data].verify_jwt = false`

In Supabase Edge Function secrets:

- `SUPABASE_SERVICE_ROLE_KEY`
- `CLEANUP_CRON_SECRET`
- `ATTEMPT_LOG_RETENTION_DAYS` (optional, defaults to 180)

## Scheduler request example

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/cleanup-old-data" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: <CLEANUP_CRON_SECRET>"
```

## Response behavior (minimal / non-sensitive)

- Missing `x-cron-secret` → `401 {"error":"unauthorized"}`
- Wrong `x-cron-secret` → `403 {"error":"forbidden"}`

No sensitive authentication details are returned in either response.
