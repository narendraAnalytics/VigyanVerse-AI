import { describe, expect, it } from 'vitest';
import { DATA_RULE, STYLE_RULE, type ChatFn } from '../src/agents/kit.ts';
import { extractiveAnswer, MAX_TOKENS, NOT_IN_TEXTBOOK_LABEL, runTutor, type TutorInput } from '../src/agents/tutor.ts';
import type { ChatOverrides, ChatResult } from '../src/shared/llm.ts';
import type { ChunkHit } from '../src/shared/retrieval.ts';

const passage = (id: string, section: string, pages: [number, number], content: string): ChunkHit => ({
  chunk_id: id, chapter_id: 'ch', chapter_number: 11, chapter_title_en: 'Electricity', subject_code: 'physics',
  page_start: pages[0], page_end: pages[1], section_path: section, content, rank: 10,
});
const P = [
  passage('a', '11.4 Ohm’s Law', [176, 177], 'Ohm’s law states that the current through a conductor is directly proportional to the potential difference. V = IR.'),
  passage('b', '11.5 Factors on Which the Resistance of a Conductor Depends', [178, 179], 'Resistance depends on length, area and the material.'),
];
const base: TutorInput = { question: 'State Ohm’s law', language: 'en', wantsDetail: false, passages: P, status: 'grounded' };

function mockChat(content: string | Error) {
  const calls: { messages: { role: string; content: unknown }[]; overrides?: ChatOverrides }[] = [];
  const chat: ChatFn = async (_task, messages, overrides) => {
    calls.push({ messages: messages as { role: string; content: unknown }[], overrides });
    if (content instanceof Error) throw content;
    return { content, model: 'mock', usedFallback: false, inputTokens: 900, outputTokens: 80, costInr: 0.02, latencyMs: 700 } satisfies ChatResult;
  };
  return { chat, calls };
}
const reply = (o: object) => JSON.stringify(o);

describe('tutor prompt', () => {
  it('has the style, data and language rules and numbered passages with pages', async () => {
    const { chat, calls } = mockChat(reply({ answer: 'V = IR.', inTextbook: true, sources: [1], relatedPassage: null }));
    await runTutor({ ...base, language: 'te' }, { chat });
    const system = String(calls[0].messages[0].content);
    const user = String(calls[0].messages[1].content);
    expect(system).toContain(STYLE_RULE);
    expect(system).toContain(DATA_RULE);
    expect(system).toContain('Telugu script');
    expect(user).toContain('[1] Ch 11 Electricity > 11.4 Ohm’s Law (p. 176-177)');
    expect(user).toContain('[2] Ch 11');
    expect(user).toContain('"""\nState Ohm’s law\n"""');
    expect(calls[0].overrides?.maxTokens).toBe(MAX_TOKENS.short);
  });

  it('allows a longer answer only when the student asked for detail', async () => {
    const { chat, calls } = mockChat(reply({ answer: 'Step 1...', inTextbook: true, sources: [1], relatedPassage: null }));
    await runTutor({ ...base, wantsDetail: true }, { chat });
    expect(String(calls[0].messages[0].content)).not.toContain(STYLE_RULE);
    expect(String(calls[0].messages[0].content)).toContain('up to 8 short sentences');
    expect(calls[0].overrides?.maxTokens).toBe(MAX_TOKENS.detail);
  });
});

describe('tutor output (deterministic part)', () => {
  it('builds citations only from our passages and drops invented source numbers', async () => {
    const { chat } = mockChat(reply({ answer: 'Current is proportional to voltage [1]. V = IR.', inTextbook: true, sources: [1, 1, 7], relatedPassage: null }));
    const run = await runTutor(base, { chat });
    expect(run.source).toBe('model');
    expect(run.output.citations).toEqual([{ chunkId: 'a', chapterNumber: 11, chapterTitle: 'Electricity', section: '11.4 Ohm’s Law', pageStart: 176, pageEnd: 177 }]);
    expect(run.output.droppedSources).toBe(1);
    expect(run.output.answer).toBe('Current is proportional to voltage. V = IR.'); // "[1]" removed
    expect(run.output.label).toBeNull();
  });

  it('labels a general-knowledge answer, gives no citations, and keeps a real related topic', async () => {
    const { chat } = mockChat(reply({ answer: 'Force = mass × acceleration.', inTextbook: false, sources: [], relatedPassage: 2 }));
    const run = await runTutor({ ...base, question: 'Newton second law?', status: 'none', language: 'te_latn' }, { chat });
    expect(run.output).toMatchObject({ inTextbook: false, citations: [], label: NOT_IN_TEXTBOOK_LABEL.te_latn });
    expect(run.output.related?.section).toBe('11.5 Factors on Which the Resistance of a Conductor Depends');
  });

  it('never claims "in the textbook" without a real passage behind it', async () => {
    const { chat } = mockChat(reply({ answer: 'A black hole is...', inTextbook: true, sources: [9], relatedPassage: 9 }));
    const run = await runTutor({ ...base, status: 'none' }, { chat });
    expect(run.output).toMatchObject({ inTextbook: false, citations: [], label: NOT_IN_TEXTBOOK_LABEL.en, related: null, droppedSources: 1 });
  });
});

describe('tutor fallback', () => {
  it('quotes the textbook with a citation when the model fails', async () => {
    const run = await runTutor(base, { chat: mockChat(new Error('429 Rate limit exceeded')).chat });
    expect(run.source).toBe('fallback');
    expect(run.output.answer).toBe('Here is what your textbook says: "Ohm’s law states that the current through a conductor is directly proportional to the potential difference. V = IR."');
    expect(run.output.citations[0].pageStart).toBe(176);
  });

  it('quotes the explaining sentences, not the activity steps', () => {
    const h = { ...P[0], matched_lexemes: ['ohm', 'law'],
      content: 'Activity 11.2 • Take a nichrome wire, a torch bulb and an ammeter. Set up the circuit. Ohm’s law states that the potential difference is proportional to the current. This is called Ohm’s law, V = IR.' };
    expect(extractiveAnswer(h)).toBe('Ohm’s law states that the potential difference is proportional to the current. This is called Ohm’s law, V = IR.');
  });

  it('says sorry (in Telugu) when there is no textbook passage either', async () => {
    const run = await runTutor({ ...base, language: 'te', status: 'none', passages: [] }, { chat: mockChat('not json').chat });
    expect(run.source).toBe('fallback');
    expect(run.output.answer).toContain('క్షమించండి');
    expect(run.output.citations).toEqual([]);
  });
});
