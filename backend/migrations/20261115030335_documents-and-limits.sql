-- Migration M7: uploaded documents (Phase 6a) + a shared request limiter for documents and voice.
--
-- A student uploads an image (notes, textbook page, diagram, question paper) to the private
-- `student-uploads` bucket (key '<uid>/...', needs document_upload consent: storage RLS, M-storage).
-- They then register it here; the `document-process` function (admin client, after consent and
-- limits) reads the image with the vision model and writes the extracted text, a confidence and a
-- review flag. A student can never write the extracted text or the confidence themselves, and
-- parents have NO access to a child's uploads (same rule as the bucket).
--
-- Images only for now (png / jpeg / webp, <= 4 MB): Gemma 4 vision reads them directly and one
-- image is one model call, so cost and the 30 s limit stay predictable. PDFs: later, per page.

CREATE TABLE public.uploaded_documents (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         uuid NOT NULL DEFAULT auth.uid() REFERENCES public.students(profile_id) ON DELETE CASCADE,
  -- Key in the student-uploads bucket; the first path segment must be the owner's uid.
  storage_key      text NOT NULL CHECK (char_length(storage_key) BETWEEN 3 AND 300),
  mime             text NOT NULL CHECK (mime IN ('image/png', 'image/jpeg', 'image/webp')),
  size_bytes       integer NOT NULL CHECK (size_bytes BETWEEN 1 AND 4194304),
  kind             text NOT NULL DEFAULT 'notes'
                   CHECK (kind IN ('notes', 'textbook_page', 'diagram', 'question_paper', 'other')),
  status           text NOT NULL DEFAULT 'uploaded'
                   CHECK (status IN ('uploaded', 'processing', 'ready', 'failed')),
  -- Written only by document-process.
  extracted_text   text CHECK (char_length(extracted_text) <= 20000),
  -- 0-1, the model's own estimate; needs_review is decided by CODE (low confidence or uncertain parts).
  ocr_confidence   numeric(3, 2) CHECK (ocr_confidence BETWEEN 0 AND 1),
  needs_review     boolean NOT NULL DEFAULT false,
  -- Short snippets the model could not read well (max 2 KB).
  uncertain        jsonb NOT NULL DEFAULT '[]'::jsonb
                   CHECK (jsonb_typeof(uncertain) = 'array' AND pg_column_size(uncertain) <= 2048),
  error            text CHECK (char_length(error) <= 200),
  created_at       timestamptz NOT NULL DEFAULT now(),
  processed_at     timestamptz,
  UNIQUE (owner_id, storage_key),
  CHECK (split_part(storage_key, '/', 1) = owner_id::text)
);

CREATE INDEX uploaded_documents_owner_idx ON public.uploaded_documents (owner_id, created_at DESC);

ALTER TABLE public.uploaded_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "uploaded_documents: read own" ON public.uploaded_documents
  FOR SELECT TO authenticated USING (owner_id = (SELECT auth.uid()));
-- Register only with the parent's document_upload consent, as yourself, as a fresh row.
CREATE POLICY "uploaded_documents: register own with consent" ON public.uploaded_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = (SELECT auth.uid())
    AND status = 'uploaded'
    AND (SELECT public.has_consent((SELECT auth.uid()), 'document_upload'))
  );
-- Delete never needs consent: a student can always remove their own data.
CREATE POLICY "uploaded_documents: delete own" ON public.uploaded_documents
  FOR DELETE TO authenticated USING (owner_id = (SELECT auth.uid()));

REVOKE ALL ON public.uploaded_documents FROM anon, authenticated;
GRANT SELECT, DELETE ON public.uploaded_documents TO authenticated;
GRANT INSERT (owner_id, storage_key, mime, size_bytes, kind) ON public.uploaded_documents TO authenticated;

-- ============================================================================
-- reserve_ai_call: the reserve_quiz pattern, generic (documents, voice).
-- Check + count one request in a single locked step, before any AI work.
-- Returns 'ok' | 'slow_down' | 'daily_limit'. The rupee cap is shared with everything else the
-- student does today (all model_usage rows).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reserve_ai_call(
  p_agent          text,
  p_function       text,
  p_max_per_minute integer,
  p_max_per_day    integer,
  p_max_cost_inr   numeric
)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_start  timestamptz := date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata';
  v_minute integer;
  v_day    integer;
  v_cost   numeric;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not signed in' USING ERRCODE = '42501';
  END IF;
  -- Only request-marker agents may be reserved (these rows hold no cost; the real calls are logged separately).
  IF p_agent NOT IN ('document_request', 'voice_request') THEN
    RAISE EXCEPTION 'bad_agent' USING ERRCODE = 'P0001';
  END IF;

  IF p_function NOT IN ('document-process', 'document-ask', 'voice-transcribe', 'voice-speak') THEN
    RAISE EXCEPTION 'bad_function' USING ERRCODE = 'P0001';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('reserve_ai_call:' || v_uid::text, 0));

  SELECT
    count(*) FILTER (WHERE u.agent = p_agent AND u.created_at > now() - interval '1 minute'),
    count(*) FILTER (WHERE u.agent = p_agent AND u.created_at >= v_start),
    coalesce(sum(u.cost_inr) FILTER (WHERE u.created_at >= v_start), 0)
  INTO v_minute, v_day, v_cost
  FROM public.model_usage u
  WHERE u.user_id = v_uid
    AND u.created_at >= least(v_start, now() - interval '1 minute');

  IF v_minute >= p_max_per_minute THEN
    RETURN 'slow_down';
  END IF;
  IF v_day >= p_max_per_day OR v_cost >= p_max_cost_inr THEN
    RETURN 'daily_limit';
  END IF;

  INSERT INTO public.model_usage (user_id, function_slug, agent)
  VALUES (v_uid, p_function, p_agent);
  RETURN 'ok';
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_ai_call(text, text, integer, integer, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserve_ai_call(text, text, integer, integer, numeric) TO authenticated;
