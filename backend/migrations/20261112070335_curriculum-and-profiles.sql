-- Migration 1: user profiles + role helpers, curriculum reference tables.
-- Roles: students and parents self-register; teacher/admin are assigned only
-- by project_admin (CLI / migrations), never by the client.

-- ============================================================================
-- Profiles
-- ============================================================================
CREATE TABLE public.profiles (
  id                 uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role               text NOT NULL DEFAULT 'student'
                       CHECK (role IN ('student', 'parent', 'teacher', 'admin')),
  display_name       text NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 60),
  preferred_language text NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'te')),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

-- Defence in depth on top of column grants: clients may only self-assign
-- student/parent, and may never change role afterwards.
CREATE OR REPLACE FUNCTION public.guard_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' AND NEW.role NOT IN ('student', 'parent') THEN
      RAISE EXCEPTION 'role "%" cannot be self-assigned', NEW.role USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'role cannot be changed' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_guard_role
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_role();

-- Role helpers. SECURITY DEFINER so RLS policies can call them without
-- re-entering profiles RLS (recursion-safe).
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT p.role FROM public.profiles p WHERE p.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT coalesce(public.current_user_role() = 'admin', false);
$$;

REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: read own" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) OR (SELECT public.is_admin()));

CREATE POLICY "profiles: create own" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "profiles: update own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- No DELETE policy: account deletion goes through auth user deletion (cascades).
REVOKE ALL ON public.profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT INSERT (id, role, display_name, preferred_language) ON public.profiles TO authenticated;
GRANT UPDATE (display_name, preferred_language) ON public.profiles TO authenticated;

-- ============================================================================
-- Curriculum reference data
-- Board-specific by design: the same chapter title in two boards = two rows.
-- ============================================================================
CREATE TABLE public.boards (
  code       text PRIMARY KEY CHECK (code ~ '^[A-Z]{2,10}$'),
  name       text NOT NULL,
  state      text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.subjects (
  code       text PRIMARY KEY CHECK (code ~ '^[a-z_]{2,30}$'),
  name_en    text NOT NULL,
  name_te    text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.chapters (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_code       text NOT NULL REFERENCES public.boards(code) ON UPDATE CASCADE,
  subject_code     text NOT NULL REFERENCES public.subjects(code) ON UPDATE CASCADE,
  grade            smallint NOT NULL CHECK (grade BETWEEN 1 AND 12),
  academic_year    text NOT NULL CHECK (academic_year ~ '^[0-9]{4}-[0-9]{2}$'),
  -- NULL for syllabus material that has no chapter number in the current textbook
  number           smallint CHECK (number > 0),
  title_en         text NOT NULL,
  title_te         text,
  unit_name        text,
  -- 'formative_only' = taught/assessed internally, not in the year-end board exam
  assessment_scope text NOT NULL DEFAULT 'summative'
                     CHECK (assessment_scope IN ('summative', 'formative_only')),
  sort_order       smallint NOT NULL,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX chapters_board_grade_year_subject_title_key
  ON public.chapters (board_code, grade, academic_year, subject_code, title_en);
CREATE UNIQUE INDEX chapters_board_grade_year_subject_number_key
  ON public.chapters (board_code, grade, academic_year, subject_code, number)
  WHERE number IS NOT NULL;
CREATE INDEX chapters_subject_code_idx ON public.chapters (subject_code);

CREATE TRIGGER chapters_updated_at
  BEFORE UPDATE ON public.chapters
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

CREATE TABLE public.topics (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id       uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  parent_topic_id  uuid REFERENCES public.topics(id) ON DELETE CASCADE,
  title_en         text NOT NULL,
  title_te         text,
  assessment_scope text NOT NULL DEFAULT 'summative'
                     CHECK (assessment_scope IN ('summative', 'formative_only')),
  sort_order       smallint NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CHECK (parent_topic_id IS DISTINCT FROM id)
);

CREATE UNIQUE INDEX topics_chapter_title_key ON public.topics (chapter_id, title_en);
CREATE INDEX topics_parent_topic_id_idx ON public.topics (parent_topic_id);

CREATE TRIGGER topics_updated_at
  BEFORE UPDATE ON public.topics
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

-- Concept dependency graph used for remediation ("revise X before Y").
CREATE TABLE public.topic_prerequisites (
  topic_id              uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  prerequisite_topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  created_at            timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (topic_id, prerequisite_topic_id),
  CHECK (topic_id <> prerequisite_topic_id)
);

CREATE INDEX topic_prerequisites_prerequisite_idx ON public.topic_prerequisites (prerequisite_topic_id);

-- Rights registry for every piece of ingested learning material.
CREATE TABLE public.curriculum_sources (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_code      text NOT NULL REFERENCES public.boards(code) ON UPDATE CASCADE,
  subject_code    text REFERENCES public.subjects(code) ON UPDATE CASCADE,
  grade           smallint NOT NULL CHECK (grade BETWEEN 1 AND 12),
  academic_year   text CHECK (academic_year ~ '^[0-9]{4}-[0-9]{2}$'),
  title           text NOT NULL,
  publisher       text,
  edition         text,
  language        text NOT NULL CHECK (language IN ('en', 'te')),
  source_url      text,
  storage_key     text,
  content_version integer NOT NULL DEFAULT 1 CHECK (content_version > 0),
  -- Ingestion must refuse anything that is not 'permitted'.
  usage_rights    text NOT NULL DEFAULT 'pending_review'
                    CHECK (usage_rights IN ('pending_review', 'permitted', 'restricted')),
  rights_notes    text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX curriculum_sources_board_code_idx ON public.curriculum_sources (board_code);
CREATE INDEX curriculum_sources_subject_code_idx ON public.curriculum_sources (subject_code);

CREATE TRIGGER curriculum_sources_updated_at
  BEFORE UPDATE ON public.curriculum_sources
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

-- ---------------------------------------------------------------------------
-- Curriculum RLS: public read (landing page can list chapters), admin-only write.
-- ---------------------------------------------------------------------------
ALTER TABLE public.boards              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_sources  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "boards: public read" ON public.boards FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "subjects: public read" ON public.subjects FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "chapters: public read active" ON public.chapters
  FOR SELECT TO anon, authenticated USING (is_active OR (SELECT public.is_admin()));
CREATE POLICY "topics: public read" ON public.topics FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "topic_prerequisites: public read" ON public.topic_prerequisites
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "curriculum_sources: admin read" ON public.curriculum_sources
  FOR SELECT TO authenticated USING ((SELECT public.is_admin()));

-- Admin write policies (one per operation, per table).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['boards', 'subjects', 'chapters', 'topics', 'topic_prerequisites', 'curriculum_sources']
  LOOP
    EXECUTE format('CREATE POLICY "%1$s: admin insert" ON public.%1$I FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()))', t);
    EXECUTE format('CREATE POLICY "%1$s: admin update" ON public.%1$I FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()))', t);
    EXECUTE format('CREATE POLICY "%1$s: admin delete" ON public.%1$I FOR DELETE TO authenticated USING ((SELECT public.is_admin()))', t);
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
  END LOOP;
END;
$$;

GRANT SELECT ON public.boards, public.subjects, public.chapters, public.topics, public.topic_prerequisites TO anon;
REVOKE ALL ON public.curriculum_sources FROM anon;
