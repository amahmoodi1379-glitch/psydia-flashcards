-- Align Leitner/SM2 final model to 7 boxes across DB constraints and mastery functions.

ALTER TABLE public.user_question_state
  DROP CONSTRAINT IF EXISTS user_question_state_box_number_check;

ALTER TABLE public.user_question_state
  ADD CONSTRAINT user_question_state_box_number_check
  CHECK (box_number >= 1 AND box_number <= 7);

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
      ROUND(AVG((LEAST(uqs.box_number, 7)::float / 7) * 100))::integer as avg_mastery
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

CREATE OR REPLACE FUNCTION public.get_hierarchical_mastery(_user_id uuid)
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
  WITH user_mastery AS (
    SELECT 
      q.subtopic_id,
      ROUND(AVG((LEAST(uqs.box_number, 7)::float / 7) * 100))::integer as mastery
    FROM user_question_state uqs
    JOIN questions q ON q.id = uqs.question_id AND q.is_active = true
    WHERE uqs.user_id = _user_id
    GROUP BY q.subtopic_id
  )
  SELECT 
    s.id as subject_id,
    s.title as subject_name,
    COALESCE(AVG(um.mastery)::integer, 0) as subject_mastery,
    t.id as topic_id,
    t.title as topic_name,
    COALESCE(AVG(um.mastery) FILTER (WHERE st.topic_id = t.id)::integer, 0) as topic_mastery,
    st.id as subtopic_id,
    st.title as subtopic_name,
    COALESCE(um.mastery, 0) as subtopic_mastery
  FROM subjects s
  JOIN topics t ON t.subject_id = s.id
  JOIN subtopics st ON st.topic_id = t.id
  LEFT JOIN user_mastery um ON um.subtopic_id = st.id
  GROUP BY s.id, s.title, s.display_order, t.id, t.title, t.display_order, st.id, st.title, st.display_order, um.mastery
  ORDER BY s.display_order, t.display_order, st.display_order;
$$;
