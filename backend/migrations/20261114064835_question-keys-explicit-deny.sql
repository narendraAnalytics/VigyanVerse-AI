-- Migration M5b: question_keys is deny-all for every client role on purpose (the answer key
-- must never reach a student). Say so with an explicit policy instead of "RLS on, no policy",
-- which the advisor flags as critical. The admin client (quiz-generate, answer-evaluate)
-- bypasses RLS, so it is unaffected.
CREATE POLICY "question_keys: no client access" ON public.question_keys
  FOR ALL TO authenticated USING (false) WITH CHECK (false);
