# get_admin_users_page EXPLAIN ANALYZE baseline

## Query used

```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT *
FROM public.get_admin_users_page(1, 20, NULL);
```

## Current optimization notes

- `attempt_stats` no longer aggregates against all `attempt_logs` rows.
- Live aggregation is constrained to `missing_mv_users` (subset of `paged_users` that have no row in `user_attempt_stats_mv`).
- Primary access path for fallback aggregation is now indexed by `attempt_logs.user_id` via:
  - `idx_attempt_logs_user_id`
  - `idx_attempt_logs_user_is_correct`

## EXPLAIN ANALYZE status in this container

- Status: Not executed in this container.
- Reason: `psql` / Supabase CLI are not installed, so there is no SQL client to run `EXPLAIN ANALYZE`.

## Run in DB environment

```bash
psql "$DATABASE_URL" -c "EXPLAIN (ANALYZE, BUFFERS, VERBOSE) SELECT * FROM public.get_admin_users_page(1, 20, NULL);"
```

## What to verify in the plan

1. `attempt_stats_live` only scans rows for user IDs emitted from `missing_mv_users`.
2. `attempt_logs` access uses `Index Scan` / `Bitmap Index Scan` on `idx_attempt_logs_user_id` (or the composite index with `user_id` leading).
3. Execution time remains stable as total `attempt_logs` size grows, with sensitivity primarily to `_page_size` and count of missing MV rows.
