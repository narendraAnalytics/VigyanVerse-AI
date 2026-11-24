-- Remove Private Use Area characters (U+E000-U+F8FF) from the stored NCERT chunks (2026-11-24).
-- The PDFs draw long reaction arrows ("—Heat→", "—Sunlight→") from Adobe Symbol arrow-extender glyphs that the text
-- layer maps to U+F8E7: 95 of them in 12 chunks. The tutor quoted them and the site showed "Sunlight □ →□□□□".
-- Ingestion now strips them too (src/shared/text.ts stripPrivateUse); this cleans what is already stored, the same
-- way: drop the characters, collapse the double spaces they leave. fts is a generated column and follows content.
UPDATE public.document_chunks
SET content = regexp_replace(regexp_replace(content, '[-]', '', 'g'), '[ \t]{2,}', ' ', 'g')
WHERE content ~ '[-]';
