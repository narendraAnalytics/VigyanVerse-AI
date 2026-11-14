import { describe, expect, it } from 'vitest';
import { DATA_RULE, type ChatFn } from '../src/agents/kit.ts';
import { equationIn, runMath, type MathInput } from '../src/agents/math.ts';
import type { ChatOverrides, ChatResult } from '../src/shared/llm.ts';
import type { ChunkHit } from '../src/shared/retrieval.ts';

const P: ChunkHit[] = [{
  chunk_id: 'a', chapter_id: 'ch', chapter_number: 11, chapter_title_en: 'Electricity', subject_code: 'physics',
  page_start: 176, page_end: 177, section_path: '11.4 Ohm’s Law', content: 'V = IR. Ohm’s law.', rank: 10,
}];
const base: MathInput = { question: 'A 4 Ω resistor is connected to a 12 V battery. Find the current.', language: 'en', passages: P, status: 'grounded' };

function mockChat(content: string | Error) {
  const calls: { task: string; messages: { role: string; content: unknown }[]; overrides?: ChatOverrides }[] = [];
  const chat: ChatFn = async (task, messages, overrides) => {
    calls.push({ task, messages: messages as { role: string; content: unknown }[], overrides });
    if (content instanceof Error) throw content;
    return { content, model: 'mock', usedFallback: false, inputTokens: 800, outputTokens: 150, costInr: 0.02, latencyMs: 900 } satisfies ChatResult;
  };
  return { chat, calls };
}
const reply = (o: object) => JSON.stringify(o);
const ohm = { type: 'numeric', given: { V: '12 V', R: '4 ohm' }, find: 'I', formula: 'I = V / R', expression: 'V / R', unit: 'A',
  steps: ['I = V / R', 'I = 12 V / 4 ohm', 'I = 3 A'], explanation: 'Use Ohm’s law: current = voltage ÷ resistance.', sources: [1] };

describe('math prompt', () => {
  it('asks for givens, an expression and the sign convention; fences the question', async () => {
    const { chat, calls } = mockChat(reply({ ...ohm, answer: '3 A' }));
    await runMath({ ...base, language: 'te' }, { chat });
    const system = String(calls[0].messages[0].content);
    expect(calls[0].task).toBe('math');
    expect(system).toContain('"expression"');
    expect(system).toContain('NCERT sign convention');
    expect(system).toContain(DATA_RULE);
    expect(system).toContain('Telugu script');
    expect(String(calls[0].messages[1].content)).toContain('"""\nA 4 Ω resistor');
  });
});

describe('numericals are checked by code', () => {
  it('verified: the model and the calculator agree', async () => {
    const run = await runMath(base, { chat: mockChat(reply({ ...ohm, answer: '3 A' })).chat });
    expect(run.output).toMatchObject({ type: 'numeric', answer: '3 A', answerValue: '3 A', check: 'verified' });
    expect(run.output.steps).toEqual(['I = V / R', 'I = 12 V / 4 Ω', 'I = 3 A']);
    expect(run.output.reply).toBe('Use Ohm’s law: current = voltage ÷ resistance.\n\nI = V / R\nI = 12 V / 4 Ω\nI = 3 A\n\nAnswer: 3 A');
    expect(run.output.citations[0].pageStart).toBe(176);
  });

  it('corrected: a wrong model answer is never shown; code rebuilds the steps', async () => {
    const run = await runMath(base, { chat: mockChat(reply({ ...ohm, steps: ['I = V / R', 'I = 12 / 4', 'I = 4 A'], answer: '4 A' })).chat });
    expect(run.output.check).toBe('corrected');
    expect(run.output.answer).toBe('3 A');
    expect(run.output.steps).toEqual(['I = V / R', 'I = (12 V) / (4 Ω)', 'I = 3 A']);
    expect(run.output.reply).not.toContain('4 A');
  });

  it('mirror formula with signs; lens power shown in dioptre', async () => {
    const mirror = await runMath(base, { chat: mockChat(reply({ type: 'numeric', given: { f: '-15 cm', u: '-25 cm' }, find: 'v', formula: '1/v + 1/u = 1/f',
      expression: '1 / (1/f - 1/u)', unit: 'cm', steps: [], answer: '-37.5 cm', explanation: 'Mirror formula.' })).chat });
    expect(mirror.output).toMatchObject({ answer: '-37.5 cm', check: 'verified' });
    const lens = await runMath(base, { chat: mockChat(reply({ type: 'numeric', given: { f: '-2 m' }, find: 'P', formula: 'P = 1/f',
      expression: '1 / f', unit: 'D', steps: [], answer: '-0.5 D', explanation: 'Power is 1/f in metres.' })).chat });
    expect(lens.output).toMatchObject({ answer: '-0.5 D', check: 'verified' });
  });

  it('a wrong expression does not "correct" a right answer: the formula breaks the tie', async () => {
    // Live eval run 1, m01: the expression converted minutes twice; formula and model agree.
    const run = await runMath(base, { chat: mockChat(reply({ type: 'numeric', given: { I: '0.5 A', t: '10 minute' }, find: 'Q', formula: 'Q = I * t',
      expression: 'I * t * 60', unit: 'C', steps: ['Q = I × t', 'Q = 0.5 A × 600 s', 'Q = 300 C'], answer: '300 C', explanation: 'Charge = current × time.' })).chat });
    expect(run.output).toMatchObject({ answer: '300 C', check: 'verified' });
  });

  it('a chained formula still breaks the tie (eval run 3, m08: "d/1000" converted mm twice)', async () => {
    const run = await runMath(base, { chat: mockChat(reply({ type: 'numeric', given: { R: '26 ohm', l: '1 m', d: '0.3 mm' }, find: 'rho',
      formula: 'rho = R*A/l = R*pi*d^2/(4*l)', expression: 'R*pi*(d/1000)^2/(4*l)', unit: 'ohm m', steps: [], answer: '1.84e-6 ohm m', explanation: 'Resistivity.' })).chat });
    expect(run.output).toMatchObject({ answer: '1.84e-6 Ω m', check: 'verified' });
  });

  it('unchecked: when nothing agrees, the answer is labelled, not trusted', async () => {
    const run = await runMath(base, { chat: mockChat(reply({ ...ohm, formula: 'V = IR', expression: 'V / Q', answer: '3 A' })).chat });
    expect(run.output.check).toBe('unchecked');
    expect(run.output.reply).toContain('Answer: 3 A (not checked by the calculator)');
  });

  it('reads answers written as "1.84 × 10^-6 Ω m"', async () => {
    const run = await runMath(base, { chat: mockChat(reply({ type: 'numeric', given: { R: '26 Ω', d: '0.3 mm', l: '1 m' }, find: 'rho', formula: 'rho = R * A / l',
      expression: 'R * pi * (d/2)^2 / l', unit: 'ohm m', steps: [], answer: '1.84 × 10^-6 Ω m', explanation: 'Resistivity.' })).chat });
    expect(run.output).toMatchObject({ answer: '1.84e-6 Ω m', check: 'verified', modelAnswer: '1.84 × 10^-6 Ω m' });
  });

  it('refuses expressions that try to change the calculator', async () => {
    const run = await runMath(base, { chat: mockChat(reply({ ...ohm, formula: '', expression: 'import({V: 1})', answer: '3 A' })).chat });
    expect(run.output.check).toBe('unchecked');
  });
});

describe('balancing is checked by code', () => {
  const eq = { type: 'balance', equation: 'Fe + H2O -> Fe3O4 + H2', steps: ['Count atoms on both sides', 'Balance O, then H, then Fe'], explanation: 'Atoms are conserved.' };
  it('verified when the model balanced it right', async () => {
    const run = await runMath(base, { chat: mockChat(reply({ ...eq, balanced: '3Fe + 4H2O -> Fe3O4 + 4H2', answer: '' })).chat });
    expect(run.output).toMatchObject({ type: 'balance', check: 'verified', answer: '3Fe + 4H2O → Fe3O4 + 4H2' });
  });
  it('corrected when the model got it wrong', async () => {
    const run = await runMath(base, { chat: mockChat(reply({ ...eq, balanced: '3Fe + 3H2O -> Fe3O4 + 3H2', answer: '' })).chat });
    expect(run.output).toMatchObject({ check: 'corrected', answer: '3Fe + 4H2O → Fe3O4 + 4H2' });
    expect(run.output.steps).toEqual(['Fe + H2O → Fe3O4 + H2', '3Fe + 4H2O → Fe3O4 + 4H2']);
  });
});

describe('math fallback', () => {
  it('balances a typed equation with code when the model is down', async () => {
    expect(equationIn('Balance: Na + H2O → NaOH + H2')).toBe('Na + H2O → NaOH + H2');
    const run = await runMath({ ...base, question: 'Balance: Na + H2O → NaOH + H2' }, { chat: mockChat(new Error('429')).chat });
    expect(run.source).toBe('fallback');
    expect(run.output).toMatchObject({ answer: '2Na + 2H2O → 2NaOH + H2', check: 'verified' });
  });
  it('otherwise quotes the textbook and invents no number', async () => {
    const run = await runMath(base, { chat: mockChat('not json').chat });
    expect(run.output).toMatchObject({ type: 'explain', answer: null, check: 'none' });
    expect(run.output.reply).toContain('Here is what your textbook says');
  });
});
