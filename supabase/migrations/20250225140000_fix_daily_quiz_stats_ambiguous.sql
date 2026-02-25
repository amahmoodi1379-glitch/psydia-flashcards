-- Fix ambiguous column reference in get_daily_quiz_stats
-- The RETURNS TABLE output column "correct_count" clashes with
-- daily_quiz_attempts.correct_count, causing PostgreSQL error 42702.
-- Fix: qualify all table column references with table alias "a".

CREATE OR REPLACE FUNCTION get_daily_quiz_stats()
RETURNS TABLE (
  has_completed boolean,
  correct_count smallint,
  total_count smallint,
  percentile numeric,
  total_participants bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today date := CURRENT_DATE;
  uid uuid := auth.uid();
  attempt record;
  worse_count bigint;
  total_count_val bigint;
BEGIN
  SELECT * INTO attempt
  FROM daily_quiz_attempts a
  WHERE a.user_id = uid AND a.quiz_date = today AND a.completed_at IS NOT NULL;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      false AS has_completed,
      0::smallint AS correct_count,
      10::smallint AS total_count,
      0::numeric AS percentile,
      0::bigint AS total_participants;
    RETURN;
  END IF;

  SELECT count(*) INTO total_count_val
  FROM daily_quiz_attempts a
  WHERE a.quiz_date = today AND a.completed_at IS NOT NULL;

  SELECT count(*) INTO worse_count
  FROM daily_quiz_attempts a
  WHERE a.quiz_date = today
    AND a.completed_at IS NOT NULL
    AND a.correct_count < attempt.correct_count;

  RETURN QUERY SELECT
    true AS has_completed,
    attempt.correct_count::smallint,
    attempt.total_count::smallint,
    CASE WHEN total_count_val > 0
      THEN round((worse_count::numeric / total_count_val) * 100)
      ELSE 0::numeric
    END AS percentile,
    total_count_val AS total_participants;
END;
$$;
