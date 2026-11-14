-- Migration M4: tutoring (conversations, messages, model_usage) for the tutor-chat function.
--
-- The tutor-chat Edge Function acts AS THE STUDENT (user-scoped client), so RLS below is the
-- isolation boundary: a student reads and writes only their own rows. Parents do NOT read raw
-- chats (privacy; a summary view can come later). model_usage is insert-only for the caller's
-- own rows, so the daily AI budget cannot be dodged by deleting or editing usage.
-- Consent (has_consent(student, 'ai_tutoring')) is checked by the function before AI work.

-- ============================================================================
-- conversations
-- ============================================================================
CREATE TABLE public.conversations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      uuid NOT NULL DEFAULT auth.uid() REFERENCES public.students(profile_id) ON DELETE CASCADE,
  mode            text NOT NULL DEFAULT 'tutor' CHECK (mode IN ('tutor', 'socratic')),
  subject_code    text REFERENCES public.subjects(code) ON UPDATE CASCADE,
  language        text NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'te', 'te_latn')),
  title           text CHECK (char_length(title) <= 120),
  -- Socratic thread state (code owns it): the question being worked on and hints given.
  socratic_topic  text CHECK (char_length(socratic_topic) <= 1500),
  socratic_hints  smallint NOT NULL DEFAULT 0 CHECK (socratic_hints BETWEEN 0 AND 10),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX conversations_student_updated_idx ON public.conversations (student_id, updated_at DESC);
CREATE INDEX conversations_subject_code_idx ON public.conversations (subject_code);

CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

-- ============================================================================
-- messages (append-only for clients; a student may delete their own)
-- ============================================================================
CREATE TABLE public.messages (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  student_id      uuid NOT NULL DEFAULT auth.uid() REFERENCES public.students(profile_id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('student', 'tutor')),
  content         text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 6000),
  -- Which agent answered: router (greeting / off-topic / unsafe), tutor, socratic, math.
  agent           text CHECK (agent IN ('router', 'tutor', 'socratic', 'math')),
  -- Citations come from document_chunks metadata (built by code, never by the model).
  citations       jsonb NOT NULL DEFAULT '[]'::jsonb
                  CHECK (jsonb_typeof(citations) = 'array' AND pg_column_size(citations) <= 8192),
  -- Small per-turn facts for the UI and analytics (label, kind, check, done...).
  meta            jsonb NOT NULL DEFAULT '{}'::jsonb
                  CHECK (jsonb_typeof(meta) = 'object' AND pg_column_size(meta) <= 8192),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX messages_conversation_id_idx ON public.messages (conversation_id, id);
CREATE INDEX messages_student_created_idx ON public.messages (student_id, created_at DESC);

-- ============================================================================
-- model_usage (one row per model call; cost / latency / fallback / error)
-- ============================================================================
CREATE TABLE public.model_usage (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id           uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  conversation_id   uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  function_slug     text NOT NULL CHECK (char_length(function_slug) BETWEEN 1 AND 40),
  agent             text NOT NULL CHECK (char_length(agent) BETWEEN 1 AND 30),
  model             text CHECK (char_length(model) <= 60),
  input_tokens      integer NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens     integer NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  reasoning_tokens  integer CHECK (reasoning_tokens >= 0),
  cost_inr          numeric(10, 5) NOT NULL DEFAULT 0 CHECK (cost_inr >= 0),
  latency_ms        integer NOT NULL DEFAULT 0 CHECK (latency_ms >= 0),
  used_fallback     boolean NOT NULL DEFAULT false,
  -- Short error text only (never conversation content).
  error             text CHECK (char_length(error) <= 300),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX model_usage_user_created_idx ON public.model_usage (user_id, created_at DESC);
CREATE INDEX model_usage_conversation_id_idx ON public.model_usage (conversation_id);

-- ============================================================================
-- Budget / rate-limit status for the caller (SECURITY INVOKER: RLS applies)
-- ============================================================================
-- Messages sent in the last minute and AI cost since midnight India time.
CREATE OR REPLACE FUNCTION public.ai_usage_status()
RETURNS TABLE (messages_last_minute integer, cost_today_inr numeric)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT
    (SELECT count(*)::integer FROM public.messages m
      WHERE m.student_id = (SELECT auth.uid()) AND m.role = 'student'
        AND m.created_at > now() - interval '1 minute'),
    (SELECT coalesce(sum(u.cost_inr), 0) FROM public.model_usage u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.created_at >= (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata'));
$$;

REVOKE ALL ON FUNCTION public.ai_usage_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ai_usage_status() TO authenticated;

-- ============================================================================
-- RLS + privileges
-- ============================================================================
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_usage   ENABLE ROW LEVEL SECURITY;

-- conversations: the student only
CREATE POLICY "conversations: read own" ON public.conversations
  FOR SELECT TO authenticated USING (student_id = (SELECT auth.uid()));
CREATE POLICY "conversations: create own" ON public.conversations
  FOR INSERT TO authenticated WITH CHECK (student_id = (SELECT auth.uid()));
CREATE POLICY "conversations: update own" ON public.conversations
  FOR UPDATE TO authenticated
  USING (student_id = (SELECT auth.uid())) WITH CHECK (student_id = (SELECT auth.uid()));
CREATE POLICY "conversations: delete own" ON public.conversations
  FOR DELETE TO authenticated USING (student_id = (SELECT auth.uid()));

REVOKE ALL ON public.conversations FROM anon, authenticated;
GRANT SELECT, DELETE ON public.conversations TO authenticated;
GRANT INSERT (student_id, mode, subject_code, language, title) ON public.conversations TO authenticated;
GRANT UPDATE (mode, subject_code, language, title, socratic_topic, socratic_hints) ON public.conversations TO authenticated;

-- messages: the student only, and only into their own conversation
CREATE POLICY "messages: read own" ON public.messages
  FOR SELECT TO authenticated USING (student_id = (SELECT auth.uid()));
CREATE POLICY "messages: add to own conversation" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND c.student_id = (SELECT auth.uid())
    )
  );
CREATE POLICY "messages: delete own" ON public.messages
  FOR DELETE TO authenticated USING (student_id = (SELECT auth.uid()));

REVOKE ALL ON public.messages FROM anon, authenticated;
GRANT SELECT, DELETE ON public.messages TO authenticated;
GRANT INSERT (conversation_id, student_id, role, content, agent, citations, meta) ON public.messages TO authenticated;

-- model_usage: insert / read own; admins read all (cost reports). No update / delete.
CREATE POLICY "model_usage: read own" ON public.model_usage
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "model_usage: admin read" ON public.model_usage
  FOR SELECT TO authenticated USING ((SELECT public.is_admin()));
CREATE POLICY "model_usage: insert own" ON public.model_usage
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (conversation_id IS NULL OR EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND c.student_id = (SELECT auth.uid())
    ))
  );

REVOKE ALL ON public.model_usage FROM anon, authenticated;
GRANT SELECT ON public.model_usage TO authenticated;
GRANT INSERT (user_id, conversation_id, function_slug, agent, model, input_tokens, output_tokens,
              reasoning_tokens, cost_inr, latency_ms, used_fallback, error) ON public.model_usage TO authenticated;
