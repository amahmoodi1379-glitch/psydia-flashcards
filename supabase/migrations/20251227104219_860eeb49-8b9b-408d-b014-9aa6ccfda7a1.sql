-- Function to get user profile stats (total answered, accuracy, streak)
CREATE OR REPLACE FUNCTION public.get_user_profile_stats(_user_id uuid)
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
  v_display_name text;
  v_total bigint;
  v_correct bigint;
  v_streak integer := 0;
  v_current_date date;
  v_last_activity_date date;
  v_check_date date;
BEGIN
  -- Get display name
  SELECT p.display_name INTO v_display_name
  FROM profiles p
  WHERE p.id = _user_id;

  -- Get total and correct counts
  SELECT COUNT(*), COUNT(*) FILTER (WHERE is_correct)
  INTO v_total, v_correct
  FROM attempt_logs
  WHERE user_id = _user_id;

  -- Calculate streak
  v_current_date := CURRENT_DATE;
  
  -- Get distinct activity dates ordered descending
  FOR v_last_activity_date IN
    SELECT DISTINCT DATE(created_at) as activity_date
    FROM attempt_logs
    WHERE user_id = _user_id
    ORDER BY activity_date DESC
  LOOP
    v_check_date := v_current_date - v_streak;
    
    IF v_last_activity_date = v_check_date THEN
      v_streak := v_streak + 1;
    ELSIF v_streak = 0 AND v_last_activity_date = v_current_date - 1 THEN
      -- Allow streak to start from yesterday
      v_streak := 1;
      v_current_date := v_current_date - 1;
    ELSE
      EXIT;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_total, v_correct, v_streak, COALESCE(v_display_name, 'کاربر');
END;
$$;

-- Function to get subject progress for a user
CREATE OR REPLACE FUNCTION public.get_subject_progress(_user_id uuid)
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
  WITH subject_questions AS (
    SELECT 
      s.id as subject_id,
      s.title as subject_name,
      s.display_order,
      q.id as question_id
    FROM subjects s
    JOIN topics t ON t.subject_id = s.id
    JOIN subtopics st ON st.topic_id = t.id
    JOIN questions q ON q.subtopic_id = st.id AND q.is_active = true
  ),
  user_answered AS (
    SELECT question_id
    FROM user_question_state
    WHERE user_id = _user_id
  )
  SELECT 
    sq.subject_name,
    COUNT(DISTINCT ua.question_id) as answered_count,
    COUNT(DISTINCT sq.question_id) as total_count
  FROM subject_questions sq
  LEFT JOIN user_answered ua ON ua.question_id = sq.question_id
  GROUP BY sq.subject_id, sq.subject_name, sq.display_order
  ORDER BY sq.display_order;
$$;

-- Function to get subtopic mastery for a user
CREATE OR REPLACE FUNCTION public.get_subtopic_mastery(_user_id uuid)
RETURNS TABLE (
  subtopic_name text,
  mastery_score integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH subtopic_data AS (
    SELECT 
      st.id as subtopic_id,
      st.title as subtopic_name,
      st.display_order
    FROM subtopics st
  ),
  user_mastery AS (
    SELECT 
      q.subtopic_id,
      ROUND(AVG((uqs.box_number::float / 7) * 100))::integer as avg_mastery
    FROM user_question_state uqs
    JOIN questions q ON q.id = uqs.question_id AND q.is_active = true
    WHERE uqs.user_id = _user_id
    GROUP BY q.subtopic_id
  )
  SELECT 
    sd.subtopic_name,
    COALESCE(um.avg_mastery, 0) as mastery_score
  FROM subtopic_data sd
  LEFT JOIN user_mastery um ON um.subtopic_id = sd.subtopic_id
  ORDER BY sd.display_order;
$$;

-- Function to get weekly activity
CREATE OR REPLACE FUNCTION public.get_weekly_activity(_user_id uuid)
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
    DATE(created_at) as activity_date,
    COUNT(*) as activity_count
  FROM attempt_logs
  WHERE user_id = _user_id
    AND created_at >= CURRENT_DATE - INTERVAL '6 days'
  GROUP BY DATE(created_at)
  ORDER BY activity_date;
$$;