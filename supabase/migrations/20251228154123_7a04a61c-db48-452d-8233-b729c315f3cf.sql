-- Create weekly leaderboard table
CREATE TABLE public.weekly_leaderboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  correct_count integer NOT NULL DEFAULT 0,
  total_count integer NOT NULL DEFAULT 0,
  score integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);

-- Indexes for fast querying
CREATE INDEX idx_weekly_leaderboard_week_score 
ON public.weekly_leaderboard(week_start DESC, score DESC);

CREATE INDEX idx_weekly_leaderboard_user 
ON public.weekly_leaderboard(user_id);

-- Create monthly leaderboard table
CREATE TABLE public.monthly_leaderboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month_start date NOT NULL,
  correct_count integer NOT NULL DEFAULT 0,
  total_count integer NOT NULL DEFAULT 0,
  score integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, month_start)
);

CREATE INDEX idx_monthly_leaderboard_month_score 
ON public.monthly_leaderboard(month_start DESC, score DESC);

CREATE INDEX idx_monthly_leaderboard_user 
ON public.monthly_leaderboard(user_id);

-- Enable RLS
ALTER TABLE public.weekly_leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_leaderboard ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Anyone can read leaderboards
CREATE POLICY "Anyone can read weekly leaderboard" 
ON public.weekly_leaderboard FOR SELECT USING (true);

CREATE POLICY "Anyone can read monthly leaderboard" 
ON public.monthly_leaderboard FOR SELECT USING (true);

-- Function to calculate score with accuracy bonus
CREATE OR REPLACE FUNCTION public.calculate_leaderboard_score(p_correct int, p_total int)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_accuracy float;
  v_bonus int;
BEGIN
  IF p_total = 0 THEN
    RETURN 0;
  END IF;
  
  v_accuracy := p_correct::float / p_total;
  
  IF v_accuracy >= 0.9 THEN
    v_bonus := 50;
  ELSIF v_accuracy >= 0.8 THEN
    v_bonus := 30;
  ELSIF v_accuracy >= 0.7 THEN
    v_bonus := 15;
  ELSE
    v_bonus := 0;
  END IF;
  
  RETURN (p_correct * 10) + v_bonus;
END;
$$;

-- Function to update leaderboards on new answer
CREATE OR REPLACE FUNCTION public.update_leaderboard_on_answer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_start date;
  v_month_start date;
  v_new_correct int;
  v_new_total int;
BEGIN
  -- Calculate week start (Saturday-based for Persian calendar feel, but using ISO week for simplicity)
  v_week_start := date_trunc('week', NEW.created_at)::date;
  -- Calculate month start
  v_month_start := date_trunc('month', NEW.created_at)::date;

  -- Upsert weekly leaderboard
  INSERT INTO weekly_leaderboard (user_id, week_start, correct_count, total_count, score)
  VALUES (
    NEW.user_id, 
    v_week_start, 
    CASE WHEN NEW.is_correct THEN 1 ELSE 0 END, 
    1, 
    CASE WHEN NEW.is_correct THEN 10 ELSE 0 END
  )
  ON CONFLICT (user_id, week_start) DO UPDATE SET
    correct_count = weekly_leaderboard.correct_count + (CASE WHEN NEW.is_correct THEN 1 ELSE 0 END),
    total_count = weekly_leaderboard.total_count + 1,
    score = calculate_leaderboard_score(
      weekly_leaderboard.correct_count + (CASE WHEN NEW.is_correct THEN 1 ELSE 0 END),
      weekly_leaderboard.total_count + 1
    ),
    updated_at = now();

  -- Upsert monthly leaderboard
  INSERT INTO monthly_leaderboard (user_id, month_start, correct_count, total_count, score)
  VALUES (
    NEW.user_id, 
    v_month_start, 
    CASE WHEN NEW.is_correct THEN 1 ELSE 0 END, 
    1, 
    CASE WHEN NEW.is_correct THEN 10 ELSE 0 END
  )
  ON CONFLICT (user_id, month_start) DO UPDATE SET
    correct_count = monthly_leaderboard.correct_count + (CASE WHEN NEW.is_correct THEN 1 ELSE 0 END),
    total_count = monthly_leaderboard.total_count + 1,
    score = calculate_leaderboard_score(
      monthly_leaderboard.correct_count + (CASE WHEN NEW.is_correct THEN 1 ELSE 0 END),
      monthly_leaderboard.total_count + 1
    ),
    updated_at = now();

  RETURN NEW;
END;
$$;

-- Create trigger on attempt_logs
CREATE TRIGGER trg_update_leaderboard
AFTER INSERT ON public.attempt_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_leaderboard_on_answer();

-- Function to get leaderboard with rank
CREATE OR REPLACE FUNCTION public.get_weekly_leaderboard(p_week_start date DEFAULT NULL)
RETURNS TABLE(
  rank bigint,
  user_id uuid,
  display_name text,
  avatar_url text,
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
    ROW_NUMBER() OVER (ORDER BY wl.score DESC, wl.correct_count DESC) as rank,
    wl.user_id,
    COALESCE(p.display_name, 'کاربر') as display_name,
    p.avatar_url,
    wl.correct_count,
    wl.total_count,
    wl.score,
    CASE WHEN wl.total_count > 0 
      THEN ROUND((wl.correct_count::numeric / wl.total_count) * 100, 1)
      ELSE 0 
    END as accuracy
  FROM weekly_leaderboard wl
  JOIN profiles p ON p.id = wl.user_id
  WHERE wl.week_start = COALESCE(p_week_start, date_trunc('week', CURRENT_DATE)::date)
  ORDER BY wl.score DESC, wl.correct_count DESC
  LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION public.get_monthly_leaderboard(p_month_start date DEFAULT NULL)
RETURNS TABLE(
  rank bigint,
  user_id uuid,
  display_name text,
  avatar_url text,
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
    ROW_NUMBER() OVER (ORDER BY ml.score DESC, ml.correct_count DESC) as rank,
    ml.user_id,
    COALESCE(p.display_name, 'کاربر') as display_name,
    p.avatar_url,
    ml.correct_count,
    ml.total_count,
    ml.score,
    CASE WHEN ml.total_count > 0 
      THEN ROUND((ml.correct_count::numeric / ml.total_count) * 100, 1)
      ELSE 0 
    END as accuracy
  FROM monthly_leaderboard ml
  JOIN profiles p ON p.id = ml.user_id
  WHERE ml.month_start = COALESCE(p_month_start, date_trunc('month', CURRENT_DATE)::date)
  ORDER BY ml.score DESC, ml.correct_count DESC
  LIMIT 50;
$$;

-- Function to get user's own rank
CREATE OR REPLACE FUNCTION public.get_user_weekly_rank(p_user_id uuid, p_week_start date DEFAULT NULL)
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
  WITH ranked AS (
    SELECT 
      wl.user_id,
      ROW_NUMBER() OVER (ORDER BY wl.score DESC, wl.correct_count DESC) as rank,
      wl.correct_count,
      wl.total_count,
      wl.score
    FROM weekly_leaderboard wl
    WHERE wl.week_start = COALESCE(p_week_start, date_trunc('week', CURRENT_DATE)::date)
  )
  SELECT 
    r.rank,
    r.correct_count,
    r.total_count,
    r.score,
    CASE WHEN r.total_count > 0 
      THEN ROUND((r.correct_count::numeric / r.total_count) * 100, 1)
      ELSE 0 
    END as accuracy
  FROM ranked r
  WHERE r.user_id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.get_user_monthly_rank(p_user_id uuid, p_month_start date DEFAULT NULL)
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
  WITH ranked AS (
    SELECT 
      ml.user_id,
      ROW_NUMBER() OVER (ORDER BY ml.score DESC, ml.correct_count DESC) as rank,
      ml.correct_count,
      ml.total_count,
      ml.score
    FROM monthly_leaderboard ml
    WHERE ml.month_start = COALESCE(p_month_start, date_trunc('month', CURRENT_DATE)::date)
  )
  SELECT 
    r.rank,
    r.correct_count,
    r.total_count,
    r.score,
    CASE WHEN r.total_count > 0 
      THEN ROUND((r.correct_count::numeric / r.total_count) * 100, 1)
      ELSE 0 
    END as accuracy
  FROM ranked r
  WHERE r.user_id = p_user_id;
$$;