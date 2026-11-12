-- Migration 2: students, parent-student linking, verifiable parental consent.
--
-- Flow:
--   1. Student signs up -> inserts own profiles row (role 'student') + students row.
--   2. Student calls rpc create_parent_invite() -> gets a one-time code (48 h).
--   3. Parent signs up (role 'parent') and calls rpc accept_parent_invite(code).
--   4. Parent calls rpc record_consent(student, type, granted, policy_version).
--   5. Edge Functions call has_consent(student, 'ai_tutoring') before any AI work.
-- Clients never write link / invite / consent tables directly; only these RPCs do.

-- ============================================================================
-- Students (minimal personal data: no full DOB, no phone, no address)
-- ============================================================================
CREATE TABLE public.students (
  profile_id              uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  board_code              text REFERENCES public.boards(code) ON UPDATE CASCADE,
  grade                   smallint NOT NULL DEFAULT 10 CHECK (grade BETWEEN 1 AND 12),
  birth_year              smallint CHECK (birth_year BETWEEN 1990 AND 2030),
  onboarding_completed_at timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX students_board_code_idx ON public.students (board_code);

CREATE TRIGGER students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

-- ============================================================================
-- Parent <-> student links
-- ============================================================================
CREATE TABLE public.parent_student_links (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(profile_id) ON DELETE CASCADE,
  status     text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (parent_id, student_id),
  CHECK ((status = 'revoked') = (revoked_at IS NOT NULL))
);

CREATE INDEX parent_student_links_student_id_idx ON public.parent_student_links (student_id);

CREATE TRIGGER parent_student_links_updated_at
  BEFORE UPDATE ON public.parent_student_links
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

-- One-time invite codes. Only the SHA-256 hash is stored.
CREATE TABLE public.parent_invites (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(profile_id) ON DELETE CASCADE,
  code_hash  text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  used_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX parent_invites_code_hash_key ON public.parent_invites (code_hash);
CREATE INDEX parent_invites_student_id_idx ON public.parent_invites (student_id);
CREATE INDEX parent_invites_used_by_idx ON public.parent_invites (used_by);

-- Failed invite attempts, for brute-force throttling.
CREATE TABLE public.parent_invite_attempts (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  parent_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX parent_invite_attempts_parent_time_idx
  ON public.parent_invite_attempts (parent_id, attempted_at DESC);

-- ============================================================================
-- Consent records (append-only history; latest row per type wins)
-- ============================================================================
CREATE TABLE public.consent_records (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id     uuid NOT NULL REFERENCES public.students(profile_id) ON DELETE CASCADE,
  parent_id      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  consent_type   text NOT NULL CHECK (consent_type IN (
                   'platform_use', 'ai_tutoring', 'document_upload',
                   'voice_recording', 'pilot_research')),
  granted        boolean NOT NULL,
  policy_version text NOT NULL CHECK (char_length(policy_version) BETWEEN 1 AND 20),
  method         text NOT NULL DEFAULT 'parent_account_in_app',
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX consent_records_student_type_time_idx
  ON public.consent_records (student_id, consent_type, created_at DESC, id DESC);
CREATE INDEX consent_records_parent_id_idx ON public.consent_records (parent_id);

-- ============================================================================
-- Relationship helpers (SECURITY DEFINER: recursion-safe inside RLS)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_parent_of(p_student uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.parent_student_links l
    WHERE l.parent_id = auth.uid() AND l.student_id = p_student AND l.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_linked_with(p_other uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.parent_student_links l
    WHERE l.status = 'active'
      AND ((l.parent_id = auth.uid() AND l.student_id = p_other)
        OR (l.student_id = auth.uid() AND l.parent_id = p_other))
  );
$$;

-- True when the latest decision for this consent type is "granted" and was given
-- by a parent who is still actively linked. Only the student, their linked
-- parents and admins can ask; everyone else gets false.
CREATE OR REPLACE FUNCTION public.has_consent(p_student uuid, p_consent_type text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT CASE
    WHEN NOT (p_student = auth.uid() OR public.is_parent_of(p_student) OR public.is_admin()) THEN false
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

-- ============================================================================
-- RPCs
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_parent_invite()
RETURNS TABLE (invite_code text, invite_expires_at timestamptz)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_code    text;
  v_expires timestamptz := now() + interval '48 hours';
BEGIN
  IF v_uid IS NULL OR NOT EXISTS (SELECT 1 FROM public.students s WHERE s.profile_id = v_uid) THEN
    RAISE EXCEPTION 'only students can create a parent invite' USING ERRCODE = '42501';
  END IF;

  -- One live invite per student: expire older unused ones.
  UPDATE public.parent_invites i
     SET expires_at = now()
   WHERE i.student_id = v_uid AND i.used_at IS NULL AND i.expires_at > now();

  -- 12 hex chars = 48 random bits from a v4 UUID (chars 1-12 precede the version digit).
  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

  INSERT INTO public.parent_invites (student_id, code_hash, expires_at)
  VALUES (v_uid, encode(sha256(convert_to(v_code, 'UTF8')), 'hex'), v_expires);

  RETURN QUERY SELECT
    substr(v_code, 1, 4) || '-' || substr(v_code, 5, 4) || '-' || substr(v_code, 9, 4),
    v_expires;
END;
$$;

-- Returns the linked student's id, or NULL for an invalid/expired code.
-- (Returns NULL instead of raising so the failed attempt row is kept.)
CREATE OR REPLACE FUNCTION public.accept_parent_invite(p_code text)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_invite public.parent_invites%ROWTYPE;
  v_code   text := upper(regexp_replace(coalesce(p_code, ''), '[^0-9A-Za-z]', '', 'g'));
BEGIN
  IF v_uid IS NULL OR public.current_user_role() IS DISTINCT FROM 'parent' THEN
    RAISE EXCEPTION 'only parent accounts can accept an invite' USING ERRCODE = '42501';
  END IF;

  IF (SELECT count(*) FROM public.parent_invite_attempts a
      WHERE a.parent_id = v_uid AND a.attempted_at > now() - interval '1 hour') >= 10 THEN
    RAISE EXCEPTION 'too many attempts, try again later' USING ERRCODE = '54000';
  END IF;

  SELECT * INTO v_invite
    FROM public.parent_invites i
   WHERE i.code_hash = encode(sha256(convert_to(v_code, 'UTF8')), 'hex')
     AND i.used_at IS NULL
     AND i.expires_at > now()
   FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.parent_invite_attempts (parent_id) VALUES (v_uid);
    RETURN NULL;
  END IF;

  UPDATE public.parent_invites SET used_at = now(), used_by = v_uid WHERE id = v_invite.id;

  INSERT INTO public.parent_student_links (parent_id, student_id, status)
  VALUES (v_uid, v_invite.student_id, 'active')
  ON CONFLICT (parent_id, student_id)
  DO UPDATE SET status = 'active', revoked_at = NULL;

  RETURN v_invite.student_id;
END;
$$;

-- Either side can end the link. Consent given by that parent stops counting.
CREATE OR REPLACE FUNCTION public.revoke_parent_link(p_other uuid)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  UPDATE public.parent_student_links l
     SET status = 'revoked', revoked_at = now()
   WHERE l.status = 'active'
     AND ((l.parent_id = v_uid AND l.student_id = p_other)
       OR (l.student_id = v_uid AND l.parent_id = p_other));
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_consent(
  p_student        uuid,
  p_consent_type   text,
  p_granted        boolean,
  p_policy_version text
)
RETURNS bigint
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_id bigint;
BEGIN
  IF NOT public.is_parent_of(p_student) THEN
    RAISE EXCEPTION 'only a linked parent can record consent' USING ERRCODE = '42501';
  END IF;
  IF p_granted IS NULL THEN
    RAISE EXCEPTION 'granted must be true or false' USING ERRCODE = '22004';
  END IF;

  INSERT INTO public.consent_records (student_id, parent_id, consent_type, granted, policy_version)
  VALUES (p_student, auth.uid(), p_consent_type, p_granted, p_policy_version)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Function privileges: authenticated only.
REVOKE ALL ON FUNCTION public.is_parent_of(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_linked_with(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_consent(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_parent_invite() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.accept_parent_invite(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_parent_link(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_consent(uuid, text, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_parent_of(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_linked_with(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_consent(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_parent_invite() TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_parent_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_parent_link(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_consent(uuid, text, boolean, text) TO authenticated;

-- ============================================================================
-- RLS + privileges
-- ============================================================================
ALTER TABLE public.students               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_student_links   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_invites         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_invite_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_records        ENABLE ROW LEVEL SECURITY;

-- Parents and students see each other's profile (display name, language) once linked.
CREATE POLICY "profiles: read linked" ON public.profiles
  FOR SELECT TO authenticated
  USING ((SELECT public.is_linked_with(id)));

-- students
CREATE POLICY "students: read own, linked parent, admin" ON public.students
  FOR SELECT TO authenticated
  USING (
    profile_id = (SELECT auth.uid())
    OR (SELECT public.is_parent_of(profile_id))
    OR (SELECT public.is_admin())
  );

CREATE POLICY "students: create own when role is student" ON public.students
  FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = (SELECT auth.uid())
    AND (SELECT public.current_user_role()) = 'student'
  );

CREATE POLICY "students: update own" ON public.students
  FOR UPDATE TO authenticated
  USING (profile_id = (SELECT auth.uid()))
  WITH CHECK (profile_id = (SELECT auth.uid()));

REVOKE ALL ON public.students FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.students FROM authenticated;
GRANT SELECT ON public.students TO authenticated;
GRANT INSERT (profile_id, board_code, grade, birth_year) ON public.students TO authenticated;
GRANT UPDATE (board_code, grade, birth_year, onboarding_completed_at) ON public.students TO authenticated;

-- links: read-only for the two people involved (writes via RPC only)
CREATE POLICY "links: read own" ON public.parent_student_links
  FOR SELECT TO authenticated
  USING (
    parent_id = (SELECT auth.uid())
    OR student_id = (SELECT auth.uid())
    OR (SELECT public.is_admin())
  );

REVOKE ALL ON public.parent_student_links FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.parent_student_links FROM authenticated;
GRANT SELECT ON public.parent_student_links TO authenticated;

-- invites + attempts: no client access at all (RPC only)
REVOKE ALL ON public.parent_invites FROM anon, authenticated;
REVOKE ALL ON public.parent_invite_attempts FROM anon, authenticated;

-- consent: student, linked parents and admins can read history; append via RPC only
CREATE POLICY "consent: read own, linked parent, admin" ON public.consent_records
  FOR SELECT TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    OR (SELECT public.is_parent_of(student_id))
    OR (SELECT public.is_admin())
  );

REVOKE ALL ON public.consent_records FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.consent_records FROM authenticated;
GRANT SELECT ON public.consent_records TO authenticated;
