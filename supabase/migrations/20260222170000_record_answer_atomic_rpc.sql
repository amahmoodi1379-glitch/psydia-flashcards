-- Add idempotency key support to prevent duplicate attempt logs on retries/double clicks
ALTER TABLE public.attempt_logs
ADD COLUMN IF NOT EXISTS client_request_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS attempt_logs_user_request_id_key
ON public.attempt_logs(user_id, client_request_id)
WHERE client_request_id IS NOT NULL;

-- Atomically record answer + update Leitner state
CREATE OR REPLACE FUNCTION public.record_answer_and_update_state(
  p_question_id uuid,
  p_selected_index integer,
  p_is_correct boolean,
  p_client_request_id uuid DEFAULT NULL
)
RETURNS TABLE (
  already_processed boolean,
  box_number integer,
  ease_factor double precision,
  interval_days integer,
  next_review_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_existing public.user_question_state%ROWTYPE;
  v_box integer;
  v_ease double precision;
  v_interval integer;
  v_next_review_at timestamptz;
  v_was_inserted boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Write attempt log once per client request id (idempotency for retries/double submits)
  INSERT INTO public.attempt_logs(user_id, question_id, selected_index, is_correct, client_request_id)
  VALUES (v_user_id, p_question_id, p_selected_index, p_is_correct, p_client_request_id)
  ON CONFLICT (user_id, client_request_id) WHERE client_request_id IS NOT NULL DO NOTHING;

  GET DIAGNOSTICS v_was_inserted = ROW_COUNT;

  -- If it was already processed for this request id, return current state unchanged
  IF p_client_request_id IS NOT NULL AND NOT v_was_inserted THEN
    SELECT *
    INTO v_existing
    FROM public.user_question_state
    WHERE user_id = v_user_id AND question_id = p_question_id;

    RETURN QUERY
    SELECT true,
           COALESCE(v_existing.box_number, 1),
           COALESCE(v_existing.ease_factor, 2.5),
           COALESCE(v_existing.interval_days, 1),
           COALESCE(v_existing.next_review_at, now());
    RETURN;
  END IF;

  SELECT *
  INTO v_existing
  FROM public.user_question_state
  WHERE user_id = v_user_id AND question_id = p_question_id
  FOR UPDATE;

  v_box := COALESCE(v_existing.box_number, 1);
  v_ease := COALESCE(v_existing.ease_factor, 2.5);
  v_interval := COALESCE(v_existing.interval_days, 1);

  IF p_is_correct THEN
    v_box := LEAST(v_box + 1, 7);
    v_ease := v_ease + 0.1;

    IF v_box = 1 THEN
      v_interval := 1;
    ELSIF v_box = 2 THEN
      v_interval := 3;
    ELSE
      v_interval := GREATEST(1, ROUND(v_interval * v_ease)::integer);
    END IF;
  ELSE
    v_box := 1;
    v_interval := 1;
    v_ease := GREATEST(1.3, v_ease - 0.2);
  END IF;

  v_next_review_at := now() + make_interval(days => v_interval);

  INSERT INTO public.user_question_state(
    user_id,
    question_id,
    box_number,
    ease_factor,
    interval_days,
    next_review_at
  )
  VALUES (
    v_user_id,
    p_question_id,
    v_box,
    v_ease,
    v_interval,
    v_next_review_at
  )
  ON CONFLICT (user_id, question_id)
  DO UPDATE SET
    box_number = EXCLUDED.box_number,
    ease_factor = EXCLUDED.ease_factor,
    interval_days = EXCLUDED.interval_days,
    next_review_at = EXCLUDED.next_review_at;

  RETURN QUERY
  SELECT false, v_box, v_ease, v_interval, v_next_review_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_answer_and_update_state(uuid, integer, boolean, uuid) TO authenticated;
