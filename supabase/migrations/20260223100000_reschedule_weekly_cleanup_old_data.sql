-- Ensure scheduler extension exists
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Unschedule any existing version of the weekly cleanup job
DO $$
DECLARE
  scheduled_job_id bigint;
BEGIN
  FOR scheduled_job_id IN
    SELECT jobid
    FROM cron.job
    WHERE jobname = 'weekly-cleanup-old-data'
  LOOP
    PERFORM cron.unschedule(scheduled_job_id);
  END LOOP;
END;
$$;

-- Recreate the job using the portable SQL-based cleanup function
SELECT cron.schedule(
  'weekly-cleanup-old-data',
  '0 3 * * 0',
  $$
  SELECT public.run_weekly_cleanup();
  $$
);
