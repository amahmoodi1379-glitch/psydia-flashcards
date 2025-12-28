-- Add index for fast lookup of duplicate answers
CREATE INDEX IF NOT EXISTS idx_attempt_logs_user_question_created 
ON attempt_logs(user_id, question_id, created_at);

-- Update the trigger to only count first answer per question per week/month
CREATE OR REPLACE FUNCTION public.update_leaderboard_on_answer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_week_start date;
  v_month_start date;
  v_already_answered_this_week boolean;
  v_already_answered_this_month boolean;
BEGIN
  -- Calculate week start (Monday-based)
  v_week_start := date_trunc('week', NEW.created_at)::date;
  -- Calculate month start
  v_month_start := date_trunc('month', NEW.created_at)::date;

  -- Check if this question was already answered this week by this user
  SELECT EXISTS (
    SELECT 1 FROM attempt_logs 
    WHERE user_id = NEW.user_id 
      AND question_id = NEW.question_id 
      AND id != NEW.id
      AND created_at >= v_week_start
      AND created_at < v_week_start + interval '7 days'
  ) INTO v_already_answered_this_week;

  -- Check if this question was already answered this month by this user
  SELECT EXISTS (
    SELECT 1 FROM attempt_logs 
    WHERE user_id = NEW.user_id 
      AND question_id = NEW.question_id 
      AND id != NEW.id
      AND created_at >= v_month_start
      AND created_at < v_month_start + interval '1 month'
  ) INTO v_already_answered_this_month;

  -- Only update weekly leaderboard if this is the FIRST answer to this question this week
  IF NOT v_already_answered_this_week THEN
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
  END IF;

  -- Only update monthly leaderboard if this is the FIRST answer to this question this month
  IF NOT v_already_answered_this_month THEN
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
  END IF;

  RETURN NEW;
END;
$function$;

-- Fix questions_safe view security - change to INVOKER and add RLS
DROP VIEW IF EXISTS questions_safe;
CREATE VIEW questions_safe WITH (security_invoker = true) AS
SELECT 
  id,
  stem_text,
  choices,
  explanation,
  subtopic_id,
  created_at,
  is_active
FROM questions
WHERE is_active = true;