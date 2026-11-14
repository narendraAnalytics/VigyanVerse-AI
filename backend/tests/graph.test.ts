import { describe, expect, it } from 'vitest';
import { FIXED_REPLIES, lastQuestion, runTurn, type TurnDeps, type TurnInput } from '../src/agents/graph.ts';
import type { ChatFn } from '../src/agents/kit.ts';
import type { RetrievalInput, RetrievalOutput } from '../src/agents/retrieval.ts';
import type { ChatOverrides, ChatResult } from '../src/shared/llm.ts';
import type { ModelTask } from '../src/shared/models.ts';
import type { ChunkHit } from '../src/shared/retrieval.ts';

const hit: ChunkHit = {
  chunk_id: 'a', chapter_id: 'ch', chapter_number: 11, chapter_title_en: 'Electricity', subject_code: 'physics',
  page_start: 176, page_end: 177, section_path: '11.4 Ohm’s Law', content: 'Ohm’s law: V = IR.', rank: 10,
};
const retrieval = (status: RetrievalOutput['status'] = 'grounded'): RetrievalOutput => ({
  status, topScore: 10, coverage: 1, terms: [], missingTerms: [], hits: [hit], keywords: [], keywordSource: 'question', subjectFilter: null, subjectRetried: false,
});

/** A fake model: a reply per task; records every call. */
function fakeModels(replies: Partial<Record<ModelTask, object>>) {
  const calls: { task: ModelTask; overrides?: ChatOverrides }[] = [];
  const chat: ChatFn = async (task, _messages, overrides) => {
    calls.push({ task, overrides });
    const r = replies[task];
    if (!r) throw new Error(`unexpected call to ${task}`);
    return { content: JSON.stringify(r), model: `mock-${task}`, usedFallback: false, inputTokens: 100, outputTokens: 20, costInr: 0.01, latencyMs: 300 } satisfies ChatResult;
  };
  return { chat, calls };
}
const routed = (intent: string, language = 'en', extra: object = {}) => ({ intent, subject: 'physics', language, wantsDetail: false, keywords: ['ohm', 'law'], ...extra });

function deps(chat: ChatFn, status: RetrievalOutput['status'] = 'grounded') {
  const searches: RetrievalInput[] = [];
  const d: TurnDeps = { chat, retrieve: async (i) => (searches.push(i), retrieval(status)), timeLeft: () => 20_000 };
  return { d, searches };
}
const input = (message: string, extra: Partial<TurnInput> = {}): TurnInput => ({ message, mode: 'tutor', history: [], socratic: { topic: null, hints: 0 }, ...extra });

describe('turn graph routing', () => {
  it('concept -> retrieval -> tutor, with citations and usage rows', async () => {
    const { chat, calls } = fakeModels({ router: routed('concept'), tutor: { answer: 'Current is proportional to voltage.', inTextbook: true, sources: [1], relatedPassage: null } });
    const { d, searches } = deps(chat);
    const out = await runTurn(input('State Ohm’s law'), d);
    expect(out).toMatchObject({ agent: 'tutor', reply: 'Current is proportional to voltage.', intent: 'concept', label: null });
    expect(out.citations[0].pageStart).toBe(176);
    expect(calls.map((c) => c.task)).toEqual(['router', 'tutor']);
    expect(calls.every((c) => c.overrides?.budgetMs === 20_000)).toBe(true); // every call gets the turn's time left
    expect(out.usage.map((u) => u.agent)).toEqual(['router', 'tutor']);
    expect(searches[0].question).toBe('State Ohm’s law');
  });

  it('numerical -> math (checked by code)', async () => {
    const { chat } = fakeModels({
      router: routed('numerical'),
      math: { type: 'numeric', given: { V: '12 V', R: '4 ohm' }, find: 'I', formula: 'I = V / R', expression: 'V / R', unit: 'A', steps: [], answer: '3 A', explanation: 'Ohm’s law.' },
    });
    const out = await runTurn(input('12 V across 4 ohm: current?'), deps(chat).d);
    expect(out).toMatchObject({ agent: 'math', meta: { check: 'verified', answer: '3 A' } });
  });

  it.each(['greeting', 'off_topic', 'unsafe', 'quiz'] as const)('%s gets a fixed reply: no retrieval, no answer model', async (intent) => {
    const { chat, calls } = fakeModels({ router: routed(intent, 'te_latn') });
    const { d, searches } = deps(chat);
    const out = await runTurn(input('...'), d);
    expect(out).toMatchObject({ agent: 'router', reply: FIXED_REPLIES[intent].te_latn });
    expect(calls).toHaveLength(1);
    expect(searches).toHaveLength(0);
  });

  it('the unsafe reply gives the Tele-MANAS helpline in every language', () => {
    for (const text of Object.values(FIXED_REPLIES.unsafe)) expect(text).toContain('14416');
  });

  it('a follow-up searches with the previous question too', async () => {
    const { chat } = fakeModels({ router: routed('follow_up'), tutor: { answer: 'A pencil in water looks bent.', inTextbook: true, sources: [1], relatedPassage: null } });
    const { d, searches } = deps(chat);
    await runTurn(input('give an example', { history: [{ role: 'student', text: 'What is refraction?' }, { role: 'tutor', text: 'Bending of light.' }] }), d);
    expect(searches[0].question).toBe('What is refraction? give an example');
  });
});

describe('context from earlier turns', () => {
  it('the router never gets a message that had a fixed reply (e.g. unsafe) as context', () => {
    const history = [
      { role: 'student' as const, text: 'Why do stars twinkle?' }, { role: 'tutor' as const, text: 'What do you notice…?' },
      { role: 'student' as const, text: 'I want to hurt myself' }, { role: 'tutor' as const, text: FIXED_REPLIES.unsafe.en },
    ];
    expect(lastQuestion(history)).toBe('Why do stars twinkle?');
    expect(lastQuestion([])).toBeUndefined();
  });

  it('the tutor is told what a follow-up is about', async () => {
    const { chat } = fakeModels({ router: routed('follow_up'), tutor: { answer: 'A pencil in water looks bent.', inTextbook: true, sources: [1], relatedPassage: null } });
    const calls: string[] = [];
    const spy: ChatFn = async (task, messages, o) => (calls.push(String(messages.at(-1)?.content)), chat(task, messages, o));
    await runTurn(input('give an example', { history: [{ role: 'student', text: 'What is refraction?' }, { role: 'tutor', text: 'Bending of light.' }] }), deps(spy).d);
    expect(calls[1]).toContain('give an example (about: What is refraction?)');
  });
});

describe('Socratic threads', () => {
  it('Socratic mode opens a thread on a new question', async () => {
    const { chat } = fakeModels({ router: routed('concept'), socratic: { answer: 'V = IR', studentCorrect: null, kind: 'question', reply: 'What happens to the current if you double the voltage?', sources: [1], inTextbook: true } });
    const out = await runTurn(input('State Ohm’s law', { mode: 'socratic' }), deps(chat).d);
    expect(out).toMatchObject({ agent: 'socratic', socratic: { topic: 'State Ohm’s law', hints: 0 }, meta: { kind: 'question', done: false } });
    expect(JSON.stringify(out)).not.toContain('hiddenAnswer');
  });

  it('an open thread keeps going (searching for its topic), counts hints, and closes when answered', async () => {
    const open = { topic: 'State Ohm’s law', hints: 1 };
    const hint = fakeModels({ router: routed('concept'), socratic: { answer: 'V = IR', studentCorrect: null, kind: 'hint', reply: 'Think of a water pipe: what pushes the water?', sources: [1], inTextbook: true } });
    const h = deps(hint.chat);
    const out1 = await runTurn(input('I don’t know', { mode: 'socratic', socratic: open, history: [{ role: 'student', text: 'State Ohm’s law' }, { role: 'tutor', text: 'What happens…?' }] }), h.d);
    expect(out1.socratic).toEqual({ topic: 'State Ohm’s law', hints: 2 });
    expect(h.searches[0].question).toBe('State Ohm’s law');
    const done = fakeModels({ router: routed('concept'), socratic: { answer: 'V = IR', studentCorrect: true, kind: 'feedback', reply: 'Yes! V = IR.', sources: [1], inTextbook: true } });
    const thread = [{ role: 'student' as const, text: 'State Ohm’s law' }, { role: 'tutor' as const, text: 'What happens…?' }];
    const out2 = await runTurn(input('current is proportional to voltage', { mode: 'socratic', socratic: open, history: thread }), deps(done.chat).d);
    expect(out2).toMatchObject({ socratic: { topic: null, hints: 0 }, meta: { done: true } });
  });

  it('an unsafe message inside a thread gets the fixed reply and keeps the thread open', async () => {
    const { chat } = fakeModels({ router: routed('unsafe') });
    const open = { topic: 'State Ohm’s law', hints: 2 };
    const out = await runTurn(input('...', { mode: 'socratic', socratic: open }), deps(chat).d);
    expect(out).toMatchObject({ agent: 'router', socratic: open });
  });

  it('a numerical in Socratic mode (no open thread) goes to the math agent', async () => {
    const { chat } = fakeModels({ router: routed('numerical'), math: { type: 'explain', explanation: 'Use P = VI.' } });
    const out = await runTurn(input('power of 2 A at 5 V?', { mode: 'socratic' }), deps(chat).d);
    expect(out.agent).toBe('math');
  });
});

describe('failures', () => {
  it('a dead model still gives an answer (router + tutor fallbacks) and logs the errors', async () => {
    const chat: ChatFn = async () => { throw new Error('402 No credits available'); };
    const out = await runTurn(input('State Ohm’s law'), deps(chat).d);
    expect(out.agent).toBe('tutor');
    expect(out.reply).toContain('Here is what your textbook says');
    expect(out.usage.map((u) => [u.agent, u.usedFallback, u.error?.includes('402')])).toEqual([['router', true, true], ['tutor', true, true]]);
  });
});
