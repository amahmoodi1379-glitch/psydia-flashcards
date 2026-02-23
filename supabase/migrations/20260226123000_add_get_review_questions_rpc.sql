CREATE OR REPLACE FUNCTION public.get_review_questions(
  _limit integer DEFAULT 10,
  _filter_type text DEFAULT 'daily',
  _filter_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  stem_text text,
  choices jsonb,
  subtopic_id uuid,
  due_count bigint,
  new_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer := GREATEST(COALESCE(_limit, 10), 0);
  v_filter_type text := COALESCE(_filter_type, 'daily');
  v_filter_id uuid := _filter_id;
  v_user_id uuid := auth.uid();
BEGIN
  RETURN QUERY
  WITH base_questions AS (
    SELECT q.id, q.stem_text, q.choices, q.subtopic_id
    FROM questions q
    LEFT JOIN subtopics st ON st.id = q.subtopic_id
    LEFT JOIN topics t ON t.id = st.topic_id
    LEFT JOIN bookmarks b ON b.question_id = q.id AND b.user_id = v_user_id
    LEFT JOIN (
      SELECT al.question_id
      FROM attempt_logs al
      WHERE al.user_id = v_user_id
        AND v_user_id IS NOT NULL
        AND al.is_correct = false
      GROUP BY al.question_id
      HAVING COUNT(*) >= 2
    ) fw ON fw.question_id = q.id
    WHERE q.is_active = true
      AND (
        v_filter_type = 'daily'
        OR (v_filter_type = 'subtopic' AND q.subtopic_id = v_filter_id)
        OR (v_filter_type = 'topic' AND st.topic_id = v_filter_id)
        OR (v_filter_type = 'subject' AND t.subject_id = v_filter_id)
        OR (v_filter_type = 'bookmarks' AND v_user_id IS NOT NULL AND b.question_id IS NOT NULL)
        OR (v_filter_type = 'frequently_wrong' AND v_user_id IS NOT NULL AND fw.question_id IS NOT NULL)
      )
  ),
  classified AS (
    SELECT
      bq.*,
      uqs.next_review_at,
      CASE
        WHEN v_user_id IS NULL THEN 'new'
        WHEN uqs.question_id IS NULL THEN 'new'
        WHEN uqs.next_review_at <= now() THEN 'due'
        ELSE 'scheduled'
      END AS review_type
    FROM base_questions bq
    LEFT JOIN user_question_state uqs
      ON uqs.question_id = bq.id
     AND uqs.user_id = v_user_id
  ),
  counts AS (
    SELECT
      COUNT(*) FILTER (WHERE review_type = 'due')::bigint AS cnt_due,
      COUNT(*) FILTER (WHERE review_type = 'new')::bigint AS cnt_new
    FROM classified
  ),
  due_pick AS (
    SELECT c.id, c.stem_text, c.choices, c.subtopic_id, c.next_review_at, c.review_type,
           1 AS priority, ROW_NUMBER() OVER (ORDER BY random()) AS ord
    FROM classified c
    WHERE c.review_type = 'due'
    ORDER BY random()
    LIMIT v_limit
  ),
  remaining_after_due AS (
    SELECT GREATEST(v_limit - COUNT(*)::integer, 0) AS rem
    FROM due_pick
  ),
  new_pick AS (
    SELECT c.id, c.stem_text, c.choices, c.subtopic_id, c.next_review_at, c.review_type,
           2 AS priority, ROW_NUMBER() OVER (ORDER BY random()) AS ord
    FROM classified c
    WHERE c.review_type = 'new'
    ORDER BY random()
    LIMIT (SELECT rem FROM remaining_after_due)
  ),
  primary_pick AS (
    SELECT dp.id, dp.stem_text, dp.choices, dp.subtopic_id, dp.priority, dp.ord
    FROM due_pick dp
    UNION ALL
    SELECT np.id, np.stem_text, np.choices, np.subtopic_id, np.priority, np.ord
    FROM new_pick np
  ),
  fallback_pick AS (
    SELECT c.id, c.stem_text, c.choices, c.subtopic_id, 3 AS priority,
      ROW_NUMBER() OVER (ORDER BY c.next_review_at ASC, c.id) AS ord
    FROM classified c
    WHERE c.review_type = 'scheduled'
      AND (SELECT COUNT(*) FROM primary_pick) = 0
    ORDER BY c.next_review_at ASC, c.id
    LIMIT v_limit
  ),
  final_pick AS (
    SELECT * FROM primary_pick
    UNION ALL
    SELECT * FROM fallback_pick
  )
  SELECT fp.id, fp.stem_text, fp.choices, fp.subtopic_id, c.cnt_due, c.cnt_new
  FROM final_pick fp
  CROSS JOIN counts c
  ORDER BY fp.priority, fp.ord
  LIMIT v_limit;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_review_questions(integer, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_review_questions(integer, text, uuid) TO authenticated, anon;

CREATE INDEX IF NOT EXISTS idx_questions_subtopic_active
  ON public.questions(subtopic_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_question_state_user_question_next_review
  ON public.user_question_state(user_id, question_id, next_review_at);
