-- Rolled-back check for next_activity (5c). Expected: 1 start_new (first chapter); 2 practise_weakest (learning, top_errors conceptual 3 + calculation 2); 3 revise_due (due_count 1)
DO $$
DECLARE
  u uuid := gen_random_uuid();
  ch uuid; qs uuid[] := '{}'; qid uuid; a uuid; i int; res jsonb := '[]'::jsonb; out text := '';
  r1 jsonb; r2 jsonb; r3 jsonb; bc text; gr smallint; first_ch uuid;
BEGIN
  SELECT id, board_code, grade INTO ch, bc, gr FROM public.chapters WHERE is_active AND assessment_scope = 'summative' ORDER BY sort_order DESC LIMIT 1;
  SELECT id INTO first_ch FROM public.chapters WHERE is_active AND assessment_scope = 'summative' AND board_code = bc AND grade = gr ORDER BY sort_order LIMIT 1;
  INSERT INTO auth.users (id, email) VALUES (u, 'rolledback-' || u || '@example.test');
  INSERT INTO public.profiles (id, role, display_name) VALUES (u, 'student', 'Test') ON CONFLICT DO NOTHING;
  INSERT INTO public.students (profile_id, board_code, grade) VALUES (u, bc, gr) ON CONFLICT (profile_id) DO UPDATE SET board_code = bc, grade = gr;
  r1 := public.next_activity(u);
  FOR i IN 1..5 LOOP
    INSERT INTO public.questions (chapter_id, type, language, stem, options, source_chunk_ids) VALUES (ch, 'mcq', 'en', 'Test question number ' || i, '["a","b","c","d"]', ARRAY[gen_random_uuid()]) RETURNING id INTO qid;
    qs := qs || qid;
  END LOOP;
  INSERT INTO public.assessments (student_id, chapter_id) VALUES (u, ch) RETURNING id INTO a;
  FOR i IN 1..5 LOOP
    INSERT INTO public.assessment_questions (assessment_id, question_id, position) VALUES (a, qs[i], i);
    res := res || jsonb_build_array(jsonb_build_object('question_id', qs[i], 'selected_index', 0, 'is_correct', false, 'marks_awarded', 0, 'error_type', CASE WHEN i < 4 THEN 'conceptual' ELSE 'calculation' END));
  END LOOP;
  PERFORM public.finalize_assessment(a, u, res);
  r2 := public.next_activity(u);
  UPDATE public.revision_schedule SET due_at = now() - interval '2 days' WHERE student_id = u;
  r3 := public.next_activity(u);
  RAISE EXCEPTION 'first_expected=% | 1: % | 2: % | 3: %', first_ch, r1, r2, r3;
END $$;
