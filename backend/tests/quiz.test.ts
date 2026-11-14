import { describe, expect, it } from 'vitest';
import { DATA_RULE, type ChatFn } from '../src/agents/kit.ts';
import { runQuiz, shuffleOptions, type QuizInput } from '../src/agents/quiz.ts';
import type { ChatOverrides, ChatResult } from '../src/shared/llm.ts';
import type { ChunkHit } from '../src/shared/retrieval.ts';

const P: ChunkHit[] = [
  { chunk_id: 'c1', chapter_id: 'ch11', chapter_number: 11, chapter_title_en: 'Electricity', subject_code: 'physics', page_start: 176, page_end: 177, section_path: '11.4 Ohm’s Law', content: 'V = IR.', rank: 10 },
  { chunk_id: 'c2', chapter_id: 'ch11', chapter_number: 11, chapter_title_en: 'Electricity', subject_code: 'physics', page_start: 180, page_end: 181, section_path: '11.6 Resistance of a System of Resistors', content: 'Series: R = R1 + R2.', rank: 9 },
];
const base: QuizInput = { passages: P, count: 3, language: 'en', assessmentScope: 'summative', types: ['mcq', 'numeric'] };

function mockChat(content: string | Error) {
  const calls: { messages: { role: string; content: unknown }[]; overrides?: ChatOverrides }[] = [];
  const chat: ChatFn = async (_task, messages, overrides) => {
    calls.push({ messages: messages as { role: string; content: unknown }[], overrides });
    if (content instanceof Error) throw content;
    return { content, model: 'mock', usedFallback: false, inputTokens: 1200, outputTokens: 700, costInr: 0.05, latencyMs: 6000 } satisfies ChatResult;
  };
  return { chat, calls };
}
const reply = (questions: object[]) => JSON.stringify({ questions });
const good = { type: 'mcq', stem: 'What is the SI unit of electric current?', options: ['ampere', 'volt', 'ohm', 'watt'], answer: 0, explanation: 'Current is measured in ampere.', difficulty: 1, sources: [1] };

describe('quiz prompt', () => {
  it('asks for the count, types, passages only, no "all of the above", and fences nothing from students', async () => {
    const { chat, calls } = mockChat(reply([good]));
    await runQuiz({ ...base, count: 4, language: 'te' }, { chat });
    const system = String(calls[0].messages[0].content);
    expect(system).toContain('Write exactly 4 questions using ONLY facts in the numbered textbook passages');
    expect(system).toContain('Question types allowed: mcq, numeric');
    expect(system).toContain('Never use "all of the above"');
    expect(system).toContain('Telugu script');
    expect(system).toContain(DATA_RULE);
    expect(String(calls[0].messages[1].content)).toContain('[1] Ch 11 Electricity > 11.4 Ohm’s Law (p. 176-177)');
    expect(calls[0].overrides?.maxTokens).toBe(300 + 280 * 4);
  });

  it('caps a request at MAX_WRITTEN (6) questions', async () => {
    const { chat, calls } = mockChat(reply([good]));
    await runQuiz({ ...base, count: 50 }, { chat });
    expect(String(calls[0].messages[0].content)).toContain('Write exactly 6 questions');
  });
});

describe('code gates', () => {
  it('keeps a good MCQ, shuffles its options and keeps the right answer; sources come from our passages', async () => {
    const run = await runQuiz(base, { chat: mockChat(reply([good])).chat });
    const q = run.output.questions[0];
    expect(q.options?.slice().sort()).toEqual(['ampere', 'ohm', 'volt', 'watt']);
    expect(q.options?.[q.answerIndex!]).toBe('ampere');
    expect(q.answer).toBe('ampere');
    expect(q.sourceChunkIds).toEqual(['c1']);
    expect(q.citations[0].pageStart).toBe(176);
  });

  it.each([
    [{ ...good, options: ['ampere', 'volt', 'ohm'] }, 'needs exactly 4 non-empty options'],
    [{ ...good, options: ['ampere', 'Ampere', 'ohm', 'watt'] }, 'options repeat'],
    [{ ...good, answer: 4 }, 'answer is not an option index 0-3'],
    [{ ...good, options: ['ampere', 'volt', 'ohm', 'All of the above'] }, 'uses "all/none of the above"'],
    [{ ...good, options: ['the ampere, which is one coulomb of charge flowing per second', 'volt', 'ohm', 'watt'] }, 'right option is much longer than the others (answer giveaway)'],
    [{ ...good, sources: [7] }, 'no textbook source'],
    [{ ...good, stem: 'Unit?' }, 'stem too short'],
  ])('rejects a flawed MCQ: %j', async (q, reason) => {
    const run = await runQuiz(base, { chat: mockChat(reply([q])).chat });
    expect(run.output.questions).toHaveLength(0);
    expect(run.output.rejected[0].reason).toBe(reason);
  });

  it('drops duplicates and types that were not asked for', async () => {
    const run = await runQuiz({ ...base, types: ['mcq'] }, { chat: mockChat(reply([good, { ...good }, { type: 'numeric', stem: 'Find the current through 4 ohm at 12 V.', answer: '3 A', given: { V: '12 V', R: '4 ohm' }, expression: 'V / R', unit: 'A', sources: [1] }])).chat });
    expect(run.output.questions).toHaveLength(1);
    expect(run.output.rejected.map((r) => r.reason)).toEqual(['duplicate', 'type numeric was not asked for']);
  });
});

describe('numeric questions are checked by the calculator', () => {
  const numeric = { type: 'numeric', stem: 'A 4 Ω resistor is connected to a 12 V battery. Find the current.', given: { V: '12 V', R: '4 ohm' }, expression: 'V / R', unit: 'A', explanation: 'I = V/R.', sources: [1] };
  it('keeps one the calculator reproduces', async () => {
    const run = await runQuiz(base, { chat: mockChat(reply([{ ...numeric, answer: '3 A' }])).chat });
    expect(run.output.questions[0]).toMatchObject({ type: 'numeric', answer: '3 A', verifiedNumeric: true, options: null });
  });
  it('drops one with a wrong key or an expression it cannot run', async () => {
    const wrong = await runQuiz(base, { chat: mockChat(reply([{ ...numeric, answer: '4 A' }])).chat });
    expect(wrong.output.rejected[0].reason).toBe('the calculator gets 3 A, not 4 A');
    const bad = await runQuiz(base, { chat: mockChat(reply([{ ...numeric, expression: 'zeros(1000, 1000)', answer: '3 A' }])).chat });
    expect(bad.output.rejected[0].reason).toBe('the calculator could not compute the answer');
  });
});

describe('rules before the model', () => {
  it('no exam-style quiz for a formative-only chapter, and no model call', async () => {
    const { chat, calls } = mockChat(reply([good]));
    const run = await runQuiz({ ...base, assessmentScope: 'formative_only' }, { chat });
    expect(run.output.refused).toContain('formative only');
    expect(calls).toHaveLength(0);
  });
  it('no passages, no quiz; a failed model call gives no invented questions', async () => {
    expect((await runQuiz({ ...base, passages: [] }, { chat: mockChat(reply([good])).chat })).output.refused).toContain('No textbook passages');
    const failed = await runQuiz(base, { chat: mockChat(new Error('timeout')).chat });
    expect(failed).toMatchObject({ source: 'fallback', output: { questions: [] } });
  });
});

describe('shuffle', () => {
  it('is deterministic per stem and spreads the key over positions', () => {
    expect(shuffleOptions(['a', 'b', 'c', 'd'], 0, 'same stem')).toEqual(shuffleOptions(['a', 'b', 'c', 'd'], 0, 'same stem'));
    const positions = new Set(Array.from({ length: 40 }, (_, i) => shuffleOptions(['a', 'b', 'c', 'd'], 0, `stem ${i}`).answerIndex));
    expect(positions.size).toBe(4);
  });
});
