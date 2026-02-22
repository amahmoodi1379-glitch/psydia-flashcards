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
  attempt_stats AS (
    SELECT al.user_id,
           COUNT(*)::bigint AS attempt_count,
           COUNT(*) FILTER (WHERE al.is_correct = true)::bigint AS correct_count
    FROM attempt_logs al
    GROUP BY al.user_id
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
