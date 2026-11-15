-- Rolled-back check for apply_assessment_result (5b). Run one-line: see CLAUDE.md gotchas. Expected: [5] proficient 100 att5 reps1 int1 ease2.60; [5] mastered att10 reps2 int6 ease2.70; [0] developing 50 att15 reps0 int1; events=9
DO $$
DECLARE
  u uuid := gen_random_uuid();
  ch uuid;
  qs uuid[] := '{}';
  qid uuid;
  a uuid;
  i int;
  rnd int;
  res jsonb;
  out text := '';
  m record;
  s record;
BEGIN
  INSERT INTO auth.users (id, email) VALUES (u, 'rolledback-' || u || '@example.test');
  INSERT INTO public.profiles (id, role, display_name) VALUES (u, 'student', 'Test') ON CONFLICT DO NOTHING;
  INSERT INTO public.students (profile_id) VALUES (u) ON CONFLICT DO NOTHING;
  SELECT id INTO ch FROM public.chapters LIMIT 1;
  FOR i IN 1..5 LOOP
    INSERT INTO public.questions (chapter_id, type, language, stem, options, source_chunk_ids)
    VALUES (ch, 'mcq', 'en', 'Test question number ' || i, '["a","b","c","d"]', ARRAY[gen_random_uuid()]) RETURNING id INTO qid;
    qs := qs || qid;
  END LOOP;
  FOREACH rnd IN ARRAY ARRAY[5, 5, 0] LOOP
    INSERT INTO public.assessments (student_id, chapter_id) VALUES (u, ch) RETURNING id INTO a;
    res := '[]'::jsonb;
    FOR i IN 1..5 LOOP
      INSERT INTO public.assessment_questions (assessment_id, question_id, position) VALUES (a, qs[i], i);
      res := res || jsonb_build_array(jsonb_build_object('question_id', qs[i], 'selected_index', 0, 'is_correct', i <= rnd, 'marks_awarded', CASE WHEN i <= rnd THEN 1 ELSE 0 END, 'error_type', CASE WHEN i <= rnd THEN '' ELSE 'conceptual' END));
    END LOOP;
    PERFORM public.finalize_assessment(a, u, res);
    SELECT * INTO m FROM public.chapter_mastery WHERE student_id = u;
    SELECT * INTO s FROM public.revision_schedule WHERE student_id = u;
    out := out || format('[%s correct] state=%s score=%s att=%s | reps=%s int=%s ease=%s; ', rnd, m.state, m.score, m.attempts, s.repetitions, s.interval_days, s.ease);
  END LOOP;
  out := out || 'events=' || (SELECT count(*) FROM public.learning_events WHERE student_id = u);
  RAISE EXCEPTION '%', out;
END $$;
