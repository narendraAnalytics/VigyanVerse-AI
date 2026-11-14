// Sample textbook passages from one chapter for the quiz writer (Phase 4c). Shared by the
// quiz-generate function (user-scoped client, RLS) and the live eval (admin client).
import type { ChunkHit } from './retrieval.ts';

export const PASSAGES = 4;
/** Skip heading-only and very short chunks. (token_count is not filled by ingestion: use the text length.) */
export const MIN_CHUNK_CHARS = 400;

export interface ChapterInfo { id: string; number: number | null; title_en: string; subject_code: string }

interface ChunkRow { id: string; chapter_id: string; page_start: number; page_end: number; section_path: string | null; content: string }

/** The slice of the InsForge database client used here (keeps this testable). */
export interface ChunkDb {
  database: { from(table: string): any }; // eslint-disable-line @typescript-eslint/no-explicit-any
}

/** `n` random items, in their original order. */
export function sample<T>(items: T[], n: number, random: () => number = Math.random): T[] {
  const picked = new Set<number>();
  while (picked.size < Math.min(n, items.length)) picked.add(Math.floor(random() * items.length));
  return [...picked].sort((a, b) => a - b).map((i) => items[i]);
}

export type PassagesResult = { ok: true; passages: ChunkHit[] } | { ok: false; error: 'passages_failed' | 'no_passages' };

export async function samplePassages(client: ChunkDb, chapter: ChapterInfo, n = PASSAGES): Promise<PassagesResult> {
  const list = await client.database.from('document_chunks').select('id, content')
    .eq('chapter_id', chapter.id).eq('language', 'en');
  if (list.error) return { ok: false, error: 'passages_failed' };
  const chosen = sample(((list.data as { id: string; content: string }[] | null) ?? []).filter((c) => c.content.length >= MIN_CHUNK_CHARS).map((c) => c.id), n);
  if (!chosen.length) return { ok: false, error: 'no_passages' };
  const rows = await client.database.from('document_chunks').select('id, chapter_id, page_start, page_end, section_path, content')
    .in('id', chosen).order('chunk_index', { ascending: true });
  if (rows.error) return { ok: false, error: 'passages_failed' };
  return {
    ok: true,
    passages: ((rows.data as ChunkRow[] | null) ?? []).map((c) => ({
      chunk_id: c.id, chapter_id: c.chapter_id, chapter_number: chapter.number, chapter_title_en: chapter.title_en,
      subject_code: chapter.subject_code, page_start: c.page_start, page_end: c.page_end, section_path: c.section_path,
      content: c.content, rank: 0,
    })),
  };
}
