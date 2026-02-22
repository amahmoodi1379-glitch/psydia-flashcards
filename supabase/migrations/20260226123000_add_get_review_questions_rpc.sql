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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH params AS (
    SELECT
      GREATEST(COALESCE(_limit, 10), 0) AS v_limit,
      COALESCE(_filter_type, 'daily') AS v_filter_type,
      _filter_id AS v_filter_id,
      auth.uid() AS v_user_id
  ),
  base_questions AS (
    SELECT q.id, q.stem_text, q.choices, q.subtopic_id
    FROM questions q
    CROSS JOIN params p
    LEFT JOIN subtopics st ON st.id = q.subtopic_id
    LEFT JOIN topics t ON t.id = st.topic_id
    LEFT JOIN bookmarks b ON b.question_id = q.id AND b.user_id = p.v_user_id
    LEFT JOIN (
      SELECT al.question_id
      FROM attempt_logs al
      CROSS JOIN params p2
      WHERE al.user_id = p2.v_user_id
        AND p2.v_user_id IS NOT NULL
        AND al.is_correct = false
      GROUP BY al.question_id
      HAVING COUNT(*) >= 2
    ) fw ON fw.question_id = q.id
    WHERE q.is_active = true
      AND (
        p.v_filter_type = 'daily'
        OR (p.v_filter_type = 'subtopic' AND q.subtopic_id = p.v_filter_id)
        OR (p.v_filter_type = 'topic' AND st.topic_id = p.v_filter_id)
        OR (p.v_filter_type = 'subject' AND t.subject_id = p.v_filter_id)
        OR (p.v_filter_type = 'bookmarks' AND p.v_user_id IS NOT NULL AND b.question_id IS NOT NULL)
        OR (p.v_filter_type = 'frequently_wrong' AND p.v_user_id IS NOT NULL AND fw.question_id IS NOT NULL)
      )
  ),
  classified AS (
    SELECT
      bq.*,
      uqs.next_review_at,
      CASE
        WHEN p.v_user_id IS NULL THEN 'new'
        WHEN uqs.question_id IS NULL THEN 'new'
        WHEN uqs.next_review_at <= now() THEN 'due'
        ELSE 'scheduled'
      END AS review_type
    FROM base_questions bq
    CROSS JOIN params p
    LEFT JOIN user_question_state uqs
      ON uqs.question_id = bq.id
     AND uqs.user_id = p.v_user_id
  ),
  counts AS (
    SELECT
      COUNT(*) FILTER (WHERE review_type = 'due')::bigint AS due_count,
      COUNT(*) FILTER (WHERE review_type = 'new')::bigint AS new_count
    FROM classified
  ),
  due_pick AS (
    SELECT c.*, 1 AS priority, ROW_NUMBER() OVER (ORDER BY random()) AS ord
    FROM classified c
    CROSS JOIN params p
    WHERE c.review_type = 'due'
    ORDER BY random()
    LIMIT p.v_limit
  ),
  remaining_after_due AS (
    SELECT GREATEST((SELECT v_limit FROM params) - COUNT(*), 0) AS rem
    FROM due_pick
  ),
  new_pick AS (
    SELECT c.*, 2 AS priority, ROW_NUMBER() OVER (ORDER BY random()) AS ord
    FROM classified c
    WHERE c.review_type = 'new'
    ORDER BY random()
    LIMIT (SELECT rem FROM remaining_after_due)
  ),
  primary_pick AS (
    SELECT id, stem_text, choices, subtopic_id, priority, ord
    FROM due_pick
    UNION ALL
    SELECT id, stem_text, choices, subtopic_id, priority, ord
    FROM new_pick
  ),
  fallback_pick AS (
    SELECT c.id, c.stem_text, c.choices, c.subtopic_id, 3 AS priority,
      ROW_NUMBER() OVER (ORDER BY c.next_review_at ASC, c.id) AS ord
    FROM classified c
    CROSS JOIN params p
    WHERE c.review_type = 'scheduled'
      AND (SELECT COUNT(*) FROM primary_pick) = 0
    ORDER BY c.next_review_at ASC, c.id
    LIMIT p.v_limit
  ),
  final_pick AS (
    SELECT * FROM primary_pick
    UNION ALL
    SELECT * FROM fallback_pick
  )
  SELECT fp.id, fp.stem_text, fp.choices, fp.subtopic_id, c.due_count, c.new_count
  FROM final_pick fp
  CROSS JOIN counts c
  ORDER BY fp.priority, fp.ord
  LIMIT (SELECT v_limit FROM params);
$$;

REVOKE EXECUTE ON FUNCTION public.get_review_questions(integer, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_review_questions(integer, text, uuid) TO authenticated, anon;

CREATE INDEX IF NOT EXISTS idx_questions_subtopic_active
  ON public.questions(subtopic_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_question_state_user_question_next_review
  ON public.user_question_state(user_id, question_id, next_review_at);
