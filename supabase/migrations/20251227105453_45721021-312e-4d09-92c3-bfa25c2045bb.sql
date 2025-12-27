-- Create RPC to check answer without exposing correct_index
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
BEGIN
  RETURN QUERY
  SELECT 
    (q.correct_index = _selected_index) as is_correct,
    q.correct_index,
    q.explanation
  FROM questions q
  WHERE q.id = _question_id AND q.is_active = true;
END;
$$;

-- Create RPC for admin users list with stats (fix N+1)
CREATE OR REPLACE FUNCTION public.get_admin_users_stats()
RETURNS TABLE(
  id uuid,
  display_name text,
  telegram_id text,
  created_at timestamptz,
  updated_at timestamptz,
  attempt_count bigint,
  correct_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.display_name,
    p.telegram_id,
    p.created_at,
    p.updated_at,
    COALESCE(COUNT(a.id), 0) as attempt_count,
    COALESCE(COUNT(a.id) FILTER (WHERE a.is_correct = true), 0) as correct_count
  FROM profiles p
  LEFT JOIN attempt_logs a ON a.user_id = p.id
  GROUP BY p.id, p.display_name, p.telegram_id, p.created_at, p.updated_at
  ORDER BY p.created_at DESC;
$$;

-- Create VIEW for questions without correct_index (for public queries)
CREATE OR REPLACE VIEW public.questions_safe AS
SELECT 
  id,
  stem_text,
  choices,
  explanation,
  subtopic_id,
  is_active,
  created_at
FROM questions;

-- Grant access to the view
GRANT SELECT ON public.questions_safe TO authenticated;
GRANT SELECT ON public.questions_safe TO anon;