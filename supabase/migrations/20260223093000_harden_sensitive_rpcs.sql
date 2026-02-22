-- Harden sensitive RPCs by binding them to auth.uid() and tightening execute grants.

CREATE OR REPLACE FUNCTION public.get_user_profile_stats()
RETURNS TABLE (
  total_answered bigint,
  correct_count bigint,
  streak integer,
  display_name text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_display_name text;
  v_total bigint;
  v_correct bigint;
  v_streak integer := 0;
  v_current_date date;
  v_last_activity_date date;
  v_check_date date;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT p.display_name INTO v_display_name
  FROM profiles p
  WHERE p.id = v_user_id;

  SELECT COUNT(*), COUNT(*) FILTER (WHERE is_correct)
  INTO v_total, v_correct
  FROM attempt_logs
  WHERE user_id = v_user_id;

  v_current_date := CURRENT_DATE;

  FOR v_last_activity_date IN
    SELECT DISTINCT DATE(created_at) AS activity_date
    FROM attempt_logs
    WHERE user_id = v_user_id
    ORDER BY activity_date DESC
  LOOP
    v_check_date := v_current_date - v_streak;

    IF v_last_activity_date = v_check_date THEN
      v_streak := v_streak + 1;
    ELSIF v_streak = 0 AND v_last_activity_date = v_current_date - 1 THEN
      v_streak := 1;
      v_current_date := v_current_date - 1;
    ELSE
      EXIT;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_total, v_correct, v_streak, COALESCE(v_display_name, 'کاربر');
END;
$$;

CREATE OR REPLACE FUNCTION public.get_subject_progress()
RETURNS TABLE (
  subject_name text,
  answered_count bigint,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    sq.subject_name,
    COUNT(DISTINCT ua.question_id) AS answered_count,
    COUNT(DISTINCT sq.question_id) AS total_count
  FROM (
    SELECT
      s.id AS subject_id,
      s.title AS subject_name,
      s.display_order,
      q.id AS question_id
    FROM subjects s
    JOIN topics t ON t.subject_id = s.id
    JOIN subtopics st ON st.topic_id = t.id
    JOIN questions q ON q.subtopic_id = st.id AND q.is_active = true
  ) sq
  LEFT JOIN (
    SELECT question_id
    FROM user_question_state
    WHERE user_id = auth.uid()
  ) ua ON ua.question_id = sq.question_id
  WHERE auth.uid() IS NOT NULL
  GROUP BY sq.subject_id, sq.subject_name, sq.display_order
  ORDER BY sq.display_order;
$$;

CREATE OR REPLACE FUNCTION public.get_subtopic_mastery()
RETURNS TABLE (
  subtopic_name text,
  mastery_score integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    sd.subtopic_name,
    COALESCE(um.avg_mastery, 0) AS mastery_score
  FROM (
    SELECT
      st.id AS subtopic_id,
      st.title AS subtopic_name,
      st.display_order
    FROM subtopics st
  ) sd
  LEFT JOIN (
    SELECT
      q.subtopic_id,
      ROUND(AVG((LEAST(uqs.box_number, 7)::float / 7) * 100))::integer AS avg_mastery
    FROM user_question_state uqs
    JOIN questions q ON q.id = uqs.question_id AND q.is_active = true
    WHERE uqs.user_id = auth.uid()
    GROUP BY q.subtopic_id
  ) um ON um.subtopic_id = sd.subtopic_id
  WHERE auth.uid() IS NOT NULL
  ORDER BY sd.display_order;
$$;

CREATE OR REPLACE FUNCTION public.get_weekly_activity()
RETURNS TABLE (
  activity_date date,
  activity_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    DATE(created_at) AS activity_date,
    COUNT(*) AS activity_count
  FROM attempt_logs
  WHERE user_id = auth.uid()
    AND auth.uid() IS NOT NULL
    AND created_at >= CURRENT_DATE - INTERVAL '6 days'
  GROUP BY DATE(created_at)
  ORDER BY activity_date;
$$;

CREATE OR REPLACE FUNCTION public.get_frequently_wrong_questions()
RETURNS TABLE(question_id uuid, wrong_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    al.question_id,
    COUNT(*) AS wrong_count
  FROM attempt_logs al
  JOIN questions q ON q.id = al.question_id AND q.is_active = true
  WHERE al.user_id = auth.uid()
    AND auth.uid() IS NOT NULL
    AND al.is_correct = false
  GROUP BY al.question_id
  HAVING COUNT(*) >= 2
  ORDER BY wrong_count DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_extended_activity(_days integer)
RETURNS TABLE(activity_date date, activity_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    DATE(created_at) AS activity_date,
    COUNT(*) AS activity_count
  FROM attempt_logs
  WHERE user_id = auth.uid()
    AND auth.uid() IS NOT NULL
    AND created_at >= CURRENT_DATE - (_days || ' days')::interval
  GROUP BY DATE(created_at)
  ORDER BY activity_date;
$$;

CREATE OR REPLACE FUNCTION public.get_user_subscription()
RETURNS TABLE(
  plan subscription_plan,
  expires_at timestamp with time zone,
  is_active boolean,
  daily_limit integer,
  today_usage integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_today_usage integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT COALESCE(du.question_count, 0) INTO v_today_usage
  FROM daily_usage du
  WHERE du.user_id = v_user_id AND du.usage_date = CURRENT_DATE;

  RETURN QUERY
  SELECT
    COALESCE(s.plan, 'free'::subscription_plan) AS plan,
    s.expires_at,
    COALESCE(s.is_active AND (s.expires_at IS NULL OR s.expires_at > now()), true) AS is_active,
    COALESCE(s.daily_limit, 10) AS daily_limit,
    COALESCE(v_today_usage, 0) AS today_usage
  FROM profiles p
  LEFT JOIN subscriptions s ON s.user_id = p.id
  WHERE p.id = v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_daily_usage()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_current_usage integer;
  v_daily_limit integer;
  v_plan subscription_plan;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT
    COALESCE(s.plan, 'free'::subscription_plan),
    COALESCE(s.daily_limit, 10)
  INTO v_plan, v_daily_limit
  FROM profiles p
  LEFT JOIN subscriptions s ON s.user_id = p.id AND s.is_active = true
  WHERE p.id = v_user_id;

  IF v_plan IN ('basic', 'advanced', 'smart') THEN
    RETURN true;
  END IF;

  SELECT COALESCE(question_count, 0) INTO v_current_usage
  FROM daily_usage
  WHERE user_id = v_user_id AND usage_date = CURRENT_DATE;

  IF v_current_usage >= v_daily_limit THEN
    RETURN false;
  END IF;

  INSERT INTO daily_usage (user_id, usage_date, question_count)
  VALUES (v_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET question_count = daily_usage.question_count + 1;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_hierarchical_mastery()
RETURNS TABLE(
  subject_id uuid,
  subject_name text,
  subject_mastery integer,
  topic_id uuid,
  topic_name text,
  topic_mastery integer,
  subtopic_id uuid,
  subtopic_name text,
  subtopic_mastery integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id AS subject_id,
    s.title AS subject_name,
    COALESCE(AVG(um.mastery)::integer, 0) AS subject_mastery,
    t.id AS topic_id,
    t.title AS topic_name,
    COALESCE(AVG(um.mastery) FILTER (WHERE st.topic_id = t.id)::integer, 0) AS topic_mastery,
    st.id AS subtopic_id,
    st.title AS subtopic_name,
    COALESCE(um.mastery, 0) AS subtopic_mastery
  FROM subjects s
  JOIN topics t ON t.subject_id = s.id
  JOIN subtopics st ON st.topic_id = t.id
  LEFT JOIN (
    SELECT
      q.subtopic_id,
      ROUND(AVG((LEAST(uqs.box_number, 7)::float / 7) * 100))::integer AS mastery
    FROM user_question_state uqs
    JOIN questions q ON q.id = uqs.question_id AND q.is_active = true
    WHERE uqs.user_id = auth.uid()
    GROUP BY q.subtopic_id
  ) um ON um.subtopic_id = st.id
  WHERE auth.uid() IS NOT NULL
  GROUP BY s.id, s.title, s.display_order, t.id, t.title, t.display_order, st.id, st.title, st.display_order, um.mastery
  ORDER BY s.display_order, t.display_order, st.display_order;
$$;

CREATE OR REPLACE FUNCTION public.get_user_weekly_rank(p_week_start date DEFAULT NULL)
RETURNS TABLE(
  rank bigint,
  correct_count integer,
  total_count integer,
  score integer,
  accuracy numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.rank,
    r.correct_count,
    r.total_count,
    r.score,
    CASE WHEN r.total_count > 0
      THEN ROUND((r.correct_count::numeric / r.total_count) * 100, 1)
      ELSE 0
    END AS accuracy
  FROM (
    SELECT
      wl.user_id,
      ROW_NUMBER() OVER (ORDER BY wl.score DESC, wl.correct_count DESC) AS rank,
      wl.correct_count,
      wl.total_count,
      wl.score
    FROM weekly_leaderboard wl
    WHERE wl.week_start = COALESCE(p_week_start, date_trunc('week', CURRENT_DATE)::date)
  ) r
  WHERE r.user_id = auth.uid()
    AND auth.uid() IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.get_user_monthly_rank(p_month_start date DEFAULT NULL)
RETURNS TABLE(
  rank bigint,
  correct_count integer,
  total_count integer,
  score integer,
  accuracy numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.rank,
    r.correct_count,
    r.total_count,
    r.score,
    CASE WHEN r.total_count > 0
      THEN ROUND((r.correct_count::numeric / r.total_count) * 100, 1)
      ELSE 0
    END AS accuracy
  FROM (
    SELECT
      ml.user_id,
      ROW_NUMBER() OVER (ORDER BY ml.score DESC, ml.correct_count DESC) AS rank,
      ml.correct_count,
      ml.total_count,
      ml.score
    FROM monthly_leaderboard ml
    WHERE ml.month_start = COALESCE(p_month_start, date_trunc('month', CURRENT_DATE)::date)
  ) r
  WHERE r.user_id = auth.uid()
    AND auth.uid() IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.check_answer(
  _question_id uuid,
  _selected_index integer
)
RETURNS TABLE(
  is_correct boolean,
  correct_index integer,
  explanation text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_recent_attempts integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Lightweight anti-abuse throttling.
  SELECT COUNT(*) INTO v_recent_attempts
  FROM attempt_logs
  WHERE user_id = v_user_id
    AND created_at >= now() - interval '10 seconds';

  IF v_recent_attempts >= 60 THEN
    RAISE EXCEPTION 'Rate limit exceeded';
  END IF;

  RETURN QUERY
  SELECT
    (q.correct_index = _selected_index) AS is_correct,
    q.correct_index,
    q.explanation
  FROM questions q
  WHERE q.id = _question_id AND q.is_active = true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_answer(uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.check_answer(uuid, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_profile_stats() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_profile_stats() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_subject_progress() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_subject_progress() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_subtopic_mastery() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_subtopic_mastery() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_weekly_activity() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_weekly_activity() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_frequently_wrong_questions() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_frequently_wrong_questions() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_extended_activity(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_extended_activity(integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_subscription() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_subscription() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.increment_daily_usage() FROM anon;
GRANT EXECUTE ON FUNCTION public.increment_daily_usage() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_hierarchical_mastery() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_hierarchical_mastery() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_weekly_rank(date) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_weekly_rank(date) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_monthly_rank(date) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_monthly_rank(date) TO authenticated;
