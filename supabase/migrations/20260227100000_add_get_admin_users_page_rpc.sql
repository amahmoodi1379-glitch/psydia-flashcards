-- Optimize admin user page aggregations and prepare high-volume stats path
CREATE INDEX IF NOT EXISTS idx_attempt_logs_user_is_correct
ON public.attempt_logs(user_id, is_correct);

CREATE INDEX IF NOT EXISTS idx_attempt_logs_user_id
ON public.attempt_logs(user_id);

CREATE MATERIALIZED VIEW IF NOT EXISTS public.user_attempt_stats_mv
AS
SELECT
  al.user_id,
  COUNT(*)::bigint AS attempt_count,
  COUNT(*) FILTER (WHERE al.is_correct = true)::bigint AS correct_count,
  MAX(al.created_at) AS last_attempt_at
FROM public.attempt_logs al
GROUP BY al.user_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_attempt_stats_mv_user_id
ON public.user_attempt_stats_mv(user_id);

CREATE OR REPLACE FUNCTION public.refresh_user_attempt_stats_mv()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_attempt_stats_mv;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_users_page(
  _page integer DEFAULT 1,
  _page_size integer DEFAULT 20,
  _search text DEFAULT NULL
)
RETURNS TABLE(
  rows jsonb,
  total_count bigint
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

  RETURN QUERY
  WITH filtered_users AS (
    SELECT p.id, p.display_name, p.telegram_id, p.created_at, p.updated_at
    FROM profiles p
    WHERE v_search IS NULL
       OR p.display_name ILIKE '%' || v_search || '%'
       OR p.telegram_id ILIKE '%' || v_search || '%'
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
  -- First read pre-aggregated stats (materialized view).
  mv_stats AS (
    SELECT
      pu.id AS user_id,
      mv.attempt_count,
      mv.correct_count
    FROM paged_users pu
    LEFT JOIN public.user_attempt_stats_mv mv ON mv.user_id = pu.id
  ),
  -- Fallback live aggregation constrained to users missing MV rows.
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
    COALESCE(MAX(pu.total_count), 0)::bigint AS total_count
  FROM paged_users pu
  LEFT JOIN attempt_stats ast ON ast.user_id = pu.id
  LEFT JOIN subscriptions s ON s.user_id = pu.id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_users_page(integer, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_users_page(integer, integer, text) TO authenticated;

REVOKE ALL ON FUNCTION public.refresh_user_attempt_stats_mv() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_user_attempt_stats_mv() TO service_role;
