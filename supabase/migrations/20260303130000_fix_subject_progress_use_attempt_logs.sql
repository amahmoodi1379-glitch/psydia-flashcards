-- Fix get_subject_progress to use attempt_logs instead of user_question_state.
-- After decoupling Leitner from record_answer, user_question_state only contains
-- questions explicitly added to Leitner, NOT all answered questions.
-- answered_count should reflect actually answered questions (from attempt_logs).

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
    SELECT DISTINCT question_id
    FROM attempt_logs
    WHERE user_id = auth.uid()
  ) ua ON ua.question_id = sq.question_id
  WHERE auth.uid() IS NOT NULL
  GROUP BY sq.subject_id, sq.subject_name, sq.display_order
  ORDER BY sq.display_order;
$$;
