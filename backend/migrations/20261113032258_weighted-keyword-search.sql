-- Weighted keyword search (Phase 3c, 2026-11-13).
--
-- Problem found by the retrieval-agent eval: match_chunks_keyword OR-s the query terms and
-- ranks with ts_rank_cd, so frequent words dominate. "thermal decomposition ... calcium
-- carbonate" ranked Ch 4 carbon chunks first (the English stemmer maps carbonate -> carbon),
-- and out-of-book questions ("Newton's law", "theory of evolution") looked well matched
-- because "law" / "theory" occur everywhere.
--
-- Fix: rank by the summed IDF (rarity) of the query lexemes a chunk contains, with a bonus
-- for lexemes in the section heading (fts weight A); ts_rank_cd only breaks ties. The RPC
-- also returns which lexemes matched and each query lexeme's weight, so the Curriculum
-- Retrieval agent measures "is this question answered by the textbook?" with the SAME
-- stemming as the search. match_chunks_keyword is kept unchanged.
--
-- Lexeme document frequencies live in corpus_lexeme_stats, rebuilt by
-- refresh_corpus_lexeme_stats() after every ingestion (scripts/ingest.ts calls it).

CREATE TABLE public.corpus_lexeme_stats (
  language text NOT NULL CHECK (language IN ('en', 'te')),
  lexeme   text NOT NULL,
  ndoc     integer NOT NULL CHECK (ndoc > 0),
  PRIMARY KEY (language, lexeme)
);

-- Word counts of the textbook only (no student data): readable by signed-in users,
-- written only by the SECURITY DEFINER refresh function.
ALTER TABLE public.corpus_lexeme_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "corpus_lexeme_stats: read" ON public.corpus_lexeme_stats
  FOR SELECT TO authenticated USING (true);
REVOKE ALL ON public.corpus_lexeme_stats FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.corpus_lexeme_stats TO authenticated;

CREATE OR REPLACE FUNCTION public.refresh_corpus_lexeme_stats()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  DELETE FROM public.corpus_lexeme_stats;
  INSERT INTO public.corpus_lexeme_stats (language, lexeme, ndoc)
  SELECT 'en', word, ndoc FROM ts_stat('SELECT fts FROM public.document_chunks WHERE language = ''en''');
  INSERT INTO public.corpus_lexeme_stats (language, lexeme, ndoc)
  SELECT 'te', word, ndoc FROM ts_stat('SELECT fts FROM public.document_chunks WHERE language = ''te''');
  RETURN (SELECT count(*)::integer FROM public.corpus_lexeme_stats);
END;
$$;

-- Admin only (ingestion runs with the project API key).
REVOKE ALL ON FUNCTION public.refresh_corpus_lexeme_stats() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Weighted keyword retrieval. SECURITY INVOKER: the caller's RLS applies.
--   rank            = sum(idf of matched lexemes) + 0.5 * sum(idf of lexemes in the heading)
--                     + 0.1 * ts_rank_cd  (tie-break)
--   matched_lexemes = query lexemes present in the chunk
--   query_weights   = {lexeme: idf} for every query lexeme (unknown words get the max idf)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.match_chunks_weighted(
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
  rank             real,
  matched_lexemes  text[],
  query_weights    jsonb
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp
AS $$
  WITH cfg AS (
    SELECT CASE WHEN p_language = 'en' THEN 'english'::regconfig ELSE 'simple'::regconfig END AS c
  ),
  lex AS (
    SELECT DISTINCT l AS lexeme
    FROM cfg, unnest(tsvector_to_array(to_tsvector(cfg.c, left(coalesce(p_query, ''), 500)))) AS l
    LIMIT 16
  ),
  n AS (
    SELECT count(*)::double precision AS total FROM public.document_chunks WHERE language = p_language
  ),
  w AS (
    SELECT lex.lexeme,
           ln((n.total + 1) / (coalesce(s.ndoc, 0) + 1)) AS idf,
           to_tsquery('simple', quote_literal(lex.lexeme)) AS q_any,
           to_tsquery('simple', quote_literal(lex.lexeme) || ':A') AS q_head
    FROM lex
    CROSS JOIN n
    LEFT JOIN public.corpus_lexeme_stats s ON s.language = p_language AND s.lexeme = lex.lexeme
  ),
  q AS (
    SELECT to_tsquery('simple', string_agg(quote_literal(lexeme), ' | ')) AS tsq,
           jsonb_object_agg(lexeme, round(idf::numeric, 3)) AS weights
    FROM w
  )
  SELECT d.id, d.chapter_id, c.number, c.title_en, c.subject_code,
         d.page_start, d.page_end, d.section_path, d.content,
         (m.score + 0.1 * ts_rank_cd(d.fts, q.tsq, 32))::real AS rank,
         m.matched,
         q.weights
  FROM q
  JOIN public.document_chunks d ON d.fts @@ q.tsq
  JOIN public.chapters c ON c.id = d.chapter_id
  CROSS JOIN LATERAL (
    SELECT coalesce(sum(w.idf) FILTER (WHERE d.fts @@ w.q_any), 0)
             + 0.5 * coalesce(sum(w.idf) FILTER (WHERE d.fts @@ w.q_head), 0) AS score,
           coalesce(array_agg(w.lexeme) FILTER (WHERE d.fts @@ w.q_any), '{}') AS matched
    FROM w
  ) m
  WHERE q.tsq IS NOT NULL
    AND c.board_code = p_board
    AND c.is_active
    AND d.language = p_language
    AND (p_subject IS NULL OR c.subject_code = p_subject)
    AND (p_chapter IS NULL OR d.chapter_id = p_chapter)
  ORDER BY rank DESC, d.id
  LIMIT least(greatest(coalesce(p_match_count, 6), 1), 20);
$$;

REVOKE ALL ON FUNCTION public.match_chunks_weighted(text, text, text, uuid, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_chunks_weighted(text, text, text, uuid, text, integer) TO authenticated;

-- Initial statistics for the 13 ingested chapters.
SELECT public.refresh_corpus_lexeme_stats();
