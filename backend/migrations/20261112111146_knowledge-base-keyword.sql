-- M3 knowledge base, keyword-first (decision 2026-11-12).
--
-- No embedding provider is available yet (Sarvam embeddinggemma-2 needs provisioned
-- access), so retrieval starts as Postgres full-text search. Edge Functions first use a
-- Sarvam chat model to rewrite the student's question (English or Telugu) into English
-- textbook keywords, then call match_chunks_keyword().
--
-- The embedding column already exists (vector(768) = embeddinggemma-2 output), nullable
-- and unindexed. Turning on vectors later = backfill embeddings, add an HNSW index and a
-- hybrid RRF RPC in a new migration; no table rewrite.
--
-- Scope: curriculum chunks only. Student-upload chunks (Phase 6) get their own design.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
CREATE TABLE public.document_chunks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id       uuid NOT NULL REFERENCES public.curriculum_sources(id) ON DELETE CASCADE,
  chapter_id      uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  topic_id        uuid REFERENCES public.topics(id) ON DELETE SET NULL,
  content_version integer NOT NULL CHECK (content_version > 0),
  chunk_index     integer NOT NULL CHECK (chunk_index >= 0),
  language        text NOT NULL CHECK (language IN ('en', 'te')),
  -- Printed textbook page numbers, taken from the PDF during ingestion. Citations are
  -- built only from these columns, never from model output.
  page_start      smallint NOT NULL CHECK (page_start > 0),
  page_end        smallint NOT NULL,
  section_path    text CHECK (char_length(section_path) <= 300),
  content         text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 8000),
  token_count     integer CHECK (token_count > 0),
  embedding       public.vector(768),
  embedding_model text,
  -- Headings rank above body text. 'simple' for Telugu: Postgres has no Telugu stemmer.
  fts             tsvector GENERATED ALWAYS AS (
                    setweight(to_tsvector(CASE WHEN language = 'en' THEN 'english'::regconfig
                                               ELSE 'simple'::regconfig END,
                                          coalesce(section_path, '')), 'A')
                    || setweight(to_tsvector(CASE WHEN language = 'en' THEN 'english'::regconfig
                                                  ELSE 'simple'::regconfig END,
                                             content), 'B')
                  ) STORED,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (page_end >= page_start),
  -- Never mix embedding models in one column (and never store a vector without its model).
  CHECK ((embedding IS NULL) = (embedding_model IS NULL)),
  UNIQUE (source_id, content_version, chunk_index)
);

CREATE INDEX document_chunks_fts_idx ON public.document_chunks USING gin (fts);
CREATE INDEX document_chunks_chapter_language_idx ON public.document_chunks (chapter_id, language);
CREATE INDEX document_chunks_topic_id_idx ON public.document_chunks (topic_id);

-- ---------------------------------------------------------------------------
-- Integrity: only rights-cleared sources may be ingested, and a chunk's version must
-- match its source's current version. Deterministic guard, not just a script check.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_document_chunk_source()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_rights  text;
  v_version integer;
BEGIN
  SELECT s.usage_rights, s.content_version INTO v_rights, v_version
  FROM public.curriculum_sources s WHERE s.id = NEW.source_id;

  IF v_rights IS DISTINCT FROM 'permitted' THEN
    RAISE EXCEPTION 'curriculum source % has usage_rights %, not permitted', NEW.source_id, v_rights
      USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.content_version IS DISTINCT FROM v_version THEN
    RAISE EXCEPTION 'chunk content_version % does not match source version %', NEW.content_version, v_version
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_document_chunk_source() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER document_chunks_guard_source
  BEFORE INSERT OR UPDATE OF source_id, content_version ON public.document_chunks
  FOR EACH ROW EXECUTE FUNCTION public.guard_document_chunk_source();

-- ---------------------------------------------------------------------------
-- RLS: signed-in users read chunks of active chapters; writes are admin only
-- (ingestion runs locally with the API key, which bypasses RLS).
-- ---------------------------------------------------------------------------
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "document_chunks: read active chapters" ON public.document_chunks
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.chapters c WHERE c.id = chapter_id AND c.is_active)
         OR (SELECT public.is_admin()));
CREATE POLICY "document_chunks: admin insert" ON public.document_chunks
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "document_chunks: admin update" ON public.document_chunks
  FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "document_chunks: admin delete" ON public.document_chunks
  FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

REVOKE ALL ON public.document_chunks FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_chunks TO authenticated;

-- ---------------------------------------------------------------------------
-- Keyword retrieval RPC. SECURITY INVOKER: the caller's RLS applies.
-- p_query is a space-separated keyword list (from the rewrite step). Terms are OR-ed so
-- a chunk does not need every keyword; ts_rank_cd ranks chunks matching more (and
-- heading) terms higher. Returns only metadata needed for answering and citing.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.match_chunks_keyword(
  p_query       text,
  p_board       text,
  p_subject     text DEFAULT NULL,
  p_chapter     uuid DEFAULT NULL,
  p_language    text DEFAULT 'en',
  p_match_count integer DEFAULT 6
)
RETURNS TABLE (
  chunk_id         uuid,
  chapter_id       uuid,
  chapter_number   smallint,
  chapter_title_en text,
  subject_code     text,
  page_start       smallint,
  page_end         smallint,
  section_path     text,
  content          text,
  rank             real
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp
AS $$
  WITH q AS (
    SELECT nullif(
             replace(
               plainto_tsquery(
                 CASE WHEN p_language = 'en' THEN 'english'::regconfig ELSE 'simple'::regconfig END,
                 left(coalesce(p_query, ''), 500)
               )::text,
               '&', '|'),
             '')::tsquery AS tsq
  )
  SELECT d.id, d.chapter_id, c.number, c.title_en, c.subject_code,
         d.page_start, d.page_end, d.section_path, d.content,
         ts_rank_cd(d.fts, q.tsq, 32) AS rank
  FROM q
  JOIN public.document_chunks d ON d.fts @@ q.tsq
  JOIN public.chapters c ON c.id = d.chapter_id
  WHERE q.tsq IS NOT NULL
    AND c.board_code = p_board
    AND c.is_active
    AND d.language = p_language
    AND (p_subject IS NULL OR c.subject_code = p_subject)
    AND (p_chapter IS NULL OR d.chapter_id = p_chapter)
  ORDER BY rank DESC, d.id
  LIMIT least(greatest(coalesce(p_match_count, 6), 1), 20);
$$;

REVOKE ALL ON FUNCTION public.match_chunks_keyword(text, text, text, uuid, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_chunks_keyword(text, text, text, uuid, text, integer) TO authenticated;
