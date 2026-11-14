import { describe, expect, it } from 'vitest';
import type { ChatFn } from '../src/agents/kit.ts';
import { generateValidatedQuiz, publicQuestion, toQuestionRows, VALIDATION_MIN_MS, type QuizRequest } from '../src/agents/quiz-pipeline.ts';
import type { ChatResult } from '../src/shared/llm.ts';
import type { ChunkHit } from '../src/shared/retrieval.ts';

const P: ChunkHit[] = [
  { chunk_id: 'c1', chapter_id: 'ch11', chapter_number: 11, chapter_title_en: 'Electricity', subject_code: 'physics', page_start: 176, page_end: 177, section_path: '11.4 Ohm’s Law', content: 'Ohm law: the potential difference across a conductor is proportional to the current through it, V = IR.', rank: 0 },
];
const req: QuizRequest = { passages: P, count: 2, language: 'en', assessmentScope: 'summative', types: ['mcq'] };

const mq = (stem: string, answer = 1) => ({ type: 'mcq', stem, options: ['volt', 'ampere', 'ohm', 'watt'], answer, explanation: 'SECRET', difficulty: 1, sources: [1] });
const writerReply = (qs: object[]) => JSON.stringify({ questions: qs });

/** Mock: the 'quiz' task returns `writer`, the 'validator' task returns `validator` (a function of the prompt). */
function mockChat(writer: string | Error, validator: string | Error | ((prompt: string) => string)) {
  const tasks: string[] = [];
  const chat: ChatFn = async (task, messages) => {
    tasks.push(task);
    const reply = task === 'quiz' ? writer : typeof validator === 'function' ? validator(String(messages[1].content)) : validator;
    if (reply instanceof Error) throw reply;
    return { content: reply, model: task === 'quiz' ? 'writer-model' : 'validator-model', usedFallback: false, inputTokens: 1000, outputTokens: 300, costInr: 0.05, latencyMs: 4000 } satisfies ChatResult;
  };
  return { chat, tasks };
}
const verdicts = (n: number, over: (i: number) => object = () => ({})) => JSON.stringify({
  verdicts: Array.from({ length: n }, (_, i) => ({ id: i + 1, choice: null, value: null, answerable: true, ambiguous: false, evidence: 'the potential difference across a conductor', note: '', ...over(i) })),
});
// The writer's key is shuffled by code, so the validator reads the displayed options and picks "ampere".
const pickAmpere = (prompt: string) => {
  const qs = prompt.slice(prompt.indexOf('Questions:') + 'Questions:'.length).trim().split(/\n\n/).filter((b) => /^Q\d/.test(b));
  return JSON.stringify({
    verdicts: qs.map((b, i) => ({ id: i + 1, choice: Number(b.split('\n').find((l) => l.includes('ampere'))!.trim()[0]), answerable: true, ambiguous: false, evidence: 'the potential difference across a conductor' })),
  });
};

describe('generateValidatedQuiz', () => {
  it('writes one spare question, validates, returns only validated questions up to the requested count', async () => {
    const { chat, tasks } = mockChat(writerReply([mq('Which is the SI unit of electric current?'), mq('What does an ammeter measure in a circuit?'), mq('Name the unit of current used in Ohm law.')]), pickAmpere);
    const r = await generateValidatedQuiz(req, { ctx: { chat } });
    expect(tasks).toEqual(['quiz', 'validator']);
    expect(r.ok && r.questions).toHaveLength(2);
    expect(r.ok && r.models).toEqual({ generated: 'writer-model', validated: 'validator-model' });
    expect(r.usage.map((u) => u.agent)).toEqual(['quiz', 'validator']);
  });

  it('asks the writer for one spare question, even when the student wants the maximum (5)', async () => {
    const { chat } = mockChat(writerReply([]), verdicts(0));
    const prompts: string[] = [];
    const spy: ChatFn = async (task, messages, o) => { prompts.push(String(messages[0].content)); return chat(task, messages, o); };
    await generateValidatedQuiz({ ...req, count: 5 }, { ctx: { chat: spy } });
    expect(prompts[0]).toContain('Write exactly 6 questions');
  });

  it('drops questions the validator disagrees with', async () => {
    const { chat } = mockChat(writerReply([mq('Which is the SI unit of electric current?'), mq('What does an ammeter measure in a circuit?')]),
      (prompt) => JSON.stringify({ verdicts: [
        { id: 1, choice: Number(prompt.split('\n').find((l) => /Q1/.test(l)) ? 1 : 1), answerable: false, ambiguous: false, evidence: '' },
        ...JSON.parse(pickAmpere(prompt)).verdicts.slice(1),
      ] }));
    const r = await generateValidatedQuiz(req, { ctx: { chat } });
    expect(r.ok && r.questions).toHaveLength(1);
    expect(r.ok && r.dropped.map((d) => d.reason.startsWith('not answerable'))).toEqual([true]);
  });

  it('serves nothing when the validator is down (fails closed)', async () => {
    const { chat } = mockChat(writerReply([mq('Which is the SI unit of electric current?')]), new Error('402'));
    const r = await generateValidatedQuiz(req, { ctx: { chat } });
    expect(r).toMatchObject({ ok: false, reason: 'nothing_validated' });
    expect(r.usage.map((u) => u.agent)).toEqual(['quiz', 'validator']);
  });

  it('does not call the validator when too little time is left, and says so', async () => {
    const { chat, tasks } = mockChat(writerReply([mq('Which is the SI unit of electric current?')]), verdicts(1));
    const r = await generateValidatedQuiz(req, { ctx: { chat }, timeLeft: () => VALIDATION_MIN_MS - 1 });
    expect(r).toMatchObject({ ok: false, reason: 'no_time' });
    expect(tasks).toEqual(['quiz']);
  });

  it('refuses formative-only chapters without any model call', async () => {
    const { chat, tasks } = mockChat(writerReply([]), verdicts(0));
    const r = await generateValidatedQuiz({ ...req, assessmentScope: 'formative_only' }, { ctx: { chat } });
    expect(r).toMatchObject({ ok: false, reason: 'refused' });
    expect(tasks).toEqual([]);
  });

  it('reports quiz_failed when the writer returns nothing usable', async () => {
    const { chat, tasks } = mockChat('not json', verdicts(0));
    const r = await generateValidatedQuiz(req, { ctx: { chat } });
    expect(r).toMatchObject({ ok: false, reason: 'quiz_failed' });
    expect(tasks).toEqual(['quiz']);
  });
});

describe('database rows', () => {
  it('splits a question into a public row and a secret key row; the student copy has no key or explanation', async () => {
    const { chat } = mockChat(writerReply([mq('Which is the SI unit of electric current?')]), pickAmpere);
    const r = await generateValidatedQuiz({ ...req, count: 1 }, { ctx: { chat } });
    if (!r.ok) throw new Error('expected ok ' + JSON.stringify(r));
    const [row] = toQuestionRows(r.questions, { chapterId: 'chap', language: 'te', generatedBy: 'g', validatedBy: 'v', newId: () => 'q-1' });

    expect(row.question).toMatchObject({ id: 'q-1', chapter_id: 'chap', type: 'mcq', language: 'te', validation_status: 'validated', generated_by_model: 'g', validated_by_model: 'v', source_chunk_ids: ['c1'] });
    expect(row.question).not.toHaveProperty('answer');
    expect(row.question).not.toHaveProperty('explanation');
    expect(row.key).toMatchObject({ question_id: 'q-1', answer: 'ampere', explanation: 'SECRET' });
    expect(row.key.answer_index).toBe(r.questions[0].answerIndex);

    const shown = publicQuestion(row.question, 1, 1);
    expect(JSON.stringify(shown)).not.toMatch(/SECRET|answer/);
    expect(shown.options).toEqual(r.questions[0].options);
  });
});
