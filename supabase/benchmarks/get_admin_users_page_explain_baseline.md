# get_admin_users_page EXPLAIN ANALYZE baseline

## Query used

```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT *
FROM public.get_admin_users_page(1, 20, NULL);
```

## Baseline

- Status: Not executed in this container.
- Reason: `psql` / Supabase CLI are not installed, so there is no database client available to run `EXPLAIN ANALYZE` from this environment.
- Next step in DB environment:

```bash
psql "$DATABASE_URL" -c "EXPLAIN (ANALYZE, BUFFERS, VERBOSE) SELECT * FROM public.get_admin_users_page(1, 20, NULL);"
```

Capture and store:
- Planning Time
- Execution Time
- Shared/Local buffer hits/reads
- Node with max actual time (likely aggregate/join)
