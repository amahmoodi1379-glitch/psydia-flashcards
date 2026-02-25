-- 1. Add telegram_username column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_username TEXT;

-- 2. Update get_admin_users_page to include telegram_username and search by it
CREATE OR REPLACE FUNCTION public.get_admin_users_page(
  _page integer DEFAULT 1,
  _page_size integer DEFAULT 20,
  _search text DEFAULT NULL
)
RETURNS TABLE(
  rows jsonb,
  total_count bigint,
  stats_last_refreshed_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_page integer := GREATEST(COALESCE(_page, 1), 1);
  v_page_size integer := LEAST(GREATEST(COALESCE(_page_size, 20), 1), 100);
  v_search text := NULLIF(BTRIM(_search), '');
  v_stats_refreshed_at timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = v_user_id
      AND ur.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Get the last refresh time of the materialized view
  SELECT pg_stat_get_last_analyze_time(c.oid)
  INTO v_stats_refreshed_at
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'user_attempt_stats_mv';

  RETURN QUERY
  WITH filtered_users AS (
    SELECT p.id, p.display_name, p.telegram_id, p.telegram_username, p.created_at, p.updated_at
    FROM profiles p
    WHERE v_search IS NULL
       OR p.display_name ILIKE '%' || v_search || '%'
       OR p.telegram_id ILIKE '%' || v_search || '%'
       OR p.telegram_username ILIKE '%' || v_search || '%'
  ),
  users_with_total AS (
    SELECT fu.*, COUNT(*) OVER() AS total_count
    FROM filtered_users fu
  ),
  paged_users AS (
    SELECT *
    FROM users_with_total
    ORDER BY created_at DESC
    LIMIT v_page_size
    OFFSET (v_page - 1) * v_page_size
  ),
  mv_stats AS (
    SELECT
      pu.id AS user_id,
      mv.attempt_count,
      mv.correct_count
    FROM paged_users pu
    LEFT JOIN public.user_attempt_stats_mv mv ON mv.user_id = pu.id
  ),
  missing_mv_users AS (
    SELECT ms.user_id
    FROM mv_stats ms
    WHERE ms.attempt_count IS NULL
  ),
  attempt_stats_live AS (
    SELECT al.user_id,
           COUNT(*)::bigint AS attempt_count,
           COUNT(*) FILTER (WHERE al.is_correct = true)::bigint AS correct_count
    FROM missing_mv_users mmu
    JOIN attempt_logs al ON al.user_id = mmu.user_id
    GROUP BY al.user_id
  ),
  attempt_stats AS (
    SELECT
      ms.user_id,
      COALESCE(ms.attempt_count, asl.attempt_count, 0)::bigint AS attempt_count,
      COALESCE(ms.correct_count, asl.correct_count, 0)::bigint AS correct_count
    FROM mv_stats ms
    LEFT JOIN attempt_stats_live asl ON asl.user_id = ms.user_id
  )
  SELECT
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', pu.id,
          'display_name', pu.display_name,
          'telegram_id', pu.telegram_id,
          'telegram_username', pu.telegram_username,
          'created_at', pu.created_at,
          'updated_at', pu.updated_at,
          'attempt_count', COALESCE(ast.attempt_count, 0),
          'correct_count', COALESCE(ast.correct_count, 0),
          'is_admin', EXISTS (
            SELECT 1
            FROM user_roles ur
            WHERE ur.user_id = pu.id
              AND ur.role = 'admin'
          ),
          'subscription', CASE
            WHEN s.user_id IS NULL THEN NULL
            ELSE jsonb_build_object(
              'plan', s.plan,
              'expires_at', s.expires_at,
              'is_active', s.is_active,
              'duration', s.duration
            )
          END
        )
        ORDER BY pu.created_at DESC
      ),
      '[]'::jsonb
    ) AS rows,
    COALESCE(MAX(pu.total_count), 0)::bigint AS total_count,
    v_stats_refreshed_at AS stats_last_refreshed_at
  FROM paged_users pu
  LEFT JOIN attempt_stats ast ON ast.user_id = pu.id
  LEFT JOIN subscriptions s ON s.user_id = pu.id;
END;
$$;

-- 3. Update get_table_storage_report to include more important tables
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
    AND c.relkind = 'r'
    AND c.relname IN (
      'attempt_logs',
      'user_question_state',
      'weekly_leaderboard',
      'monthly_leaderboard',
      'profiles',
      'questions',
      'question_reports',
      'subscriptions',
      'daily_usage'
    )
  ORDER BY pg_total_relation_size(c.oid) DESC;
$$;

-- 4. Update handle_new_user trigger to also store telegram_username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, telegram_id, telegram_username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', 'کاربر'),
    NEW.raw_user_meta_data ->> 'telegram_id',
    NEW.raw_user_meta_data ->> 'telegram_username',
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;
