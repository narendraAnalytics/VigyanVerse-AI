-- Migration M4b: make AI usage accounting fail closed (security review 2026-11-14).
--
-- Before: the rate limit counted messages (students may delete those), and usage rows were
-- written after the answer with a conversation ownership check, so deleting the conversation
-- mid-turn made the write fail and the turn went uncounted.
-- After: tutor-chat inserts an append-only "turn" row in model_usage BEFORE any AI work (no
-- turn row -> no AI). Both limits count those rows, which students cannot update or delete.
-- model_usage.conversation_id becomes a plain reference (no FK, no ownership check), so
-- deleting a chat never blocks usage writes; it is analytics only.

ALTER TABLE public.model_usage DROP CONSTRAINT model_usage_conversation_id_fkey;

DROP POLICY "model_usage: insert own" ON public.model_usage;
CREATE POLICY "model_usage: insert own" ON public.model_usage
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Turn counting for the limits.
CREATE INDEX model_usage_turns_idx ON public.model_usage (user_id, created_at DESC) WHERE agent = 'turn';

-- Columns change, so the function is dropped and created again.
DROP FUNCTION public.ai_usage_status();

CREATE FUNCTION public.ai_usage_status()
RETURNS TABLE (turns_last_minute integer, turns_today integer, cost_today_inr numeric)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp
AS $$
  WITH today AS (
    SELECT u.agent, u.cost_inr, u.created_at
    FROM public.model_usage u
    WHERE u.user_id = (SELECT auth.uid())
      AND u.created_at >= (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata')
  )
  SELECT
    (SELECT count(*)::integer FROM public.model_usage u
      WHERE u.user_id = (SELECT auth.uid()) AND u.agent = 'turn' AND u.created_at > now() - interval '1 minute'),
    (SELECT count(*)::integer FROM today WHERE agent = 'turn'),
    (SELECT coalesce(sum(cost_inr), 0) FROM today);
$$;

REVOKE ALL ON FUNCTION public.ai_usage_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ai_usage_status() TO authenticated;
