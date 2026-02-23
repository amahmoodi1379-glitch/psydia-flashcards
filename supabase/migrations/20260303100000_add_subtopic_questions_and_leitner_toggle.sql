-- ============================================================
-- 1. get_subtopic_questions: paginated questions for a subtopic
--    with optional filter to show only unanswered questions
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_subtopic_questions(
  _subtopic_id uuid,
  _page integer DEFAULT 1,
  _page_size integer DEFAULT 10,
  _only_unanswered boolean DEFAULT false
)
RETURNS TABLE(
  id uuid,
  stem_text text,
  choices jsonb,
  subtopic_id uuid,
  is_answered boolean,
  is_in_leitner boolean,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_offset integer := (GREATEST(COALESCE(_page, 1), 1) - 1) * COALESCE(_page_size, 10);
  v_limit integer := GREATEST(COALESCE(_page_size, 10), 1);
BEGIN
  RETURN QUERY
  WITH base AS (
    SELECT
      q.id,
      q.stem_text,
      q.choices,
      q.subtopic_id,
      CASE
        WHEN v_user_id IS NULL THEN false
        WHEN EXISTS (
          SELECT 1 FROM attempt_logs al
          WHERE al.question_id = q.id AND al.user_id = v_user_id
        ) THEN true
        ELSE false
      END AS is_answered,
      CASE
        WHEN v_user_id IS NULL THEN false
        WHEN EXISTS (
          SELECT 1 FROM user_question_state uqs
          WHERE uqs.question_id = q.id AND uqs.user_id = v_user_id
        ) THEN true
        ELSE false
      END AS is_in_leitner
    FROM questions q
    WHERE q.subtopic_id = _subtopic_id
      AND q.is_active = true
  ),
  filtered AS (
    SELECT b.*
    FROM base b
    WHERE (NOT _only_unanswered OR NOT b.is_answered)
  ),
  cnt AS (
    SELECT COUNT(*)::bigint AS total_count FROM filtered
  )
  SELECT f.id, f.stem_text, f.choices, f.subtopic_id, f.is_answered, f.is_in_leitner, c.total_count
  FROM filtered f
  CROSS JOIN cnt c
  ORDER BY f.id
  OFFSET v_offset
  LIMIT v_limit;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_subtopic_questions(uuid, integer, integer, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_subtopic_questions(uuid, integer, integer, boolean) TO authenticated, anon;

-- ============================================================
-- 2. toggle_leitner: add or remove a question from user's Leitner deck
--    Returns the new state (true = in leitner, false = removed)
-- ============================================================
CREATE OR REPLACE FUNCTION public.toggle_leitner(
  _question_id uuid
)
RETURNS TABLE(
  is_in_leitner boolean,
  box_number integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_exists boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM user_question_state uqs
    WHERE uqs.user_id = v_user_id AND uqs.question_id = _question_id
  ) INTO v_exists;

  IF v_exists THEN
    -- Remove from Leitner
    DELETE FROM user_question_state
    WHERE user_id = v_user_id AND question_id = _question_id;

    RETURN QUERY SELECT false, 0;
  ELSE
    -- Add to Leitner at box 1, due now
    INSERT INTO user_question_state(user_id, question_id, box_number, ease_factor, interval_days, next_review_at)
    VALUES (v_user_id, _question_id, 1, 2.5, 1, now())
    ON CONFLICT (user_id, question_id) DO NOTHING;

    RETURN QUERY SELECT true, 1;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.toggle_leitner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_leitner(uuid) TO authenticated;

-- ============================================================
-- 3. get_leitner_due_count: count of questions due for review in user's Leitner deck
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_leitner_due_count()
RETURNS TABLE(
  due_count bigint,
  total_in_leitner bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT 0::bigint, 0::bigint;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE uqs.next_review_at <= now())::bigint AS due_count,
    COUNT(*)::bigint AS total_in_leitner
  FROM user_question_state uqs
  WHERE uqs.user_id = v_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_leitner_due_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leitner_due_count() TO authenticated;

-- ============================================================
-- 4. get_leitner_review_questions: get due questions from user's Leitner deck
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_leitner_review_questions(
  _limit integer DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  stem_text text,
  choices jsonb,
  subtopic_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_limit integer := GREATEST(COALESCE(_limit, 10), 1);
BEGIN
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT q.id, q.stem_text, q.choices, q.subtopic_id
  FROM user_question_state uqs
  JOIN questions q ON q.id = uqs.question_id AND q.is_active = true
  WHERE uqs.user_id = v_user_id
    AND uqs.next_review_at <= now()
  ORDER BY uqs.next_review_at ASC
  LIMIT v_limit;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_leitner_review_questions(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leitner_review_questions(integer) TO authenticated;
