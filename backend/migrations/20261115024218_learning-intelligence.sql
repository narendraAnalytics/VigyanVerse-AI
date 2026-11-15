-- Migration M6: learning intelligence tables, PER CHAPTER only (Phase 5a).
--
-- Owner decision 2026-11-14: mastery is tracked per chapter; the topics table is empty and needs
-- an official source, so topic-level tracking comes later.
--
-- Who writes what: NO client role can write any of these tables. The mastery and schedule rows
-- are changed only by deterministic SQL (apply_answer_result, Phase 5b) called by the server
-- with the admin client after an answer is graded. An LLM never decides a mastery state.
-- Who reads: the student, a linked parent (is_parent_of) and admins.

-- ============================================================================
-- chapter_mastery: one row per student per chapter
-- ============================================================================
CREATE TABLE public.chapter_mastery (
  student_id         uuid NOT NULL REFERENCES public.students(profile_id) ON DELETE CASCADE,
  chapter_id         uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  state              text NOT NULL DEFAULT 'not_started'
                     CHECK (state IN ('not_started', 'learning', 'developing', 'proficient', 'mastered')),
  -- 0-100, a moving average of recent answers (formula in 5b).
  score              numeric(5, 2) NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  attempts           integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  correct            integer NOT NULL DEFAULT 0 CHECK (correct >= 0 AND correct <= attempts),
  last_practiced_at  timestamptz,
  updated_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, chapter_id)
);

CREATE INDEX chapter_mastery_chapter_idx ON public.chapter_mastery (chapter_id);

-- ============================================================================
-- revision_schedule: SM-2 style spaced repetition, one row per student per chapter
-- ============================================================================
CREATE TABLE public.revision_schedule (
  student_id        uuid NOT NULL REFERENCES public.students(profile_id) ON DELETE CASCADE,
  chapter_id        uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  due_at            timestamptz NOT NULL,
  interval_days     integer NOT NULL DEFAULT 1 CHECK (interval_days BETWEEN 0 AND 365),
  -- SM-2 ease factor; never below 1.3.
  ease              numeric(3, 2) NOT NULL DEFAULT 2.50 CHECK (ease BETWEEN 1.30 AND 3.50),
  repetitions       integer NOT NULL DEFAULT 0 CHECK (repetitions >= 0),
  last_reviewed_at  timestamptz,
  PRIMARY KEY (student_id, chapter_id)
);

-- "What is due for this student?" (next-activity, 5c)
CREATE INDEX revision_schedule_due_idx ON public.revision_schedule (student_id, due_at);
CREATE INDEX revision_schedule_chapter_idx ON public.revision_schedule (chapter_id);

-- ============================================================================
-- learning_events: append-only log (what happened, for audits and the parent view)
-- ============================================================================
CREATE TABLE public.learning_events (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id  uuid NOT NULL REFERENCES public.students(profile_id) ON DELETE CASCADE,
  chapter_id  uuid REFERENCES public.chapters(id) ON DELETE SET NULL,
  event_type  text NOT NULL
              CHECK (event_type IN ('answer_graded', 'assessment_submitted', 'mastery_changed', 'revision_scheduled')),
  payload     jsonb NOT NULL DEFAULT '{}'::jsonb
              CHECK (jsonb_typeof(payload) = 'object' AND pg_column_size(payload) <= 1024),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX learning_events_student_idx ON public.learning_events (student_id, created_at DESC);
CREATE INDEX learning_events_chapter_idx ON public.learning_events (chapter_id);

-- ============================================================================
-- RLS + privileges: read only for clients, no writes at all
-- ============================================================================
ALTER TABLE public.chapter_mastery   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revision_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_events   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chapter_mastery: read own, linked parent, admin" ON public.chapter_mastery
  FOR SELECT TO authenticated
  USING (student_id = (SELECT auth.uid()) OR (SELECT public.is_parent_of(student_id)) OR (SELECT public.is_admin()));

CREATE POLICY "revision_schedule: read own, linked parent, admin" ON public.revision_schedule
  FOR SELECT TO authenticated
  USING (student_id = (SELECT auth.uid()) OR (SELECT public.is_parent_of(student_id)) OR (SELECT public.is_admin()));

CREATE POLICY "learning_events: read own, linked parent, admin" ON public.learning_events
  FOR SELECT TO authenticated
  USING (student_id = (SELECT auth.uid()) OR (SELECT public.is_parent_of(student_id)) OR (SELECT public.is_admin()));

REVOKE ALL ON public.chapter_mastery   FROM anon, authenticated;
REVOKE ALL ON public.revision_schedule FROM anon, authenticated;
REVOKE ALL ON public.learning_events   FROM anon, authenticated;
GRANT SELECT ON public.chapter_mastery   TO authenticated;
GRANT SELECT ON public.revision_schedule TO authenticated;
GRANT SELECT ON public.learning_events   TO authenticated;
