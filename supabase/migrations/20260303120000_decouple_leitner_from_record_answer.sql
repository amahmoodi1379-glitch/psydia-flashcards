-- Decouple Leitner auto-add from record_answer_and_update_state.
-- Previously, every answer automatically created a user_question_state row (= added to Leitner).
-- Now, the RPC only updates Leitner state IF the question is already in the user's Leitner deck.
-- Users must explicitly use toggle_leitner to add questions to their deck.
-- This reduces DB writes significantly for free-tier (1000 users × N questions).

CREATE OR REPLACE FUNCTION public.record_answer_and_update_state(
  p_question_id uuid,
  p_selected_index integer,
  p_is_correct boolean,
  p_client_request_id uuid DEFAULT NULL
)
RETURNS TABLE (
  already_processed boolean,
  quota_allowed boolean,
  quota_remaining integer,
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
  v_user_id uuid;
  v_existing public.user_question_state%ROWTYPE;
  v_has_leitner boolean := false;
  v_box integer;
  v_ease double precision;
  v_interval integer;
  v_next_review_at timestamptz;
  v_attempt_id uuid;
  v_plan subscription_plan;
  v_daily_limit integer;
  v_current_usage integer := 0;
  v_request_already_logged boolean := false;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT
    COALESCE(s.plan, 'free'::subscription_plan),
    COALESCE(s.daily_limit, 10)
  INTO v_plan, v_daily_limit
  FROM profiles p
  LEFT JOIN subscriptions s ON s.user_id = p.id
    AND s.is_active = true
    AND (s.expires_at IS NULL OR s.expires_at > now())
  WHERE p.id = v_user_id;

  -- Idempotency check: if this request was already processed, return cached state
  IF p_client_request_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.attempt_logs
      WHERE user_id = v_user_id
        AND client_request_id = p_client_request_id
    ) INTO v_request_already_logged;

    IF v_request_already_logged THEN
      IF v_plan = 'free' THEN
        SELECT COALESCE(question_count, 0)
        INTO v_current_usage
        FROM public.daily_usage
        WHERE user_id = v_user_id AND usage_date = CURRENT_DATE;
      END IF;

      SELECT *
      INTO v_existing
      FROM public.user_question_state
      WHERE user_id = v_user_id AND question_id = p_question_id;

      RETURN QUERY
      SELECT true,
             true,
             CASE WHEN v_plan = 'free' THEN GREATEST(v_daily_limit - v_current_usage, 0) ELSE NULL END,
             COALESCE(v_existing.box_number, 0),
             COALESCE(v_existing.ease_factor, 2.5),
             COALESCE(v_existing.interval_days, 0),
             v_existing.next_review_at;
      RETURN;
    END IF;
  END IF;

  -- Quota check for free users
  IF v_plan = 'free' THEN
    WITH quota_upsert AS (
      INSERT INTO public.daily_usage (user_id, usage_date, question_count)
      VALUES (v_user_id, CURRENT_DATE, 1)
      ON CONFLICT (user_id, usage_date)
      DO UPDATE SET question_count = public.daily_usage.question_count + 1
      WHERE public.daily_usage.question_count < v_daily_limit
      RETURNING question_count
    )
    SELECT question_count INTO v_current_usage
    FROM quota_upsert;

    IF v_current_usage IS NULL THEN
      -- Quota exceeded
      SELECT *
      INTO v_existing
      FROM public.user_question_state
      WHERE user_id = v_user_id AND question_id = p_question_id;

      RETURN QUERY
      SELECT false,
             false,
             0,
             COALESCE(v_existing.box_number, 0),
             COALESCE(v_existing.ease_factor, 2.5),
             COALESCE(v_existing.interval_days, 0),
             v_existing.next_review_at;
      RETURN;
    END IF;
  END IF;

  -- Insert attempt log (with idempotency guard)
  IF p_client_request_id IS NULL THEN
    INSERT INTO public.attempt_logs(user_id, question_id, selected_index, is_correct, client_request_id)
    VALUES (v_user_id, p_question_id, p_selected_index, p_is_correct, p_client_request_id)
    RETURNING id INTO v_attempt_id;
  ELSE
    INSERT INTO public.attempt_logs(user_id, question_id, selected_index, is_correct, client_request_id)
    VALUES (v_user_id, p_question_id, p_selected_index, p_is_correct, p_client_request_id)
    ON CONFLICT (user_id, client_request_id) WHERE client_request_id IS NOT NULL DO NOTHING
    RETURNING id INTO v_attempt_id;

    IF v_attempt_id IS NULL THEN
      SELECT *
      INTO v_existing
      FROM public.user_question_state
      WHERE user_id = v_user_id AND question_id = p_question_id;

      RETURN QUERY
      SELECT true,
             true,
             CASE WHEN v_plan = 'free' THEN GREATEST(v_daily_limit - v_current_usage, 0) ELSE NULL END,
             COALESCE(v_existing.box_number, 0),
             COALESCE(v_existing.ease_factor, 2.5),
             COALESCE(v_existing.interval_days, 0),
             v_existing.next_review_at;
      RETURN;
    END IF;
  END IF;

  -- CHANGED: Only update Leitner state if the question is ALREADY in the user's deck.
  -- Do NOT auto-add new questions to Leitner.
  SELECT *
  INTO v_existing
  FROM public.user_question_state
  WHERE user_id = v_user_id AND question_id = p_question_id
  FOR UPDATE;

  IF v_existing IS NOT NULL THEN
    -- Question is already in Leitner → update box/interval as before
    v_box := v_existing.box_number;
    v_ease := v_existing.ease_factor;
    v_interval := v_existing.interval_days;

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

    UPDATE public.user_question_state
    SET box_number = v_box,
        ease_factor = v_ease,
        interval_days = v_interval,
        next_review_at = v_next_review_at
    WHERE user_id = v_user_id AND question_id = p_question_id;

    RETURN QUERY
    SELECT false,
           true,
           CASE WHEN v_plan = 'free' THEN GREATEST(v_daily_limit - v_current_usage, 0) ELSE NULL END,
           v_box,
           v_ease,
           v_interval,
           v_next_review_at;
  ELSE
    -- Question is NOT in Leitner → just return zeros (user can add via toggle_leitner)
    RETURN QUERY
    SELECT false,
           true,
           CASE WHEN v_plan = 'free' THEN GREATEST(v_daily_limit - v_current_usage, 0) ELSE NULL END,
           0,
           2.5::double precision,
           0,
           NULL::timestamptz;
  END IF;
END;
$$;
