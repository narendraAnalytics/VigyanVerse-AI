-- Migration M5c: finalize_assessment() saves a graded submission in ONE transaction (4d).
--
-- answer-evaluate grades in code, asks the Mistake Classification agent for the error type of
-- wrong answers, then calls this function with the admin client. It locks the assessment row,
-- refuses a second submission, writes student_answers + evaluation_results and sets score /
-- submitted_at. Nothing is partly saved, and two parallel submissions cannot both succeed.
-- Students cannot call it (no EXECUTE for client roles) and cannot write marks any other way.
--
-- p_results: array of { question_id, selected_index | answer_text, is_correct, marks_awarded,
--                       error_type, feedback, model } for the ANSWERED questions only.
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
  RETURN jsonb_build_object('score', v_score, 'max_score', v_max);
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_assessment(uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;
