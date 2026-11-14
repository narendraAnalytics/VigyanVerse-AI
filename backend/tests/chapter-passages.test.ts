import { describe, expect, it } from 'vitest';
import { sample, samplePassages, type ChunkDb } from '../src/shared/chapter-passages.ts';

const chapter = { id: 'ch1', number: 11, title_en: 'Electricity', subject_code: 'physics' };

function fakeDb(opts: { ids?: string[]; listError?: boolean; rowsError?: boolean } = {}) {
  const calls: { table: string; filters: [string, unknown][] }[] = [];
  const db: ChunkDb = {
    database: {
      from(table: string) {
        const call = { table, filters: [] as [string, unknown][] };
        calls.push(call);
        const q: any = {
          select: (cols: string) => { call.filters.push(['select', cols]); return q; },
          eq: (k: string, v: unknown) => { call.filters.push([k, v]); return q; },
          gte: (k: string, v: unknown) => { call.filters.push([k, v]); return q; },
          in: (k: string, v: unknown) => { call.filters.push([k, v]); return q; },
          order: () => q,
          then: (res: (x: unknown) => unknown) => res(call.filters[0][1] === 'id, content'
            ? { data: opts.listError ? null : (opts.ids ?? []).map((id) => ({ id, content: id.startsWith('short') ? 'hi' : 'x'.repeat(500) })), error: opts.listError ? {} : null }
            : { data: opts.rowsError ? null : (call.filters.find(([k]) => k === 'id')![1] as string[]).map((id, i) => ({ id, chapter_id: 'ch1', page_start: 170 + i, page_end: 171 + i, section_path: `11.${i}`, content: 'text' })), error: opts.rowsError ? {} : null }),
        };
        return q;
      },
    },
  };
  return { db, calls };
}

describe('samplePassages', () => {
  it('picks at most n long chunks of the chapter and maps them to passages with chapter info', async () => {
    const { db, calls } = fakeDb({ ids: ['a', 'b', 'c', 'd', 'e', 'f'] });
    const r = await samplePassages(db, chapter, 4);
    expect(r.ok && r.passages).toHaveLength(4);
    expect(r.ok && r.passages[0]).toMatchObject({ chapter_number: 11, chapter_title_en: 'Electricity', subject_code: 'physics', rank: 0 });
    expect(calls[0].filters).toContainEqual(['chapter_id', 'ch1']);
  });

  it('skips short chunks (heading-only text)', async () => {
    const r = await samplePassages(fakeDb({ ids: ['short1', 'short2', 'a'] }).db, chapter, 4);
    expect(r.ok && r.passages.map((p) => p.chunk_id)).toEqual(['a']);
  });

  it('reports no_passages and passages_failed', async () => {
    expect(await samplePassages(fakeDb({ ids: [] }).db, chapter)).toEqual({ ok: false, error: 'no_passages' });
    expect(await samplePassages(fakeDb({ listError: true }).db, chapter)).toEqual({ ok: false, error: 'passages_failed' });
    expect(await samplePassages(fakeDb({ ids: ['a'], rowsError: true }).db, chapter)).toEqual({ ok: false, error: 'passages_failed' });
  });

  it('sample keeps order and never repeats', () => {
    const out = sample([1, 2, 3, 4, 5, 6], 3);
    expect(out).toHaveLength(3);
    expect(out).toEqual([...out].sort((a, b) => a - b));
    expect(new Set(out).size).toBe(3);
    expect(sample([1, 2], 5)).toEqual([1, 2]);
  });
});
