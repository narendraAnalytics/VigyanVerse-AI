-- Migration M6c: next_activity() = what should this student practise next? (Phase 5c)
-- Pure SQL, no LLM. The advice wording (5d) only phrases this result; it never chooses.
--
-- SECURITY INVOKER: RLS decides what the caller can read. The student reads their own data; a
-- linked parent reads mastery and schedule (evaluation_results are student-only, so a parent
-- gets no error-type list). p_student defaults to the caller.
--
-- Pick order (kind):
--   revise_due        a revision is due now (due_at <= now): the most overdue chapter first
--   practise_weakest  no revision due: the practised chapter with state learning/developing and
--                     the lowest score
--   start_new         nothing weak: the first chapter not started yet (syllabus order)
--   keep_going        everything practised is proficient or mastered: the lowest-score chapter
-- Only summative chapters of the student's board + grade are ever recommended
-- (formative_only chapters get no year-end-style quizzes). Returns kind = 'none' when there is
-- nothing to recommend (e.g. no chapters for the board).
-- top_errors: the 3 most frequent mistake types in the last 30 days, for the recommended chapter.
CREATE OR REPLACE FUNCTION public.next_activity(p_student uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_student uuid := coalesce(p_student, auth.uid());
  v_board   text;
  v_grade   smallint;
  v_kind    text := 'none';
  v_chapter uuid;
  v_title   text;
  v_state   text;
  v_score   numeric;
  v_due     timestamptz;
  v_errors  jsonb;
  v_due_n   integer;
  v_pri     integer;
BEGIN
  IF v_student IS NULL THEN
    RAISE EXCEPTION 'not signed in' USING ERRCODE = '42501';
  END IF;
  IF NOT (v_student = auth.uid() OR public.is_parent_of(v_student) OR public.is_admin()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT s.board_code, s.grade INTO v_board, v_grade
  FROM public.students s WHERE s.profile_id = v_student;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'student_not_found' USING ERRCODE = 'P0002';
  END IF;

  WITH ch AS (
    SELECT c.id AS chapter_id, c.title_en AS title, c.sort_order,
           coalesce(m.state, 'not_started') AS state, coalesce(m.score, 0) AS score, r.due_at
    FROM public.chapters c
    LEFT JOIN public.chapter_mastery m ON m.chapter_id = c.id AND m.student_id = v_student
    LEFT JOIN public.revision_schedule r ON r.chapter_id = c.id AND r.student_id = v_student
    WHERE c.is_active AND c.assessment_scope = 'summative'
      AND c.grade = v_grade AND (v_board IS NULL OR c.board_code = v_board)
  ), ranked AS (
    SELECT ch.*,
           CASE WHEN due_at <= now() THEN 1
                WHEN state IN ('learning', 'developing') THEN 2
                WHEN state = 'not_started' THEN 3
                ELSE 4 END AS pri
    FROM ch
  )
  SELECT r.pri, r.chapter_id, r.title, r.state, r.score, r.due_at,
         (SELECT count(*) FROM ranked x WHERE x.pri = 1)::integer
  INTO v_pri, v_chapter, v_title, v_state, v_score, v_due, v_due_n
  FROM ranked r
  ORDER BY r.pri,
           CASE WHEN r.pri = 1 THEN extract(epoch FROM r.due_at) ELSE 0 END,
           CASE WHEN r.pri <> 3 THEN r.score ELSE 0 END,
           r.sort_order
  LIMIT 1;

  IF FOUND THEN
    v_kind := CASE v_pri WHEN 1 THEN 'revise_due' WHEN 2 THEN 'practise_weakest' WHEN 3 THEN 'start_new' ELSE 'keep_going' END;
  END IF;
  v_due_n := coalesce(v_due_n, 0);

  SELECT coalesce(jsonb_agg(jsonb_build_object('error_type', e.error_type, 'count', e.n) ORDER BY e.n DESC, e.error_type), '[]'::jsonb)
  INTO v_errors
  FROM (
    SELECT er.error_type, count(*) AS n
    FROM public.evaluation_results er
    JOIN public.student_answers sa ON sa.id = er.answer_id
    JOIN public.questions q ON q.id = sa.question_id
    WHERE er.student_id = v_student AND er.error_type IS NOT NULL
      AND er.created_at > now() - interval '30 days'
      AND v_chapter IS NOT NULL AND q.chapter_id = v_chapter
    GROUP BY er.error_type
    ORDER BY n DESC, er.error_type
    LIMIT 3
  ) e;

  RETURN jsonb_build_object(
    'kind', v_kind,
    'chapter_id', v_chapter,
    'chapter_title', v_title,
    'state', v_state,
    'score', v_score,
    'due_at', v_due,
    'due_count', v_due_n,
    'top_errors', v_errors
  );
END;
$$;

REVOKE ALL ON FUNCTION public.next_activity(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_activity(uuid) TO authenticated;
