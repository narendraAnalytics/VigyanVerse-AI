import { describe, expect, it } from 'vitest';
import { DATA_RULE, type ChatFn } from '../src/agents/kit.ts';
import { askedForAnswer, MAX_HINTS, planTurn, runSocratic, SOCRATIC_MAX_TOKENS, stripAnswerLeaks, stripDefinitions, type SocraticInput } from '../src/agents/socratic.ts';
import { NOT_IN_TEXTBOOK_LABEL } from '../src/agents/tutor.ts';
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
const first: SocraticInput = { topic: 'State Ohm’s law', message: 'State Ohm’s law', language: 'en', passages: P, status: 'grounded', hintsGiven: 0 };
const later = (message: string, hintsGiven = 0): SocraticInput => ({
  ...first, message, hintsGiven,
  history: [{ role: 'student', text: 'State Ohm’s law' }, { role: 'tutor', text: 'What happens to the current when you increase the voltage?' }],
});

function mockChat(content: string | Error) {
  const calls: { task: string; messages: { role: string; content: unknown }[]; overrides?: ChatOverrides }[] = [];
  const chat: ChatFn = async (task, messages, overrides) => {
    calls.push({ task, messages: messages as { role: string; content: unknown }[], overrides });
    if (content instanceof Error) throw content;
    return { content, model: 'mock', usedFallback: false, inputTokens: 900, outputTokens: 60, costInr: 0.02, latencyMs: 700 } satisfies ChatResult;
  };
  return { chat, calls };
}
const reply = (o: object) => JSON.stringify(o);

describe('asking for the answer', () => {
  it.each([
    'just tell me', 'Just tell me the answer', 'give me the answer please', 'what is the correct answer?', 'ok I give up',
    'answer cheppu', 'javabu cheppandi', 'direct ga cheppu', 'సమాధానం చెప్పండి', 'జవాబు చెప్పు', 'నేరుగా చెప్పండి',
  ])('recognises "%s"', (text) => expect(askedForAnswer(text)).toBe(true));

  it.each([
    'I don’t know', 'tell me about the nephron', 'nephron gurinchi cheppandi', 'నెఫ్రాన్ గురించి చెప్పండి', 'naaku teliyadu',
    'Is the answer V = IR?',
  ])('does not treat "%s" as a request for the answer', (text) => expect(askedForAnswer(text)).toBe(false));
});

describe('definitions are removed from questions and hints', () => {
  it.each([
    ['That is okay. A substance breaking down on heating is called thermal decomposition. What happens to limestone when heated?', 'That is okay. What happens to limestone when heated?'],
    ['ఒక పదార్థం విచ్ఛిన్నమై చిన్న పదార్థాలుగా మారడాన్ని విఘటన చర్య అంటారు. FeSO4 ఎలా మారుతుందో చెప్పగలరా?', 'FeSO4 ఎలా మారుతుందో చెప్పగలరా?'],
    ['Heat valla padartham vidipote danni vighatana charya antaru. Limestone ni heat cheste emi avutundi?', 'Limestone ni heat cheste emi avutundi?'],
    ['A reaction where one substance breaks into simpler ones is called a ___ reaction. Can you fill the blank?', 'A reaction where one substance breaks into simpler ones is called a ___ reaction. Can you fill the blank?'],
    ['What do you think happens to the current?', 'What do you think happens to the current?'],
  ])('%s', (input, expected) => expect(stripDefinitions(input)).toBe(expected));

  it('a reveal is the encouragement + the hidden answer, definitions kept', async () => {
    const { chat } = mockChat(reply({ answer: 'Breaking down a compound by heat is called thermal decomposition [1].', studentCorrect: null, kind: 'reveal', reply: 'Well done for trying!', sources: [1], inTextbook: true }));
    expect((await runSocratic(later('just tell me'), { chat })).output.reply).toBe('Well done for trying! Breaking down a compound by heat is called thermal decomposition.');
  });

  it('a hint that is only a definition becomes the textbook-page pointer', async () => {
    expect(stripDefinitions('Heat valla vidipote danni vighatana charya antaru kada.')).toBe('');
    const { chat } = mockChat(reply({ answer: 'x', studentCorrect: null, kind: 'hint', reply: 'దీనినే విఘటన చర్య అంటారు.', sources: [1], inTextbook: true }));
    const run = await runSocratic({ ...later('తెలియదు', 2), language: 'te' }, { chat });
    expect(run.output.reply).toContain('పేజీ 176 చదవండి');
    expect(run.output.hintsGiven).toBe(3);
  });

  it('strips the definition from a model hint', async () => {
    const { chat } = mockChat(reply({ answer: 'x', studentCorrect: null, kind: 'hint', reply: 'This is called Ohm’s law. What happens to I when V doubles?', sources: [1], inTextbook: true }));
    expect((await runSocratic(later('no idea'), { chat })).output.reply).toBe('What happens to I when V doubles?');
  });
});

describe('hints never restate the hidden answer', () => {
  const answer = 'A balanced chemical equation has the same number of atoms of each element on both sides.';
  it('drops a statement that repeats the answer, keeps the nudge and the question', () => {
    expect(stripAnswerLeaks('Remember the law of conservation of mass. So the number of atoms of each element must be equal on both sides. What does that mean for an equation?', answer))
      .toBe('Remember the law of conservation of mass. What does that mean for an equation?');
  });
  it('never cuts a formula in half', () => {
    const gypsum = 'Plaster of Paris is made by heating gypsum at 373 K, so it loses water.';
    expect(stripAnswerLeaks('Gypsum is CaSO4.2H2O. Plaster of Paris is made by heating gypsum at 373 K. What is lost?', gypsum))
      .toBe('Gypsum is CaSO4.2H2O. What is lost?');
    expect(stripDefinitions('Gypsum (CaSO4.2H2O) is called a salt hydrate. What happens to CaSO4.2H2O at 373 K?'))
      .toBe('What happens to CaSO4.2H2O at 373 K?');
  });

  it('keeps questions and fill-in-the-blank sentences even when they share words', () => {
    const hint = 'In a ___ equation, the number of atoms of each element is the same on both sides. Can you fill the blank?';
    expect(stripAnswerLeaks(hint, answer)).toBe(hint);
  });
  it('works for Telugu script (vowel signs stay inside words) and Telugu in English letters', () => {
    const te = 'ఒకే పదార్థం విడిపోయి రెండు కొత్త పదార్థాలుగా మారడం విఘటన చర్య.';
    expect(stripAnswerLeaks(`వేడి గురించి ఆలోచించండి. ఒకే పదార్థం విడిపోయి రెండు కొత్త పదార్థాలుగా మారుతుంది. ఉదాహరణ చెప్పగలరా?`, te))
      .toBe('వేడి గురించి ఆలోచించండి. ఉదాహరణ చెప్పగలరా?');
    const latn = 'White light lo 7 rangulu untayi, prism lo prathi rangu veru veru angle lo bend avutundi.';
    expect(stripAnswerLeaks('Rainbow gurinchi alochinchu. White light lo rangulu untayi, avi veru veru angle lo bend avutayi. Enduku?', latn))
      .toBe('Rainbow gurinchi alochinchu. Enduku?');
  });
  it('a hint that only restates the answer becomes the textbook-page pointer', async () => {
    const { chat } = mockChat(reply({ answer: 'Ohm’s law: the current through a conductor is directly proportional to the potential difference.', studentCorrect: null, kind: 'hint',
      reply: 'The current through a conductor is directly proportional to the potential difference.', sources: [1], inTextbook: true }));
    const run = await runSocratic(later('no idea'), { chat });
    expect(run.output.reply).toContain('page 176');
    expect(run.output.hiddenAnswer).toContain('directly proportional');
  });
});

describe('turn plan (decided by code)', () => {
  it('opens with a question, responds later, reveals when asked or after the hint limit', () => {
    expect(planTurn(first)).toBe('open');
    expect(planTurn(later('Current increases'))).toBe('respond');
    expect(planTurn(later('just tell me the answer'))).toBe('reveal');
    expect(planTurn(later('I still don’t know', MAX_HINTS))).toBe('reveal');
    expect(planTurn({ ...first, message: 'Just tell me the answer: state Ohm’s law' })).toBe('reveal');
  });
});

describe('socratic prompt', () => {
  it('first turn forbids the answer and fences student text', async () => {
    const { chat, calls } = mockChat(reply({ reply: 'What happens to the current if you double the voltage?', kind: 'question', studentCorrect: null, sources: [1], inTextbook: true }));
    await runSocratic({ ...first, language: 'te' }, { chat });
    const system = String(calls[0].messages[0].content);
    const user = String(calls[0].messages[1].content);
    expect(calls[0].task).toBe('socratic');
    expect(system).toContain('Do NOT answer it, not even partly');
    expect(system).toContain('"answer": first write the correct answer');
    expect(system).toContain('The student never sees this field');
    expect(system).toContain('NEVER contains the answer');
    expect(system).toContain(DATA_RULE);
    expect(system).toContain('Write your reply in simple Telugu (Telugu script)');
    expect(user).toContain('[1] Ch 11 Electricity > 11.4 Ohm’s Law (p. 176-177)');
    expect(user).toContain('"""\nState Ohm’s law\n"""');
    expect(user).not.toContain('latest message');
    expect(calls[0].overrides?.maxTokens).toBe(SOCRATIC_MAX_TOKENS);
  });

  it('later turns carry the conversation, the latest message, and the next rung of the hint ladder', async () => {
    const { chat, calls } = mockChat(reply({ reply: 'Think of a tap.', kind: 'hint', studentCorrect: null, sources: [1], inTextbook: true }));
    await runSocratic(later('I don’t know', 1), { chat });
    const system = String(calls[0].messages[0].content);
    const user = String(calls[0].messages[1].content);
    expect(system).toContain('This is hint 2: a stronger clue');
    expect(system).toContain('NEVER contains the answer');
    expect(user).toContain('Tutor: What happens to the current');
    expect(user).toContain('"""\nI don’t know\n"""');
    expect(user).toContain('Hints given so far: 1 of 3.');
  });

  it('tells the model to reveal when the student asks', async () => {
    const { chat, calls } = mockChat(reply({ reply: 'V = IR.', kind: 'reveal', studentCorrect: null, sources: [1], inTextbook: true }));
    await runSocratic(later('answer cheppu'), { chat });
    expect(String(calls[0].messages[0].content)).toContain('the student gets the full answer now');
  });
});

describe('socratic output (deterministic part)', () => {
  it('a first-turn question: no judgement, not done, citation from our passage only', async () => {
    const { chat } = mockChat(reply({ answer: 'V = IR: current is proportional to potential difference.', studentCorrect: false, kind: 'question', reply: 'What happens to the current [1] if you double the voltage?', sources: [1, 8], inTextbook: true }));
    const run = await runSocratic(first, { chat });
    expect(run.source).toBe('model');
    expect(run.output.reply).not.toContain('proportional'); // the hidden answer never reaches the student
    expect(run.output).toMatchObject({ kind: 'question', studentCorrect: null, done: false, hintsGiven: 0, plan: 'open', droppedSources: 1, label: null });
    expect(run.output.reply).toBe('What happens to the current if you double the voltage?');
    expect(run.output.citations.map((c) => c.pageStart)).toEqual([176]);
  });

  it('counts hints, and a correct answer becomes feedback that ends the thread', async () => {
    const hint = await runSocratic(later('no idea', 1), { chat: mockChat(reply({ reply: 'Current ___ when voltage goes up?', kind: 'hint', studentCorrect: null, sources: [1], inTextbook: true })).chat });
    expect(hint.output).toMatchObject({ kind: 'hint', done: false, hintsGiven: 2 });
    const right = await runSocratic(later('Current is proportional to voltage'), { chat: mockChat(reply({ reply: 'Yes! V = IR.', kind: 'hint', studentCorrect: true, sources: [1], inTextbook: true })).chat });
    expect(right.output).toMatchObject({ kind: 'feedback', studentCorrect: true, done: true, hintsGiven: 0 });
  });

  it('"feedback" for a wrong answer is treated as a hint', async () => {
    const { chat } = mockChat(reply({ reply: 'Close, but think again.', kind: 'feedback', studentCorrect: false, sources: [1], inTextbook: true }));
    const run = await runSocratic(later('Current is inversely proportional to voltage'), { chat });
    expect(run.output).toMatchObject({ kind: 'hint', studentCorrect: false, done: false, hintsGiven: 1 });
  });

  it('after the hint limit the turn is a reveal even if the model says otherwise', async () => {
    const { chat } = mockChat(reply({ reply: 'Ohm’s law: V = IR. Well tried!', kind: 'hint', studentCorrect: null, sources: [1], inTextbook: true }));
    const run = await runSocratic(later('still no idea', MAX_HINTS), { chat });
    expect(run.output).toMatchObject({ kind: 'reveal', done: true, plan: 'reveal', hintsGiven: MAX_HINTS });
  });
});

describe('not a textbook topic', () => {
  it('uses the tutor’s labelled short answer in one model call, no guided questions', async () => {
    const { chat, calls } = mockChat(reply({ answer: 'Living things change slowly over many generations.', inTextbook: false, sources: [], relatedPassage: null }));
    const run = await runSocratic({ ...first, topic: 'Explain evolution', message: 'Explain evolution', status: 'none', language: 'te_latn' }, { chat });
    expect(calls).toHaveLength(1);
    expect(calls[0].task).toBe('tutor');
    expect(run.output).toMatchObject({ kind: 'reveal', done: true, inTextbook: false, citations: [], label: NOT_IN_TEXTBOOK_LABEL.te_latn });
  });
});

describe('socratic fallback', () => {
  it('points to the textbook page and asks for the student’s own words when the model fails', async () => {
    const run = await runSocratic(first, { chat: mockChat(new Error('429 Rate limit exceeded')).chat });
    expect(run.source).toBe('fallback');
    expect(run.output).toMatchObject({ kind: 'question', done: false, inTextbook: true });
    expect(run.output.reply).toContain('Chapter 11 (Electricity), "11.4 Ohm’s Law", page 176');
    expect(run.output.citations[0].pageStart).toBe(176);
  });

  it('a failed hint turn still counts as a hint; a failed reveal quotes the book', async () => {
    const hint = await runSocratic({ ...later('naaku teliyadu', 1), language: 'te_latn' }, { chat: mockChat('not json').chat });
    expect(hint.output).toMatchObject({ kind: 'hint', hintsGiven: 2 });
    expect(hint.output.reply).toContain('page 176 chadavandi');
    const reveal = await runSocratic(later('just tell me'), { chat: mockChat(new Error('timeout')).chat });
    expect(reveal.output).toMatchObject({ kind: 'reveal', done: true });
    expect(reveal.output.reply).toContain('Here is what your textbook says:');
  });
});
