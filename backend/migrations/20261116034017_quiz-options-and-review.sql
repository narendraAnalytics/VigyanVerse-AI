-- Practice quiz options and quiz review (owner 2026-11-16).
--
-- 1. A quiz can be on a TOPIC the student types (inside the chapter), have 5, 10 or 15 questions
--    (made in parallel batches of 5 by quiz-generate, each batch fits the 30 s limit), and be
--    TIMED. The time limit is set by the server from the questions actually served (60 s per
--    MCQ, 120 s per numerical) when the student starts the timer; answer-evaluate marks a
--    submission later than limit + 30 s grace as overtime.
-- 2. quiz_review(): a student reads back one of their own SUBMITTED quizzes: every question, their
--    answer, the right answer and explanation, marks and feedback. Answer keys stay unreadable
--    for open quizzes (the student saw them when it was marked, so showing them again is safe).

ALTER TABLE public.assessments
  ADD COLUMN topic              text CHECK (char_length(topic) BETWEEN 2 AND 80),
  ADD COLUMN planned_questions  smallint CHECK (planned_questions BETWEEN 1 AND 15),
  ADD COLUMN timed              boolean NOT NULL DEFAULT false,
  -- Set only by begin_quiz_timer() / answer-evaluate (no client privilege on them).
  ADD COLUMN time_limit_seconds integer CHECK (time_limit_seconds BETWEEN 30 AND 3600),
  ADD COLUMN timer_started_at   timestamptz,
  ADD COLUMN overtime           boolean;

GRANT INSERT (topic, planned_questions, timed) ON public.assessments TO authenticated;

-- ---------------------------------------------------------------------------
-- begin_quiz_timer: start (once) the timer of the caller's own open, timed quiz.
-- Returns { started_at, limit_seconds } (the same values if it was already started).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.begin_quiz_timer(p_assessment uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  a       public.assessments%ROWTYPE;
  v_limit integer;
BEGIN
  SELECT * INTO a FROM public.assessments
  WHERE id = p_assessment AND student_id = (SELECT auth.uid())
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'assessment_not_found' USING ERRCODE = 'P0002'; END IF;
  IF NOT a.timed THEN RAISE EXCEPTION 'not_timed' USING ERRCODE = 'P0001'; END IF;
  IF a.submitted_at IS NOT NULL THEN RAISE EXCEPTION 'already_submitted' USING ERRCODE = 'P0001'; END IF;

  IF a.timer_started_at IS NULL THEN
    SELECT coalesce(sum(CASE WHEN q.type = 'numeric' THEN 120 ELSE 60 END), 0)::integer INTO v_limit
    FROM public.assessment_questions aq JOIN public.questions q ON q.id = aq.question_id
    WHERE aq.assessment_id = p_assessment;
    IF v_limit = 0 THEN RAISE EXCEPTION 'no_questions' USING ERRCODE = 'P0001'; END IF;
    UPDATE public.assessments SET timer_started_at = now(), time_limit_seconds = least(v_limit, 3600)
    WHERE id = p_assessment
    RETURNING * INTO a;
  END IF;
  RETURN jsonb_build_object('started_at', a.timer_started_at, 'limit_seconds', a.time_limit_seconds);
END;
$$;

REVOKE ALL ON FUNCTION public.begin_quiz_timer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.begin_quiz_timer(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- quiz_review: the caller's own SUBMITTED quiz, question by question (unanswered included).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.quiz_review(p_assessment uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  a public.assessments%ROWTYPE;
BEGIN
  SELECT * INTO a FROM public.assessments WHERE id = p_assessment AND student_id = (SELECT auth.uid());
  IF NOT FOUND THEN RAISE EXCEPTION 'assessment_not_found' USING ERRCODE = 'P0002'; END IF;
  IF a.submitted_at IS NULL THEN RAISE EXCEPTION 'not_submitted' USING ERRCODE = 'P0001'; END IF;

  RETURN jsonb_build_object(
    'assessment_id', a.id,
    'chapter_id', a.chapter_id,
    'topic', a.topic,
    'submitted_at', a.submitted_at,
    'score', a.score,
    'max_score', a.max_score,
    'timed', a.timed,
    'time_limit_seconds', a.time_limit_seconds,
    'time_taken_seconds', CASE WHEN a.timer_started_at IS NULL THEN NULL
                               ELSE greatest(0, round(extract(epoch FROM a.submitted_at - a.timer_started_at)))::integer END,
    'overtime', a.overtime,
    'questions', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'position', aq.position,
        'marks', aq.marks,
        'type', q.type,
        'stem', q.stem,
        'options', q.options,
        'selected_index', sa.selected_index,
        'answer_text', sa.answer_text,
        'answered', sa.id IS NOT NULL,
        'is_correct', coalesce(er.is_correct, false),
        'marks_awarded', coalesce(er.marks_awarded, 0),
        'feedback', er.feedback,
        'error_type', er.error_type,
        'correct_answer', k.answer,
        'correct_index', k.answer_index,
        'explanation', k.explanation
      ) ORDER BY aq.position)
      FROM public.assessment_questions aq
      JOIN public.questions q ON q.id = aq.question_id
      LEFT JOIN public.question_keys k ON k.question_id = q.id
      LEFT JOIN public.student_answers sa ON sa.assessment_id = aq.assessment_id AND sa.question_id = aq.question_id
      LEFT JOIN public.evaluation_results er ON er.answer_id = sa.id
      WHERE aq.assessment_id = a.id
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.quiz_review(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.quiz_review(uuid) TO authenticated;
