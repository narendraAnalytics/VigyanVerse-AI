-- Migration M5: assessment (questions, answer keys, assessments, answers, results) and the
-- quiz request limit for the quiz-generate function (Phase 4c).
--
-- Who writes what:
--   questions + question_keys   quiz-generate writes them with the project admin client AFTER
--                               the student's consent and limits were checked. A student can
--                               never insert a question, so every question was validated by
--                               the Assessment Validation agent (4b).
--   assessments, assessment_questions, student_answers
--                               the student, as themselves (RLS: only their own rows).
--   evaluation_results          answer-evaluate only (admin client, Phase 4d): a student
--                               cannot write their own marks.
-- The ANSWER KEY is in a separate table (question_keys) that no client role can read, so a
-- student can never fetch the answer before answering. Questions are readable only when they
-- are part of the student's own assessment, and only the non-secret columns.

-- ============================================================================
-- questions (the bank: what a student may see)
-- ============================================================================
CREATE TABLE public.questions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id          uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  topic_id            uuid REFERENCES public.topics(id) ON DELETE SET NULL,
  type                text NOT NULL CHECK (type IN ('mcq', 'numeric')),
  difficulty          smallint NOT NULL DEFAULT 2 CHECK (difficulty BETWEEN 1 AND 3),
  language            text NOT NULL CHECK (language IN ('en', 'te')),
  stem                text NOT NULL CHECK (char_length(stem) BETWEEN 10 AND 800),
  -- MCQ: exactly 4 option strings (already shuffled by code); numeric: NULL.
  options             jsonb CHECK (options IS NULL OR (jsonb_typeof(options) = 'array' AND jsonb_array_length(options) = 4)),
  source_chunk_ids    uuid[] NOT NULL DEFAULT '{}' CHECK (cardinality(source_chunk_ids) BETWEEN 1 AND 5),
  -- Built by code from the cited chunks' metadata (never from model text).
  citations           jsonb NOT NULL DEFAULT '[]'::jsonb
                      CHECK (jsonb_typeof(citations) = 'array' AND pg_column_size(citations) <= 4096),
  verified_numeric    boolean NOT NULL DEFAULT false,
  generated_by_model  text CHECK (char_length(generated_by_model) <= 60),
  validated_by_model  text CHECK (char_length(validated_by_model) <= 60),
  -- Only validated questions are ever stored today; 'rejected' is kept for later audits.
  validation_status   text NOT NULL DEFAULT 'validated'
                      CHECK (validation_status IN ('pending', 'validated', 'rejected')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  CHECK ((type = 'mcq') = (options IS NOT NULL))
);

CREATE INDEX questions_chapter_idx ON public.questions (chapter_id, validation_status);
CREATE INDEX questions_topic_idx ON public.questions (topic_id);

-- ============================================================================
-- question_keys (the answer key: NO client access at all)
-- ============================================================================
CREATE TABLE public.question_keys (
  question_id   uuid PRIMARY KEY REFERENCES public.questions(id) ON DELETE CASCADE,
  -- MCQ: index 0-3 of the right option; numeric: NULL.
  answer_index  smallint CHECK (answer_index BETWEEN 0 AND 3),
  -- MCQ: the option text; numeric: "3 A".
  answer        text NOT NULL CHECK (char_length(answer) BETWEEN 1 AND 300),
  explanation   text NOT NULL DEFAULT '' CHECK (char_length(explanation) <= 1000),
  -- Numeric only: the givens, expression and unit the calculator used (re-check, audits).
  work          jsonb CHECK (work IS NULL OR (jsonb_typeof(work) = 'object' AND pg_column_size(work) <= 2048))
);

-- ============================================================================
-- assessments (one quiz attempt) and its questions
-- ============================================================================
CREATE TABLE public.assessments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    uuid NOT NULL DEFAULT auth.uid() REFERENCES public.students(profile_id) ON DELETE CASCADE,
  kind          text NOT NULL DEFAULT 'practice'
                CHECK (kind IN ('practice', 'chapter', 'diagnostic', 'pilot_pre', 'pilot_post')),
  chapter_id    uuid REFERENCES public.chapters(id) ON DELETE SET NULL,
  language      text NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'te')),
  started_at    timestamptz NOT NULL DEFAULT now(),
  -- Set, with the score, only by answer-evaluate (no client can write them).
  submitted_at  timestamptz,
  score         numeric(6, 2) CHECK (score >= 0),
  max_score     numeric(6, 2) CHECK (max_score >= 0),
  CHECK (score IS NULL OR max_score IS NOT NULL)
);

CREATE INDEX assessments_student_started_idx ON public.assessments (student_id, started_at DESC);
CREATE INDEX assessments_chapter_idx ON public.assessments (chapter_id);

CREATE TABLE public.assessment_questions (
  assessment_id  uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  question_id    uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  position       smallint NOT NULL CHECK (position BETWEEN 1 AND 50),
  marks          smallint NOT NULL DEFAULT 1 CHECK (marks BETWEEN 1 AND 10),
  PRIMARY KEY (assessment_id, question_id),
  UNIQUE (assessment_id, position)
);

CREATE INDEX assessment_questions_question_idx ON public.assessment_questions (question_id);

-- ============================================================================
-- student_answers (one answer per question per assessment) + evaluation_results
-- ============================================================================
CREATE TABLE public.student_answers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id   uuid NOT NULL,
  question_id     uuid NOT NULL,
  student_id      uuid NOT NULL DEFAULT auth.uid() REFERENCES public.students(profile_id) ON DELETE CASCADE,
  -- MCQ: the chosen option index; numeric: NULL.
  selected_index  smallint CHECK (selected_index BETWEEN 0 AND 3),
  -- Numeric: what the student typed ("3 A"); MCQ: NULL.
  answer_text     text CHECK (char_length(answer_text) BETWEEN 1 AND 200),
  answered_at     timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (assessment_id, question_id) REFERENCES public.assessment_questions(assessment_id, question_id) ON DELETE CASCADE,
  UNIQUE (assessment_id, question_id),
  CHECK ((selected_index IS NULL) <> (answer_text IS NULL))
);

CREATE INDEX student_answers_student_idx ON public.student_answers (student_id, answered_at DESC);
CREATE INDEX student_answers_question_idx ON public.student_answers (question_id);

CREATE TABLE public.evaluation_results (
  answer_id      uuid PRIMARY KEY REFERENCES public.student_answers(id) ON DELETE CASCADE,
  student_id     uuid NOT NULL REFERENCES public.students(profile_id) ON DELETE CASCADE,
  is_correct     boolean NOT NULL,
  marks_awarded  numeric(5, 2) NOT NULL CHECK (marks_awarded >= 0),
  -- Set for wrong answers by the Mistake Classification agent (4d).
  error_type     text CHECK (error_type IN (
                   'conceptual', 'calculation', 'formula_selection', 'interpretation',
                   'incomplete', 'terminology', 'diagram_label')),
  feedback       text CHECK (char_length(feedback) <= 800),
  model          text CHECK (char_length(model) <= 60),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX evaluation_results_student_idx ON public.evaluation_results (student_id, created_at DESC);

-- ============================================================================
-- Quiz request limit (same pattern as reserve_turn: check + count in one locked step)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reserve_quiz(
  p_max_per_minute integer,
  p_max_per_day    integer,
  p_max_cost_inr   numeric
)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
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

  PERFORM pg_advisory_xact_lock(hashtextextended('reserve_quiz:' || v_uid::text, 0));

  SELECT
    count(*) FILTER (WHERE u.agent = 'quiz_request' AND u.created_at > now() - interval '1 minute'),
    count(*) FILTER (WHERE u.agent = 'quiz_request' AND u.created_at >= v_start),
    coalesce(sum(u.cost_inr) FILTER (WHERE u.created_at >= v_start), 0)
  INTO v_minute, v_day, v_cost
  FROM public.model_usage u
  WHERE u.user_id = v_uid
    AND u.created_at >= least(v_start, now() - interval '1 minute');

  IF v_minute >= p_max_per_minute THEN
    RETURN 'slow_down';
  END IF;
  -- The rupee cap is shared with tutor chat (all model_usage of the student today).
  IF v_day >= p_max_per_day OR v_cost >= p_max_cost_inr THEN
    RETURN 'daily_limit';
  END IF;

  INSERT INTO public.model_usage (user_id, function_slug, agent)
  VALUES (v_uid, 'quiz-generate', 'quiz_request');
  RETURN 'ok';
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_quiz(integer, integer, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserve_quiz(integer, integer, numeric) TO authenticated;

-- ============================================================================
-- RLS + privileges
-- ============================================================================
ALTER TABLE public.questions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_keys        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_results   ENABLE ROW LEVEL SECURITY;

-- questions: a student reads only questions in their own assessments (non-secret columns only).
CREATE POLICY "questions: read in own assessment" ON public.questions
  FOR SELECT TO authenticated
  USING (validation_status = 'validated' AND EXISTS (
    SELECT 1 FROM public.assessment_questions aq
    JOIN public.assessments a ON a.id = aq.assessment_id
    WHERE aq.question_id = questions.id AND a.student_id = (SELECT auth.uid())
  ));
CREATE POLICY "questions: admin read" ON public.questions
  FOR SELECT TO authenticated USING ((SELECT public.is_admin()));

REVOKE ALL ON public.questions FROM anon, authenticated;
GRANT SELECT (id, chapter_id, topic_id, type, difficulty, language, stem, options,
              source_chunk_ids, citations, verified_numeric, created_at)
  ON public.questions TO authenticated;

-- question_keys: no policy and no privilege for any client role (admin client only).
REVOKE ALL ON public.question_keys FROM anon, authenticated;

-- assessments: the student creates and reads their own; marks and submission are server-only.
CREATE POLICY "assessments: read own" ON public.assessments
  FOR SELECT TO authenticated USING (student_id = (SELECT auth.uid()));
CREATE POLICY "assessments: create own" ON public.assessments
  FOR INSERT TO authenticated
  WITH CHECK (student_id = (SELECT auth.uid()) AND submitted_at IS NULL AND score IS NULL);
CREATE POLICY "assessments: delete own" ON public.assessments
  FOR DELETE TO authenticated USING (student_id = (SELECT auth.uid()));

REVOKE ALL ON public.assessments FROM anon, authenticated;
GRANT SELECT, DELETE ON public.assessments TO authenticated;
GRANT INSERT (student_id, kind, chapter_id, language) ON public.assessments TO authenticated;

-- assessment_questions: add only validated questions to your own, still open, assessment.
CREATE POLICY "assessment_questions: read own" ON public.assessment_questions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND a.student_id = (SELECT auth.uid())));
CREATE POLICY "assessment_questions: add to own open assessment" ON public.assessment_questions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.assessments a
            WHERE a.id = assessment_id AND a.student_id = (SELECT auth.uid()) AND a.submitted_at IS NULL)
    AND EXISTS (SELECT 1 FROM public.questions q WHERE q.id = question_id AND q.validation_status = 'validated')
  );

REVOKE ALL ON public.assessment_questions FROM anon, authenticated;
GRANT SELECT ON public.assessment_questions TO authenticated;
GRANT INSERT (assessment_id, question_id, position, marks) ON public.assessment_questions TO authenticated;

-- student_answers: answer once, in your own open assessment, for a question in it.
CREATE POLICY "student_answers: read own" ON public.student_answers
  FOR SELECT TO authenticated USING (student_id = (SELECT auth.uid()));
CREATE POLICY "student_answers: answer own open assessment" ON public.student_answers
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.assessments a
                WHERE a.id = assessment_id AND a.student_id = (SELECT auth.uid()) AND a.submitted_at IS NULL)
  );

REVOKE ALL ON public.student_answers FROM anon, authenticated;
GRANT SELECT ON public.student_answers TO authenticated;
GRANT INSERT (assessment_id, question_id, student_id, selected_index, answer_text) ON public.student_answers TO authenticated;

-- evaluation_results: the student reads their own; only the server writes.
CREATE POLICY "evaluation_results: read own" ON public.evaluation_results
  FOR SELECT TO authenticated USING (student_id = (SELECT auth.uid()));

REVOKE ALL ON public.evaluation_results FROM anon, authenticated;
GRANT SELECT ON public.evaluation_results TO authenticated;
