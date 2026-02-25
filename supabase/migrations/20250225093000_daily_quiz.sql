-- ============================================================
-- Daily Quiz Feature
-- A daily 10-question quiz from the entire question pool.
-- Completely isolated: no Leitner, no quota, no "seen" marking.
-- ============================================================

-- Store each day's quiz questions (generated once per day, shared by all users)
CREATE TABLE IF NOT EXISTS daily_quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_date date NOT NULL DEFAULT CURRENT_DATE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  display_order smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quiz_date, question_id),
  UNIQUE (quiz_date, display_order)
);

CREATE INDEX IF NOT EXISTS idx_daily_quiz_questions_date ON daily_quiz_questions(quiz_date);

-- Store each user's attempt for a given day
CREATE TABLE IF NOT EXISTS daily_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_date date NOT NULL DEFAULT CURRENT_DATE,
  correct_count smallint NOT NULL DEFAULT 0,
  total_count smallint NOT NULL DEFAULT 10,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, quiz_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_quiz_attempts_date ON daily_quiz_attempts(quiz_date);
CREATE INDEX IF NOT EXISTS idx_daily_quiz_attempts_user ON daily_quiz_attempts(user_id, quiz_date);

-- Enable RLS
ALTER TABLE daily_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Everyone can read today's quiz questions
CREATE POLICY "Anyone can read daily quiz questions"
  ON daily_quiz_questions FOR SELECT
  USING (true);

-- Users can read their own attempts
CREATE POLICY "Users can read own attempts"
  ON daily_quiz_attempts FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own attempt
CREATE POLICY "Users can insert own attempt"
  ON daily_quiz_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own attempt
CREATE POLICY "Users can update own attempt"
  ON daily_quiz_attempts FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- RPC: get_or_create_daily_quiz
-- Returns today's 10 quiz questions. If none exist for today,
-- generates them by picking 10 random active questions.
-- ============================================================
CREATE OR REPLACE FUNCTION get_or_create_daily_quiz()
RETURNS TABLE (
  question_id uuid,
  stem_text text,
  choices jsonb,
  display_order smallint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today date := CURRENT_DATE;
  quiz_count int;
BEGIN
  -- Check if today's quiz exists
  SELECT count(*) INTO quiz_count
  FROM daily_quiz_questions
  WHERE quiz_date = today;

  -- Generate if not exists
  IF quiz_count = 0 THEN
    INSERT INTO daily_quiz_questions (quiz_date, question_id, display_order)
    SELECT today, q.id, row_number() OVER (ORDER BY random())::smallint
    FROM questions q
    WHERE q.is_active = true
    ORDER BY random()
    LIMIT 10;
  END IF;

  -- Return today's questions
  RETURN QUERY
  SELECT
    dq.question_id,
    q.stem_text,
    q.choices,
    dq.display_order
  FROM daily_quiz_questions dq
  JOIN questions q ON q.id = dq.question_id
  WHERE dq.quiz_date = today
  ORDER BY dq.display_order;
END;
$$;

-- ============================================================
-- RPC: submit_daily_quiz
-- Records the user's daily quiz result.
-- Returns the user's percentile among all participants.
-- ============================================================
CREATE OR REPLACE FUNCTION submit_daily_quiz(
  _correct_count smallint,
  _total_count smallint DEFAULT 10
)
RETURNS TABLE (
  percentile numeric,
  total_participants bigint,
  user_correct smallint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today date := CURRENT_DATE;
  uid uuid := auth.uid();
  worse_count bigint;
  total_count_val bigint;
BEGIN
  -- Upsert the attempt
  INSERT INTO daily_quiz_attempts (user_id, quiz_date, correct_count, total_count, completed_at)
  VALUES (uid, today, _correct_count, _total_count, now())
  ON CONFLICT (user_id, quiz_date)
  DO UPDATE SET correct_count = _correct_count, completed_at = now();

  -- Calculate percentile
  SELECT count(*) INTO total_count_val
  FROM daily_quiz_attempts
  WHERE quiz_date = today AND completed_at IS NOT NULL;

  SELECT count(*) INTO worse_count
  FROM daily_quiz_attempts
  WHERE quiz_date = today
    AND completed_at IS NOT NULL
    AND correct_count < _correct_count;

  RETURN QUERY SELECT
    CASE WHEN total_count_val > 0
      THEN round((worse_count::numeric / total_count_val) * 100)
      ELSE 0::numeric
    END AS percentile,
    total_count_val AS total_participants,
    _correct_count AS user_correct;
END;
$$;

-- ============================================================
-- RPC: get_daily_quiz_stats
-- Returns the current user's stats for today's quiz
-- (or null if not attempted), plus live percentile.
-- ============================================================
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
  FROM daily_quiz_attempts
  WHERE user_id = uid AND quiz_date = today AND completed_at IS NOT NULL;

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
  FROM daily_quiz_attempts
  WHERE quiz_date = today AND completed_at IS NOT NULL;

  SELECT count(*) INTO worse_count
  FROM daily_quiz_attempts
  WHERE quiz_date = today
    AND completed_at IS NOT NULL
    AND correct_count < attempt.correct_count;

  RETURN QUERY SELECT
    true AS has_completed,
    attempt.correct_count,
    attempt.total_count,
    CASE WHEN total_count_val > 0
      THEN round((worse_count::numeric / total_count_val) * 100)
      ELSE 0::numeric
    END AS percentile,
    total_count_val AS total_participants;
END;
$$;
