-- Enable required extension for scheduler
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- SQL-based cleanup procedure to avoid project-specific URLs and hardcoded tokens
CREATE OR REPLACE FUNCTION public.run_weekly_cleanup()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_daily_usage_count integer := 0;
  deactivated_subscriptions_count integer := 0;
BEGIN
  -- 1. Delete old daily_usage records (older than 7 days)
  DELETE FROM public.daily_usage
  WHERE usage_date < CURRENT_DATE - INTERVAL '7 days';

  GET DIAGNOSTICS deleted_daily_usage_count = ROW_COUNT;

  -- 2. Deactivate expired subscriptions
  UPDATE public.subscriptions
  SET is_active = false
  WHERE expires_at < now()
    AND is_active = true;

  GET DIAGNOSTICS deactivated_subscriptions_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'daily_usage_deleted', deleted_daily_usage_count,
    'subscriptions_deactivated', deactivated_subscriptions_count,
    'executed_at', now()
  );
END;
$$;

-- Schedule weekly cleanup every Sunday at 3:00 AM UTC
SELECT cron.schedule(
  'weekly-cleanup-old-data',
  '0 3 * * 0',
  $$
  SELECT public.run_weekly_cleanup();
  $$
);
