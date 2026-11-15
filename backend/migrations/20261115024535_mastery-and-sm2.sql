-- Migration M6b: deterministic mastery + SM-2 revision schedule (Phase 5b). No LLM involved.
--
-- finalize_assessment() (M5c) now calls apply_assessment_result() as its last step, in the SAME
-- transaction: a graded submission and the mastery update are saved together or not at all, and
-- the existing already_submitted lock means each assessment is applied exactly once.
--
-- Rules (defaults chosen 2026-11-15; change them here, with a new migration):
--   Evidence per chapter = the answered questions of THIS assessment in that chapter:
--     n answered, k correct, accuracy = k / n.
--   Score (0-100) = moving average of accuracy. First attempt: score = accuracy * 100.
--     Later: score = old * (1 - a) + accuracy * 100 * a, a = least(0.6, greatest(0.1, 0.1 * n)),
--     so a 1-question quiz moves the score a little and a 6+ question quiz moves it a lot.
--   State (needs enough evidence, counted in answers over all time):
--     attempts < 5            -> learning (cannot be higher)
--     score < 50              -> learning
--     50 <= score < 70        -> developing
--     70 <= score < 85        -> proficient
--     score >= 85 and attempts >= 10 -> mastered (else proficient)
--   SM-2 (Wozniak): accuracy -> quality q: >=0.9:5, >=0.8:4, >=0.6:3, >=0.4:2, >=0.2:1, else 0.
--     q < 3: repetitions = 0, interval = 1 day, ease unchanged.
--     q >= 3: repetitions + 1; interval 1, then 6, then round(interval * ease); ease
--     += 0.1 - (5-q)(0.08 + (5-q)0.02), clamped 1.30 - 3.50; interval at most 365 days.
--   due_at = now() + interval days.

-- Pure helpers (IMMUTABLE, easy to unit test)
CREATE OR REPLACE FUNCTION public.mastery_state(p_score numeric, p_attempts integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT CASE
    WHEN p_attempts < 5 OR p_score < 50 THEN 'learning'
    WHEN p_score < 70 THEN 'developing'
    WHEN p_score < 85 OR p_attempts < 10 THEN 'proficient'
    ELSE 'mastered'
  END;
$$;

CREATE OR REPLACE FUNCTION public.sm2_quality(p_accuracy numeric)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT CASE
    WHEN p_accuracy >= 0.9 THEN 5
    WHEN p_accuracy >= 0.8 THEN 4
    WHEN p_accuracy >= 0.6 THEN 3
    WHEN p_accuracy >= 0.4 THEN 2
    WHEN p_accuracy >= 0.2 THEN 1
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION public.apply_assessment_result(p_assessment uuid, p_student uuid)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  c          record;
  m          public.chapter_mastery%ROWTYPE;
  s          public.revision_schedule%ROWTYPE;
  v_acc      numeric;
  v_alpha    numeric;
  v_score    numeric;
  v_state    text;
  v_old      text;
  v_q        integer;
  v_interval integer;
BEGIN
  FOR c IN
    SELECT q.chapter_id, count(*)::integer AS n, count(*) FILTER (WHERE er.is_correct)::integer AS k
    FROM public.student_answers sa
    JOIN public.evaluation_results er ON er.answer_id = sa.id
    JOIN public.questions q ON q.id = sa.question_id
    WHERE sa.assessment_id = p_assessment AND sa.student_id = p_student
    GROUP BY q.chapter_id
    ORDER BY q.chapter_id
  LOOP
    v_acc := c.k::numeric / c.n;

    -- mastery: create the row if missing, then lock it
    INSERT INTO public.chapter_mastery (student_id, chapter_id)
    VALUES (p_student, c.chapter_id)
    ON CONFLICT DO NOTHING;
    SELECT * INTO m FROM public.chapter_mastery
    WHERE student_id = p_student AND chapter_id = c.chapter_id FOR UPDATE;

    v_old := m.state;
    IF m.attempts = 0 THEN
      v_score := v_acc * 100;
    ELSE
      v_alpha := least(0.6, greatest(0.1, 0.1 * c.n));
      v_score := m.score * (1 - v_alpha) + v_acc * 100 * v_alpha;
    END IF;
    v_score := round(least(100, greatest(0, v_score)), 2);
    v_state := public.mastery_state(v_score, m.attempts + c.n);

    UPDATE public.chapter_mastery
    SET score = v_score, state = v_state, attempts = m.attempts + c.n, correct = m.correct + c.k,
        last_practiced_at = now(), updated_at = now()
    WHERE student_id = p_student AND chapter_id = c.chapter_id;

    -- SM-2 schedule
    INSERT INTO public.revision_schedule (student_id, chapter_id, due_at)
    VALUES (p_student, c.chapter_id, now())
    ON CONFLICT DO NOTHING;
    SELECT * INTO s FROM public.revision_schedule
    WHERE student_id = p_student AND chapter_id = c.chapter_id FOR UPDATE;

    v_q := public.sm2_quality(v_acc);
    IF v_q < 3 THEN
      s.repetitions := 0;
      v_interval := 1;
    ELSE
      s.repetitions := s.repetitions + 1;
      v_interval := CASE s.repetitions
        WHEN 1 THEN 1
        WHEN 2 THEN 6
        ELSE greatest(s.interval_days + 1, round(s.interval_days * s.ease)::integer)
      END;
      s.ease := least(3.50, greatest(1.30, s.ease + 0.1 - (5 - v_q) * (0.08 + (5 - v_q) * 0.02)));
    END IF;
    v_interval := least(365, v_interval);

    UPDATE public.revision_schedule
    SET repetitions = s.repetitions, interval_days = v_interval, ease = s.ease,
        due_at = now() + make_interval(days => v_interval), last_reviewed_at = now()
    WHERE student_id = p_student AND chapter_id = c.chapter_id;

    -- append-only log
    INSERT INTO public.learning_events (student_id, chapter_id, event_type, payload)
    VALUES (p_student, c.chapter_id, 'assessment_submitted',
            jsonb_build_object('assessment_id', p_assessment, 'answered', c.n, 'correct', c.k, 'quality', v_q));
    IF v_state IS DISTINCT FROM v_old THEN
      INSERT INTO public.learning_events (student_id, chapter_id, event_type, payload)
      VALUES (p_student, c.chapter_id, 'mastery_changed',
              jsonb_build_object('from', v_old, 'to', v_state, 'score', v_score));
    END IF;
    INSERT INTO public.learning_events (student_id, chapter_id, event_type, payload)
    VALUES (p_student, c.chapter_id, 'revision_scheduled',
            jsonb_build_object('interval_days', v_interval, 'repetitions', s.repetitions, 'ease', s.ease));
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_assessment_result(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mastery_state(numeric, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sm2_quality(numeric) FROM PUBLIC, anon, authenticated;

-- finalize_assessment(): same as M5c plus the mastery step at the end (same transaction).
CREATE OR REPLACE FUNCTION public.finalize_assessment(p_assessment uuid, p_student uuid, p_results jsonb)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_submitted timestamptz;
  v_found     boolean;
  v_max       numeric;
  v_score     numeric;
  v_answer    uuid;
  r           jsonb;
BEGIN
  IF jsonb_typeof(p_results) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'bad_results' USING ERRCODE = 'P0001';
  END IF;

  SELECT a.submitted_at, true INTO v_submitted, v_found
  FROM public.assessments a
  WHERE a.id = p_assessment AND a.student_id = p_student
  FOR UPDATE;
  IF NOT coalesce(v_found, false) THEN
    RAISE EXCEPTION 'assessment_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_submitted IS NOT NULL THEN
    RAISE EXCEPTION 'already_submitted' USING ERRCODE = 'P0001';
  END IF;

  FOR r IN SELECT * FROM jsonb_array_elements(p_results) LOOP
    INSERT INTO public.student_answers (assessment_id, question_id, student_id, selected_index, answer_text)
    VALUES (p_assessment, (r->>'question_id')::uuid, p_student, (r->>'selected_index')::smallint, r->>'answer_text')
    RETURNING id INTO v_answer;

    INSERT INTO public.evaluation_results (answer_id, student_id, is_correct, marks_awarded, error_type, feedback, model)
    VALUES (v_answer, p_student, (r->>'is_correct')::boolean, (r->>'marks_awarded')::numeric,
            nullif(r->>'error_type', ''), nullif(r->>'feedback', ''), nullif(r->>'model', ''));
  END LOOP;

  SELECT coalesce(sum(aq.marks), 0) INTO v_max FROM public.assessment_questions aq WHERE aq.assessment_id = p_assessment;
  SELECT coalesce(sum(er.marks_awarded), 0) INTO v_score
  FROM public.evaluation_results er JOIN public.student_answers sa ON sa.id = er.answer_id
  WHERE sa.assessment_id = p_assessment;

  UPDATE public.assessments SET submitted_at = now(), score = v_score, max_score = v_max WHERE id = p_assessment;

  PERFORM public.apply_assessment_result(p_assessment, p_student);

  RETURN jsonb_build_object('score', v_score, 'max_score', v_max);
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_assessment(uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;
