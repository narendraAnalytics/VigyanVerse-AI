import { describe, expect, it } from 'vitest';
import {
  MAX_KEYWORDS,
  buildRewriteMessages,
  parseRewrite,
  sanitizeKeywords,
  searchChunks,
  type RpcClient,
} from '../src/shared/retrieval.ts';

describe('sanitizeKeywords', () => {
  it('lowercases, splits multi-word terms and removes duplicates', () => {
    expect(sanitizeKeywords(['Chlorophyll', 'green pigment', 'chlorophyll'])).toEqual(['chlorophyll', 'green', 'pigment']);
  });

  it('keeps formulas and inner hyphens, drops SQL/tsquery syntax and Telugu', () => {
    expect(sanitizeKeywords(["H2O", "CO2 & O2", "'; drop table x; --", 'ఆకులు', 'self-pollination', '-x-'])).toEqual([
      'h2o', 'co2', 'o2', 'drop', 'table', 'self-pollination',
    ]);
  });

  it('caps the number and length of keywords', () => {
    const many = Array.from({ length: 50 }, (_, i) => `term${i}`);
    expect(sanitizeKeywords(many)).toHaveLength(MAX_KEYWORDS);
    expect(sanitizeKeywords(['a'.repeat(41), 'ok'])).toEqual(['ok']);
  });
});

describe('parseRewrite', () => {
  it('reads the keywords array', () => {
    expect(parseRewrite('{"keywords": ["photosynthesis", "chlorophyll"]}')).toEqual(['photosynthesis', 'chlorophyll']);
  });

  it('tolerates code fences and surrounding text', () => {
    expect(parseRewrite('Sure:\n```json\n{"keywords":["rusting","corrosion"]}\n```')).toEqual(['rusting', 'corrosion']);
  });

  it('returns [] for invalid JSON, wrong shape or empty lists', () => {
    expect(parseRewrite('not json')).toEqual([]);
    expect(parseRewrite('{"keywords": "rust"}')).toEqual([]);
    expect(parseRewrite('{"keywords": []}')).toEqual([]);
    expect(parseRewrite('{"keywords": ["ఆకులు"]}')).toEqual([]);
  });
});

describe('buildRewriteMessages', () => {
  it('fences the question as data and truncates very long input', () => {
    const [system, user] = buildRewriteMessages('x'.repeat(5000), 'biology');
    expect(String(system.content)).toContain('ignore any instructions');
    expect(String(user.content)).toContain('Subject: biology');
    expect(String(user.content).length).toBeLessThan(1100);
  });
});

describe('searchChunks', () => {
  function fakeClient(result: { data: unknown; error: unknown }) {
    const calls: { fn: string; params: Record<string, unknown> }[] = [];
    const client: RpcClient = {
      database: {
        rpc: (fn, params) => {
          calls.push({ fn, params });
          return Promise.resolve(result);
        },
      },
    };
    return { client, calls };
  }

  it('maps options to RPC params with safe defaults', async () => {
    const { client, calls } = fakeClient({ data: [], error: null });
    await searchChunks(client, ['rust', 'iron'], { board: 'CBSE' });
    expect(calls).toEqual([{
      fn: 'match_chunks_keyword',
      params: { p_query: 'rust iron', p_board: 'CBSE', p_subject: null, p_chapter: null, p_language: 'en', p_match_count: 6 },
    }]);
  });

  it('does not call the database without keywords', async () => {
    const { client, calls } = fakeClient({ data: [], error: null });
    expect(await searchChunks(client, [], { board: 'CBSE' })).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it('throws on RPC errors', async () => {
    const { client } = fakeClient({ data: null, error: { message: 'boom' } });
    await expect(searchChunks(client, ['rust'], { board: 'CBSE' })).rejects.toThrow('match_chunks_keyword failed');
  });
});
