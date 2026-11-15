-- Rolled-back check (6a): student RLS on uploaded_documents + reserve_ai_call. Expected: reg_no_consent=blocked | reg_ok=1 | other_uid_key=blocked | client_writes_text=blocked | other_user_sees=0 | limiter=ok,ok,slow_down
DO $$
DECLARE p uuid := gen_random_uuid(); u uuid := gen_random_uuid(); v uuid := gen_random_uuid(); out text := ''; n int; r text;
BEGIN
  INSERT INTO auth.users (id, email) VALUES (p, 'rb-' || p || '@example.test'), (u, 'rb-' || u || '@example.test'), (v, 'rb-' || v || '@example.test');
  INSERT INTO public.profiles (id, role, display_name) VALUES (p, 'parent', 'P'), (u, 'student', 'T'), (v, 'student', 'T') ON CONFLICT DO NOTHING;
  INSERT INTO public.students (profile_id) VALUES (u), (v) ON CONFLICT DO NOTHING;
  EXECUTE format('SET LOCAL request.jwt.claims = %L', json_build_object('sub', u)::text);
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
    INSERT INTO public.uploaded_documents (owner_id, storage_key, mime, size_bytes) VALUES (u, u || '/a.png', 'image/png', 1000);
    out := out || 'reg_no_consent=ALLOWED(BAD) | ';
  EXCEPTION WHEN OTHERS THEN out := out || 'reg_no_consent=blocked | '; END;
  EXECUTE 'RESET ROLE';
  INSERT INTO public.parent_student_links (parent_id, student_id) VALUES (p, u);
  INSERT INTO public.consent_records (student_id, parent_id, consent_type, granted, policy_version) VALUES (u, p, 'document_upload', true, 'test');
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
    INSERT INTO public.uploaded_documents (owner_id, storage_key, mime, size_bytes) VALUES (u, u || '/a.png', 'image/png', 1000);
    SELECT count(*) INTO n FROM public.uploaded_documents;
    out := out || 'reg_ok=' || n || ' | ';
  EXCEPTION WHEN OTHERS THEN out := out || 'reg_ok=ERR ' || SQLERRM || ' | '; END;
  BEGIN
    INSERT INTO public.uploaded_documents (owner_id, storage_key, mime, size_bytes) VALUES (u, v || '/b.png', 'image/png', 1000);
    out := out || 'other_uid_key=ALLOWED(BAD) | ';
  EXCEPTION WHEN OTHERS THEN out := out || 'other_uid_key=blocked | '; END;
  BEGIN
    UPDATE public.uploaded_documents SET extracted_text = 'x' WHERE owner_id = u;
    out := out || 'client_writes_text=ALLOWED(BAD) | ';
  EXCEPTION WHEN OTHERS THEN out := out || 'client_writes_text=blocked | '; END;
  EXECUTE 'RESET ROLE';
  EXECUTE format('SET LOCAL request.jwt.claims = %L', json_build_object('sub', v)::text);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO n FROM public.uploaded_documents;
  out := out || 'other_user_sees=' || n || ' | limiter=';
  FOR n IN 1..3 LOOP
    r := public.reserve_ai_call('voice_request', 'voice-transcribe', 2, 10, 10);
    out := out || r || CASE WHEN n < 3 THEN ',' ELSE '' END;
  END LOOP;
  RAISE EXCEPTION '%', out;
END $$;
