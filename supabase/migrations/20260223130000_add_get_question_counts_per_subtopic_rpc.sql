-- RPC to return question count per subtopic efficiently
-- Eliminates the need to download all question rows client-side just for counting
CREATE OR REPLACE FUNCTION public.get_question_counts_per_subtopic()
RETURNS TABLE(subtopic_id uuid, question_count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT q.subtopic_id, count(*) AS question_count
  FROM public.questions q
  WHERE q.is_active = true
  GROUP BY q.subtopic_id;
$$;

-- Allow anon + authenticated to call this function
GRANT EXECUTE ON FUNCTION public.get_question_counts_per_subtopic() TO anon, authenticated;
