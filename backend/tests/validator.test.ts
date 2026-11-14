import { describe, expect, it } from 'vitest';
import { DATA_RULE, type ChatFn } from '../src/agents/kit.ts';
import type { QuizQuestion } from '../src/agents/quiz.ts';
import { MAX_BATCH, runValidator, type ValidatorInput } from '../src/agents/validator.ts';
import type { ChatResult } from '../src/shared/llm.ts';
import type { ChunkHit } from '../src/shared/retrieval.ts';

const P: ChunkHit[] = [
  { chunk_id: 'c1', chapter_id: 'ch11', chapter_number: 11, chapter_title_en: 'Electricity', subject_code: 'physics', page_start: 176, page_end: 177, section_path: '11.4 Ohm’s Law', content: 'Ohm law: the potential difference across a conductor is proportional to the current through it, V = IR.', rank: 10 },
  { chunk_id: 'c2', chapter_id: 'ch11', chapter_number: 11, chapter_title_en: 'Electricity', subject_code: 'physics', page_start: 180, page_end: 181, section_path: '11.6 Resistors', content: 'Resistors in series: the potential difference across a conductor is shared, R = R1 + R2.', rank: 9 },
];
const mcq = (over: Partial<QuizQuestion> = {}): QuizQuestion => ({
  type: 'mcq', stem: 'What is the SI unit of electric current?', options: ['volt', 'ampere', 'ohm', 'watt'], answerIndex: 1, answer: 'ampere',
  explanation: 'SECRET-EXPLANATION', difficulty: 1, sourceChunkIds: ['c1'], citations: [], verifiedNumeric: false, work: null, ...over,
});
const numeric = (over: Partial<QuizQuestion> = {}): QuizQuestion => ({
  type: 'numeric', stem: 'A 12 V battery drives a current through a 4 ohm resistor. Find the current.', options: null, answerIndex: null, answer: '3 A',
  explanation: '', difficulty: 2, sourceChunkIds: ['c1'], citations: [], verifiedNumeric: true, work: { given: { V: '12 V', R: '4 ohm' }, expression: 'V/R', unit: 'A' }, ...over,
});
const input = (questions: QuizQuestion[]): ValidatorInput => ({ questions, passages: P });

function mockChat(content: string | Error) {
  const calls: { messages: { role: string; content: unknown }[]; overrides?: { maxTokens?: number } }[] = [];
  const chat: ChatFn = async (_task, messages, overrides) => {
    calls.push({ messages: messages as { role: string; content: unknown }[], overrides });
    if (content instanceof Error) throw content;
    return { content, model: 'mock', usedFallback: false, inputTokens: 900, outputTokens: 200, costInr: 0.02, latencyMs: 1500 } satisfies ChatResult;
  };
  return { chat, calls };
}
const v = (id: number, over: object = {}) => ({ id, choice: null, value: null, answerable: true, ambiguous: false, evidence: 'the potential difference across a conductor', note: '', ...over });
const reply = (verdicts: object[]) => JSON.stringify({ verdicts });

describe('validator prompt', () => {
  it('never shows the key, the explanation or the answer text; shows only cited passages and fences', async () => {
    const { chat, calls } = mockChat(reply([v(1, { choice: 2 })]));
    await runValidator(input([mcq()]), { chat });
    const system = String(calls[0].messages[0].content);
    const user = String(calls[0].messages[1].content);
    expect(system).toContain(DATA_RULE);
    expect(system).toContain('You do NOT have the answer key');
    expect(user).toContain('Q1 (mcq; passages 1): What is the SI unit of electric current?');
    expect(user).toContain('2) ampere');
    expect(user).not.toContain('SECRET-EXPLANATION');
    expect(user).toContain('[1] Ch 11 Electricity > 11.4 Ohm’s Law');
    expect(user).not.toContain('11.6 Resistors'); // c2 is not cited
    expect(calls[0].overrides?.maxTokens).toBe(150 + 90);
  });

  it('renumbers passages when several questions cite different chunks', async () => {
    const { chat, calls } = mockChat(reply([v(1, { choice: 2 }), v(2, { value: '3 A' })]));
    await runValidator(input([mcq({ sourceChunkIds: ['c2'] }), numeric({ sourceChunkIds: ['c2', 'c1'] })]), { chat });
    const user = String(calls[0].messages[1].content);
    expect(user).toContain('Q1 (mcq; passages 1)');
    expect(user).toContain('Q2 (numeric; passages 1, 2)');
    expect(user).toContain('[1] Ch 11 Electricity > 11.6 Resistors');
  });
});

describe('verdicts', () => {
  it('keeps a question when the validator agrees with the key (MCQ by option, numeric by calculator)', async () => {
    const { chat } = mockChat(reply([v(1, { choice: 2 }), v(2, { value: '3.0 A' })]));
    const run = await runValidator(input([mcq(), numeric()]), { chat });
    expect(run.source).toBe('model');
    expect(run.output.accepted).toHaveLength(2);
    expect(run.output.rejected).toEqual([]);
  });

  it('rejects: different answer, not answerable, ambiguous, missing verdict, bad numeric', async () => {
    const qs = [mcq(), mcq({ stem: 'Second question about current flow here' }), mcq({ stem: 'Third question about voltage and units' }), mcq({ stem: 'Fourth question never judged by the model' }), numeric()];
    const { chat } = mockChat(reply([
      v(1, { choice: 3 }),
      v(2, { choice: null, answerable: false, note: 'not in the passage' }),
      v(3, { choice: 2, ambiguous: true, note: 'two right' }),
      v(5, { value: '12 A' }),
    ]));
    const run = await runValidator(input(qs), { chat });
    expect(run.output.accepted).toEqual([]);
    expect(run.output.rejected.map((r) => r.reason)).toEqual([
      'validator picked option C, key is B',
      'not answerable from the passages: not in the passage',
      'ambiguous: two right',
      'validator gave no verdict',
      'validator got 12 A, key is 3 A',
    ]);
  });

  it('accepts string booleans and choice as a string; rejects an out-of-range choice', async () => {
    const { chat } = mockChat(reply([v(1, { choice: '2', answerable: 'true', ambiguous: 'no' }), v(2, { choice: 9 })]));
    const run = await runValidator(input([mcq(), mcq({ stem: 'Another question about the unit of current' })]), { chat });
    expect(run.output.accepted).toHaveLength(1);
    expect(run.output.rejected[0].reason).toBe('validator gave no valid option');
  });
});

describe('evidence check', () => {
  it('rejects an answer whose quote is not in the cited passages (the validator used outside knowledge)', async () => {
    const { chat } = mockChat(reply([v(1, { choice: 2, evidence: 'chlorophyll absorbs sunlight in the leaf' }), v(2, { value: '3 A', evidence: '' })]));
    const run = await runValidator(input([mcq(), numeric()]), { chat });
    expect(run.output.accepted).toEqual([]);
    expect(run.output.rejected.map((r) => r.reason)).toEqual(Array(2).fill('no supporting quote from the cited passages'));
  });
});

describe('fail closed', () => {
  it('keeps nothing when the model errors', async () => {
    const run = await runValidator(input([mcq(), numeric()]), { chat: mockChat(new Error('402')).chat });
    expect(run.source).toBe('fallback');
    expect(run.output.accepted).toEqual([]);
    expect(run.output.rejected.map((r) => r.reason)).toEqual(['validator unavailable', 'validator unavailable']);
  });

  it('keeps nothing on invalid JSON', async () => {
    const run = await runValidator(input([mcq()]), { chat: mockChat('sorry').chat });
    expect(run.source).toBe('fallback');
    expect(run.output.accepted).toEqual([]);
  });

  it('makes no model call for zero questions; questions past the batch limit are not kept', async () => {
    const empty = mockChat(reply([]));
    expect((await runValidator(input([]), { chat: empty.chat })).output).toEqual({ accepted: [], rejected: [] });
    expect(empty.calls).toHaveLength(0);

    const many = Array.from({ length: MAX_BATCH + 1 }, (_, i) => mcq({ stem: `Question number ${i} about electric current?` }));
    const { chat, calls } = mockChat(reply(many.map((_, i) => v(i + 1, { choice: 2 }))));
    const run = await runValidator(input(many), { chat });
    expect(calls).toHaveLength(1);
    expect(run.output.accepted).toHaveLength(MAX_BATCH);
    expect(run.output.rejected).toHaveLength(1);
  });
});
