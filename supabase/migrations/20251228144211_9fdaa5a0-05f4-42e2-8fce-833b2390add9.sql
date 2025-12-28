-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule weekly cleanup every Sunday at 3:00 AM UTC
SELECT cron.schedule(
  'weekly-cleanup-old-data',
  '0 3 * * 0',
  $$
  SELECT
    net.http_post(
        url:='https://ndqqudhrcrbydxjqkddr.supabase.co/functions/v1/cleanup-old-data',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kcXF1ZGhyY3JieWR4anFrZGRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2ODI2NDQsImV4cCI6MjA4MjI1ODY0NH0.IH3gCs-WgapVzPtresF-GI5xbDn7JTNSnV-2NYiyELc"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);