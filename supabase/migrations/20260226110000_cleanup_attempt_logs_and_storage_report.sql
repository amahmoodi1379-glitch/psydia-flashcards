-- Keep index that supports time-range purges by user
CREATE INDEX IF NOT EXISTS idx_attempt_logs_created
ON public.attempt_logs(user_id, created_at);

-- Monitoring query for admin dashboard and cron report
CREATE OR REPLACE FUNCTION public.get_table_storage_report()
RETURNS TABLE(
  table_name text,
  row_estimate bigint,
  total_size_pretty text,
  total_size_bytes bigint,
  table_size_pretty text,
  index_size_pretty text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    c.relname::text AS table_name,
    COALESCE(s.n_live_tup, 0)::bigint AS row_estimate,
    pg_size_pretty(pg_total_relation_size(c.oid))::text AS total_size_pretty,
    pg_total_relation_size(c.oid)::bigint AS total_size_bytes,
    pg_size_pretty(pg_relation_size(c.oid))::text AS table_size_pretty,
    pg_size_pretty(pg_indexes_size(c.oid))::text AS index_size_pretty
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
  WHERE n.nspname = 'public'
    AND c.relname IN ('attempt_logs', 'user_question_state', 'weekly_leaderboard', 'monthly_leaderboard')
  ORDER BY pg_total_relation_size(c.oid) DESC;
$$;

-- Extend scheduled cleanup with attempt_logs retention and storage report
CREATE OR REPLACE FUNCTION public.run_weekly_cleanup()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_daily_usage_count integer := 0;
  deleted_attempt_logs_count integer := 0;
  deactivated_subscriptions_count integer := 0;
  storage_report jsonb := '[]'::jsonb;
BEGIN
  -- 1. Delete old daily_usage records (older than 7 days)
  DELETE FROM public.daily_usage
  WHERE usage_date < CURRENT_DATE - INTERVAL '7 days';

  GET DIAGNOSTICS deleted_daily_usage_count = ROW_COUNT;

  -- 2. Keep attempt logs for 180 days (free-tier friendly)
  DELETE FROM public.attempt_logs
  WHERE created_at < now() - INTERVAL '180 days';

  GET DIAGNOSTICS deleted_attempt_logs_count = ROW_COUNT;

  -- 3. Deactivate expired subscriptions
  UPDATE public.subscriptions
  SET is_active = false
  WHERE expires_at < now()
    AND is_active = true;

  GET DIAGNOSTICS deactivated_subscriptions_count = ROW_COUNT;

  -- 4. Include storage snapshot for cron monitoring
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'table_name', report.table_name,
        'row_estimate', report.row_estimate,
        'total_size_pretty', report.total_size_pretty,
        'total_size_bytes', report.total_size_bytes,
        'table_size_pretty', report.table_size_pretty,
        'index_size_pretty', report.index_size_pretty
      )
      ORDER BY report.total_size_bytes DESC
    ),
    '[]'::jsonb
  )
  INTO storage_report
  FROM public.get_table_storage_report() AS report;

  RETURN jsonb_build_object(
    'daily_usage_deleted', deleted_daily_usage_count,
    'attempt_logs_deleted', deleted_attempt_logs_count,
    'attempt_logs_retention_days', 180,
    'subscriptions_deactivated', deactivated_subscriptions_count,
    'table_storage_report', storage_report,
    'executed_at', now()
  );
END;
$$;
