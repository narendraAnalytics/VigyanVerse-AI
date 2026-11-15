-- Fix: "infinite recursion detected in policy for relation assessment_questions" (found 2026-11-15
-- with the first real student: quiz-generate could not link questions to the new assessment).
--
-- Cause: the INSERT policy on assessment_questions read `questions` under RLS, and the SELECT
-- policy on `questions` reads assessment_questions, so Postgres saw a loop.
-- Fix: do the "is this question validated?" check in a SECURITY DEFINER helper that does not go
-- through RLS. It reveals one boolean about a question id (validated or not), nothing else.
CREATE OR REPLACE FUNCTION public.question_is_validated(p_question uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM public.questions q WHERE q.id = p_question AND q.validation_status = 'validated');
$$;

REVOKE ALL ON FUNCTION public.question_is_validated(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.question_is_validated(uuid) TO authenticated;

DROP POLICY "assessment_questions: add to own open assessment" ON public.assessment_questions;
CREATE POLICY "assessment_questions: add to own open assessment" ON public.assessment_questions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.assessments a
            WHERE a.id = assessment_id AND a.student_id = (SELECT auth.uid()) AND a.submitted_at IS NULL)
    AND (SELECT public.question_is_validated(question_id))
  );
