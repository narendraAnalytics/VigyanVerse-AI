import { describe, expect, it, vi } from 'vitest';
import { runTurn, type TurnDeps, type TurnInput } from '../src/agents/graph.ts';
import type { ChatFn } from '../src/agents/kit.ts';
import { buildPrismRequest, PRISM_MIN_CONFIDENCE, prismToRouterOutput, routeFast } from '../src/agents/prism-router.ts';
import type { RetrievalOutput } from '../src/agents/retrieval.ts';
import type { ChatResult } from '../src/shared/llm.ts';
import { prismCostInr, prismDecide, type DecideFn, type PrismResult } from '../src/shared/prism.ts';

const prism = (intent: string, conf: number, subject = 'physics', detail = 0.1): PrismResult => ({
  answers: {
    intent: { type: 'choice', choice: intent, confidence: conf },
    subject: { type: 'choice', choice: subject, confidence: 0.9 },
    detail: { type: 'noul', noul: detail },
  },
  inputTokens: 460, latencyMs: 140, costInr: prismCostInr(460),
});

/** The DeepSeek router (backup), mocked: records calls. */
function fakeRouter(reply: object = { intent: 'concept', subject: 'chemistry', language: 'en', wantsDetail: false, keywords: ['acid'] }) {
  const calls: string[] = [];
  const chat: ChatFn = async (task) => {
    calls.push(task);
    if (task !== 'router') throw new Error(`unexpected ${task}`);
    return { content: JSON.stringify(reply), model: 'mock-deepseek', usedFallback: false, inputTokens: 500, outputTokens: 50, costInr: 0.011, latencyMs: 1500 } satisfies ChatResult;
  };
  return { chat, calls };
}

describe('Prism request', () => {
  it('asks intent, subject and detail about the message (with context when given)', () => {
    const req = buildPrismRequest({ message: 'give an example', previousMessage: 'What is a neuron?', subjectHint: 'biology' });
    expect(req.state).toEqual({ screen_subject: 'biology', previous_student_message: 'What is a neuron?', student_message: 'give an example' });
    expect(Object.keys(req.questions)).toEqual(['intent', 'subject', 'detail']);
    const intent = req.questions.intent;
    expect(intent.type === 'choice' && Object.keys(intent.criteria)).toEqual(['concept', 'numerical', 'quiz', 'follow_up', 'greeting', 'off_topic', 'unsafe']);
  });
});

describe('Prism answers -> router output', () => {
  it('maps a confident answer to the router shape (English, no keywords)', () => {
    expect(prismToRouterOutput(prism('numerical', 0.92, 'physics', 0.8), { message: 'x' })).toEqual({ intent: 'numerical', subject: 'physics', language: 'en', wantsDetail: true, keywords: [] });
  });
  it('subject "none" falls back to the screen subject (or null)', () => {
    expect(prismToRouterOutput(prism('greeting', 0.9, 'none'), { message: 'hi' })?.subject).toBeNull();
    expect(prismToRouterOutput(prism('concept', 0.9, 'none'), { message: 'x', subjectHint: 'biology' })?.subject).toBe('biology');
  });
  it(`refuses an unsure answer (< ${PRISM_MIN_CONFIDENCE}) or an unknown intent`, () => {
    expect(prismToRouterOutput(prism('numerical', 0.62), { message: 'solve x^2 - 5x + 6 = 0' })).toBeNull();
    expect(prismToRouterOutput(prism('poetry', 0.99), { message: 'x' })).toBeNull();
  });
});

describe('routeFast', () => {
  it('uses Prism when it is sure: no DeepSeek call, one usage row', async () => {
    const { chat, calls } = fakeRouter();
    const r = await routeFast({ message: 'Why is the sky blue?' }, async () => prism('concept', 0.94), { chat });
    expect(r.via).toBe('prism');
    expect(r.output.intent).toBe('concept');
    expect(calls).toEqual([]);
    expect(r.runs).toHaveLength(1);
    expect(r.runs[0].usage?.model).toBe('sarvam-prism');
  });

  it('asks DeepSeek when Prism is unsure, and logs both calls', async () => {
    const { chat, calls } = fakeRouter();
    const r = await routeFast({ message: 'solve x^2 - 5x + 6 = 0' }, async () => prism('numerical', 0.62), { chat });
    expect(r.via).toBe('model');
    expect(calls).toEqual(['router']);
    expect(r.runs.map((x) => x.source)).toEqual(['fallback', 'model']);
    expect(r.runs[0].error).toBe('prism: low confidence');
  });

  it('asks DeepSeek when Prism fails', async () => {
    const { chat, calls } = fakeRouter();
    const r = await routeFast({ message: 'What is pH?' }, async () => { throw new Error('prism HTTP 503'); }, { chat });
    expect(r.via).toBe('model');
    expect(calls).toEqual(['router']);
    expect(r.runs[0].error).toContain('503');
  });

  it('never sends Telugu script to Prism (retrieval needs DeepSeek\'s keywords)', async () => {
    const { chat, calls } = fakeRouter({ intent: 'concept', subject: 'physics', language: 'te', wantsDetail: false, keywords: ['refraction'] });
    const decide = vi.fn<DecideFn>();
    const r = await routeFast({ message: 'కాంతి వక్రీభవనం అంటే ఏమిటి?' }, decide, { chat });
    expect(decide).not.toHaveBeenCalled();
    expect(calls).toEqual(['router']);
    expect(r.output.keywords).toEqual(['refraction']);
  });
});

describe('prismDecide (HTTP)', () => {
  it('posts to /systemone with the model and returns answers, tokens and cost', async () => {
    process.env.SARVAM_API_KEY = 'test-key';
    let seen: { url: string; body: Record<string, unknown> } | null = null;
    const fetchFn = (async (url: string, init: RequestInit) => {
      seen = { url, body: JSON.parse(String(init.body)) };
      return new Response(JSON.stringify({ answers: prism('concept', 0.9).answers, usage: { input_tokens: 500, output_tokens: 0 } }), { status: 200 });
    }) as unknown as typeof fetch;
    const r = await prismDecide(buildPrismRequest({ message: 'hi' }), 1000, fetchFn);
    expect(seen!.url).toBe('https://api.sarvam.ai/v2/systemone');
    expect(seen!.body.model).toBe('sarvam-prism');
    expect(r.inputTokens).toBe(500);
    expect(r.costInr).toBeCloseTo(0.002, 6);
  });
  it('throws on an HTTP error (the router falls back)', async () => {
    process.env.SARVAM_API_KEY = 'test-key';
    const fetchFn = (async () => new Response('{}', { status: 429 })) as unknown as typeof fetch;
    await expect(prismDecide(buildPrismRequest({ message: 'hi' }), 1000, fetchFn)).rejects.toThrow('429');
  });
});

describe('turn graph with Prism', () => {
  const input = (message: string): TurnInput => ({ message, mode: 'tutor', history: [], socratic: { topic: null, hints: 0 } });
  const retrieval: RetrievalOutput = { status: 'grounded', topScore: 1, coverage: 1, terms: [], missingTerms: [], hits: [], keywords: [], keywordSource: 'question', subjectFilter: null, subjectRetried: false };

  it('a greeting routed by Prism gets the fixed reply with no model call at all', async () => {
    const { chat, calls } = fakeRouter();
    const d: TurnDeps = { chat, decide: async () => prism('greeting', 0.92, 'none'), retrieve: async () => retrieval, timeLeft: () => 20_000 };
    const out = await runTurn(input('hi'), d);
    expect(out.agent).toBe('router');
    expect(calls).toEqual([]);
    expect(out.usage).toHaveLength(1);
    expect(out.usage[0]).toMatchObject({ agent: 'router', model: 'sarvam-prism', usedFallback: false });
  });
});
