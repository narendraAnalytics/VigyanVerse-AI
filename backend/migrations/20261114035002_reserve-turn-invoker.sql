-- Migration M4d: reserve_turn() runs as the caller (SECURITY INVOKER), not as its owner.
-- It needs no extra rights: under RLS a student can already read and insert their own
-- model_usage rows, and the advisory lock works the same. Advisor 2026-11-14 flagged the
-- SECURITY DEFINER version as critical; invoker rights remove the risk instead of suppressing it.
ALTER FUNCTION public.reserve_turn(uuid, integer, integer, numeric) SECURITY INVOKER;
