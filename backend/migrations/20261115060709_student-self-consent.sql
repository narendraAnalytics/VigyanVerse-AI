-- Owner decision 2026-11-15: one account per student. A signed-in student no longer needs a linked
-- parent's consent to use the tutor, quizzes, photo uploads or voice. Every Edge Function and the
-- storage / uploaded_documents policies already ask has_consent(), so changing it here switches
-- all of them at once.
--
-- Unchanged: parent linking and parent consent records still work, and 'pilot_research' (the
-- optional research use of anonymised results) still needs a linked parent's recorded "granted".
-- To restore the old rule, redefine has_consent() without the student branch (see migration 2).
--
-- LEGAL NOTE for the owner: India's DPDP Act requires verifiable parental consent for under-18s.
-- This was flagged before launch in backendplan.txt; get a legal review before public release.
CREATE OR REPLACE FUNCTION public.has_consent(p_student uuid, p_consent_type text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT CASE
    WHEN NOT (p_student = auth.uid() OR public.is_parent_of(p_student) OR public.is_admin()) THEN false
    -- The student themselves (an account with a students row) for everything except research.
    WHEN p_consent_type <> 'pilot_research'
         AND p_student = auth.uid()
         AND EXISTS (SELECT 1 FROM public.students s WHERE s.profile_id = p_student) THEN true
    ELSE coalesce((
      SELECT c.granted
      FROM public.consent_records c
      WHERE c.student_id = p_student
        AND c.consent_type = p_consent_type
        AND EXISTS (
          SELECT 1 FROM public.parent_student_links l
          WHERE l.parent_id = c.parent_id AND l.student_id = c.student_id AND l.status = 'active'
        )
      ORDER BY c.created_at DESC, c.id DESC
      LIMIT 1
    ), false)
  END;
$$;
