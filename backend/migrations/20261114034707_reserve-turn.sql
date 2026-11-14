-- Migration M4c: check the AI limits and reserve the turn in ONE step (security review
-- 2026-11-14). Before, tutor-chat read ai_usage_status() and then inserted the turn row, so
-- parallel requests could all pass the check before any of them was counted.
--
-- reserve_turn() takes a per-student advisory lock, counts today's turns, the last minute's
-- turns and today's cost (India time), and inserts the turn row only when all are under the
-- limits. The limits come from tutor-chat; a student calling this directly can only add turn
-- rows against their own budget.
CREATE OR REPLACE FUNCTION public.reserve_turn(
  p_conversation   uuid,
  p_max_per_minute integer,
  p_max_per_day    integer,
  p_max_cost_inr   numeric
)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_start  timestamptz := date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata';
  v_minute integer;
  v_day    integer;
  v_cost   numeric;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not signed in' USING ERRCODE = '42501';
  END IF;

  -- Serialise this student's reservations (other students are not blocked).
  PERFORM pg_advisory_xact_lock(hashtextextended('reserve_turn:' || v_uid::text, 0));

  SELECT
    count(*) FILTER (WHERE u.agent = 'turn' AND u.created_at > now() - interval '1 minute'),
    count(*) FILTER (WHERE u.agent = 'turn' AND u.created_at >= v_start),
    coalesce(sum(u.cost_inr) FILTER (WHERE u.created_at >= v_start), 0)
  INTO v_minute, v_day, v_cost
  FROM public.model_usage u
  WHERE u.user_id = v_uid
    AND u.created_at >= least(v_start, now() - interval '1 minute');

  IF v_minute >= p_max_per_minute THEN
    RETURN 'slow_down';
  END IF;
  IF v_day >= p_max_per_day OR v_cost >= p_max_cost_inr THEN
    RETURN 'daily_limit';
  END IF;

  INSERT INTO public.model_usage (user_id, conversation_id, function_slug, agent)
  VALUES (v_uid, p_conversation, 'tutor-chat', 'turn');
  RETURN 'ok';
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_turn(uuid, integer, integer, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserve_turn(uuid, integer, integer, numeric) TO authenticated;
