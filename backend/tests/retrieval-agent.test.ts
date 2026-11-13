import { describe, expect, it } from 'vitest';
import { assessContext, retrieveContext } from '../src/agents/retrieval.ts';
import type { ChunkHit, RpcClient } from '../src/shared/retrieval.ts';

/** A chunk as match_chunks_weighted returns it: matched stems + the query's IDF weights. */
const hit = (section: string, matched: string[], weights: Record<string, number>, subject = 'chemistry'): ChunkHit => ({
  chunk_id: section, chapter_id: 'c', chapter_number: 1, chapter_title_en: 't', subject_code: subject,
  page_start: 1, page_end: 1, section_path: section, content: '...', rank: matched.reduce((s, k) => s + (weights[k] ?? 0), 0),
  matched_lexemes: matched, query_weights: weights,
});

function fakeClient(bySubject: Record<string, ChunkHit[]>) {
  const calls: { fn: string; query: string; subject: unknown }[] = [];
  const client: RpcClient = {
    database: {
      rpc: async (fn, p) => {
        calls.push({ fn, query: String(p.p_query), subject: p.p_subject });
        return { data: bySubject[String(p.p_subject ?? 'all')] ?? [], error: null };
      },
    },
  };
  return { client, calls };
}

describe('assessContext (IDF coverage of the best chunk)', () => {
  it('is grounded when the rare words are in one chunk', () => {
    const w = { rust: 4, iron: 3, doe: 0.5 };
    const a = assessContext([hit('3.5 Corrosion', ['rust', 'iron'], w)]);
    expect(a.status).toBe('grounded');
    expect(a.coverage).toBeCloseTo(7 / 7.5);
    expect(a.terms).toEqual(['rust', 'iron', 'doe']); // rarest first
    expect(a.missingTerms).toEqual(['doe']);
  });

  it('is none when only common words match (rare words decide)', () => {
    const w = { mendeleev: 5.9, period: 4.5, law: 2.9 };
    const a = assessContext([hit('11.4 Ohm’s Law', ['law'], w, 'physics')]);
    expect(a.status).toBe('none');
    expect(a.missingTerms).toEqual(['mendeleev', 'period']);
    expect(assessContext([]).status).toBe('none');
  });

  it('uses the best SINGLE chunk, not the union of the top 3', () => {
    const w = { newton: 5.2, motion: 3.9, law: 2.9, second: 2.9 };
    const a = assessContext([hit('11.4', ['motion', 'law'], w), hit('10.4', ['newton', 'second'], w)]);
    expect(a.coverage).toBeCloseTo(8.1 / 14.9);
    expect(a.status).toBe('weak');
  });
});

describe('retrieveContext', () => {
  const w = { ozon: 4, cfc: 5, layer: 3 };
  const good = [hit('13.2.1 Ozone Layer', ['ozon', 'cfc', 'layer'], w, 'biology')];

  it('uses router keywords for Telugu script and the question itself otherwise', async () => {
    const te = fakeClient({ all: good });
    await retrieveContext(te.client, { question: 'ఓజోన్ పొర ఎందుకు?', routerKeywords: ['ozone', 'layer', 'CFCs'] });
    expect(te.calls[0]).toMatchObject({ fn: 'match_chunks_weighted', query: 'ozone layer cfcs' });
    const en = fakeClient({ all: good });
    const out = await retrieveContext(en.client, { question: 'Why is the ozone layer important?', routerKeywords: ['ignored'] });
    expect(en.calls[0].query).toBe('why is the ozone layer important');
    expect(out.keywordSource).toBe('question');
  });

  it('uses router keywords for Telugu typed in English letters, with a fallback when empty', async () => {
    const latn = fakeClient({ all: good });
    const out = await retrieveContext(latn.client, { question: 'ozone pora ela debba tintundi?', routerLanguage: 'te_latn', routerKeywords: ['ozone', 'layer', 'depletion'] });
    expect(latn.calls[0].query).toBe('ozone layer depletion');
    expect(out.keywordSource).toBe('router');
    const empty = fakeClient({ all: good });
    await retrieveContext(empty.client, { question: 'ozone pora ela?', routerLanguage: 'te_latn', routerKeywords: [] });
    expect(empty.calls[0].query).toBe('ozone pora ela');
  });

  it('retries without a wrong router subject, but never drops a screen subject', async () => {
    const { client, calls } = fakeClient({ chemistry: [], all: good });
    const out = await retrieveContext(client, { question: 'How do CFCs harm the ozone layer?', routerSubject: 'chemistry' });
    expect(calls.map((c) => c.subject)).toEqual(['chemistry', null]);
    expect(out).toMatchObject({ status: 'grounded', subjectRetried: true, subjectFilter: null });

    const screen = fakeClient({ chemistry: [], all: good });
    const kept = await retrieveContext(screen.client, { question: 'How do CFCs harm the ozone layer?', screenSubject: 'chemistry' });
    expect(screen.calls).toHaveLength(1);
    expect(kept.status).toBe('none');
  });
});
