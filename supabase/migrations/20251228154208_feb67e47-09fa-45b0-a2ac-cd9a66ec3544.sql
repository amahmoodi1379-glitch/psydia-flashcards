-- Fix search_path for calculate_leaderboard_score function
CREATE OR REPLACE FUNCTION public.calculate_leaderboard_score(p_correct int, p_total int)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_accuracy float;
  v_bonus int;
BEGIN
  IF p_total = 0 THEN
    RETURN 0;
  END IF;
  
  v_accuracy := p_correct::float / p_total;
  
  IF v_accuracy >= 0.9 THEN
    v_bonus := 50;
  ELSIF v_accuracy >= 0.8 THEN
    v_bonus := 30;
  ELSIF v_accuracy >= 0.7 THEN
    v_bonus := 15;
  ELSE
    v_bonus := 0;
  END IF;
  
  RETURN (p_correct * 10) + v_bonus;
END;
$$;