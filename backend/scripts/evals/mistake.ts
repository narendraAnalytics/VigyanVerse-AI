// Live check for the Mistake Classification agent (4d). SMALL on purpose (owner 2026-11-14:
// minimum tokens now; full testing with the frontend): 2 GLM calls (5 English + 3 Telugu wrong
// answers), through evaluateSubmission so code grading + the agent are tested together.
// Grading is code; here we check the WORDS and the TYPE the model adds.
//
// Pass bar (set 2026-11-14 BEFORE the first run):
//   both calls valid (source = model); error type is one of the allowed types 100%;
//   feedback present, <= 3 sentences and <= 350 chars >= 95%; feedback language right >= 95%;
//   feedback never says the student's wrong answer is right (code check) 100%;
//   type within the accepted set of my labels >= 70% (types overlap, so labels accept 1-2);
//   every grade equals the code grade (no case may become correct) 100%; p95 latency <= 8 s.
// The feedback is also read by hand (printed) for factual agreement with the key.
import type { AgentContext } from '../../src/agents/kit.ts';
import { evaluateSubmission, type EvalQuestion, type SubmittedAnswer } from '../../src/agents/evaluate.ts';
import { ERROR_TYPES, type ErrorType } from '../../src/agents/mistake.ts';
import type { Language } from '../../src/agents/tutor.ts';
import { makeThrottle, pct, percentile } from './common.ts';
import { languageOk } from './tutor.ts';

interface Case { id: string; q: EvalQuestion; a: SubmittedAnswer; accept: ErrorType[] }

const mcq = (id: string, stem: string, options: string[], answerIndex: number, explanation: string): EvalQuestion =>
  ({ id, position: 1, marks: 1, type: 'mcq', stem, options, key: { answerIndex, answer: options[answerIndex], explanation, work: null } });
const num = (id: string, stem: string, answer: string, expression: string, explanation: string): EvalQuestion =>
  ({ id, position: 1, marks: 1, type: 'numeric', stem, options: null, key: { answerIndex: null, answer, explanation, work: { expression } } });

const EN: Case[] = [
  { id: 'e1', q: mcq('e1', 'If the length of a wire is doubled (same material, same thickness), its resistance:', ['becomes half', 'becomes double', 'stays the same', 'becomes four times'], 1, 'Resistance is directly proportional to length, so doubling the length doubles the resistance.'), a: { questionId: 'e1', selectedIndex: 0 }, accept: ['conceptual', 'terminology'] },
  { id: 'e2', q: num('e2', 'A bulb of power 60 W works on 220 V. Find the current through it.', '0.273 A', 'P/V', 'Power P = V x I, so I = P / V = 60 / 220 = 0.27 A.'), a: { questionId: 'e2', answerText: '13200 A' }, accept: ['formula_selection'] },
  { id: 'e3', q: num('e3', 'A 12 V battery drives a current through a 4 ohm resistor. Find the current.', '3 A', 'V/R', "By Ohm's law I = V / R = 12 / 4 = 3 A."), a: { questionId: 'e3', answerText: '0.3 A' }, accept: ['calculation'] },
  { id: 'e4', q: mcq('e4', 'The process by which green plants make food using sunlight is called:', ['respiration', 'photosynthesis', 'transpiration', 'digestion'], 1, 'Plants make glucose from carbon dioxide and water using sunlight; this is photosynthesis.'), a: { questionId: 'e4', selectedIndex: 0 }, accept: ['conceptual', 'terminology'] },
  { id: 'e5', q: mcq('e5', 'Which of these is NOT a good conductor of electricity?', ['copper', 'silver', 'rubber', 'aluminium'], 2, 'Metals such as copper, silver and aluminium conduct well; rubber is an insulator.'), a: { questionId: 'e5', selectedIndex: 0 }, accept: ['interpretation'] },
];

const TE: Case[] = [
  { id: 't1', q: mcq('t1', 'కిరణజన్య సంయోగక్రియలో మొక్కలు ఏ వాయువును గ్రహిస్తాయి?', ['ఆక్సిజన్', 'కార్బన్ డయాక్సైడ్', 'నైట్రోజన్', 'హైడ్రోజన్'], 1, 'కిరణజన్య సంయోగక్రియలో మొక్కలు కార్బన్ డయాక్సైడ్ మరియు నీటిని ఉపయోగించి ఆహారాన్ని తయారు చేస్తాయి.'), a: { questionId: 't1', selectedIndex: 0 }, accept: ['conceptual', 'terminology'] },
  { id: 't2', q: num('t2', '6 V బ్యాటరీకి 2 ఓమ్ నిరోధకం కలిపారు. దాని ద్వారా ప్రవహించే విద్యుత్ ప్రవాహాన్ని కనుగొనండి.', '3 A', 'V/R', 'ఓమ్ నియమం ప్రకారం I = V / R = 6 / 2 = 3 A.'), a: { questionId: 't2', answerText: '12 A' }, accept: ['formula_selection'] },
  { id: 't3', q: mcq('t3', 'కింది వాటిలో ఆమ్ల స్వభావం లేనిది ఏది?', ['నిమ్మరసం', 'వెనిగర్', 'సబ్బు నీరు', 'టమోటా రసం'], 2, 'సబ్బు నీరు క్షార స్వభావం కలిగి ఉంటుంది; నిమ్మరసం, వెనిగర్, టమోటా రసం ఆమ్లాలు.'), a: { questionId: 't3', selectedIndex: 0 }, accept: ['interpretation', 'conceptual'] },
];

const sentences = (t: string) => t.split(/(?<=[.?!।])\s+|\n+/).map((s) => s.trim()).filter((s) => s.length > 2).length;
const SAYS_RIGHT = /(your|the student'?s?) answer is (correct|right)|you are (correct|right)|well done|మీ సమాధానం సరైనది/i;

export async function evalMistake(ctx: AgentContext, opts: { only?: string[] }) {
  const throttle = makeThrottle();
  const groups: { lang: Language; cases: Case[] }[] = [{ lang: 'en', cases: EN }, { lang: 'te', cases: TE }];
  const out = [];
  for (const g of groups) {
    const cases = g.cases.filter((c) => !opts.only || opts.only.includes(c.id));
    if (!cases.length) continue;
    // Each case is its own question in one submission (positions 1..n).
    const questions = cases.map((c, i) => ({ ...c.q, position: i + 1 }));
    await throttle();
    const t0 = Date.now();
    const ev = await evaluateSubmission(questions, cases.map((c) => c.a), g.lang, { ctx });
    out.push({ lang: g.lang, cases, ev, latencyMs: Date.now() - t0 });
    process.stdout.write('.');
  }
  process.stdout.write('\n');

  const rows = out.flatMap((o) => o.ev.results.map((r, i) => ({ lang: o.lang, c: o.cases[i], r })));
  const n = rows.length || 1;
  const m = {
    valid: out.every((o) => o.ev.usage.length > 0 && !o.ev.usage[0].usedFallback),
    typeAllowed: rows.filter(({ r }) => r.errorType !== null && ERROR_TYPES.includes(r.errorType)).length / n,
    feedbackOk: rows.filter(({ r }) => r.feedback.length > 0 && r.feedback.length <= 350 && sentences(r.feedback) <= 3).length / n,
    language: rows.filter(({ lang, r }) => languageOk(lang, r.feedback)).length / n,
    neverSaysRight: rows.filter(({ r }) => !SAYS_RIGHT.test(r.feedback)).length / n,
    typeAccepted: rows.filter(({ c, r }) => r.errorType !== null && c.accept.includes(r.errorType)).length / n,
    gradesUnchanged: rows.filter(({ r }) => !r.isCorrect && r.marksAwarded === 0).length / n,
    p95Ms: percentile(out.map((o) => o.latencyMs), 0.95),
    costInr: out.reduce((s, o) => s + o.ev.usage.reduce((a, u) => a + (u.costInr ?? 0), 0), 0),
  };
  const bar = {
    valid: m.valid, typeAllowed: m.typeAllowed === 1, feedbackOk: m.feedbackOk >= 0.95, language: m.language >= 0.95,
    neverSaysRight: m.neverSaysRight === 1, typeAccepted: m.typeAccepted >= 0.7, gradesUnchanged: m.gradesUnchanged === 1, p95Ms: m.p95Ms <= 8_000,
  };

  console.log(`\nmistake  wrong answers=${rows.length}`);
  console.log(`valid ${m.valid}  type allowed ${pct(m.typeAllowed)}  feedback ok ${pct(m.feedbackOk)}  language ${pct(m.language)}  never says right ${pct(m.neverSaysRight)}  type accepted ${pct(m.typeAccepted)}  grades unchanged ${pct(m.gradesUnchanged)}`);
  console.log(`latency p95 ${m.p95Ms} ms; total ₹${m.costInr.toFixed(4)}`);
  console.log(`PASS BAR: ${Object.values(bar).every(Boolean) ? 'PASS' : `FAIL ${Object.entries(bar).filter(([, v]) => !v).map(([k]) => k).join(', ')}`}`);
  for (const { lang, c, r } of rows) {
    console.log(`\n${c.id} [${lang}] type=${r.errorType} (accepted: ${c.accept.join('/')})${r.errorType && c.accept.includes(r.errorType) ? ' ✔' : ' ✘'}`);
    console.log(`   Q: ${c.q.stem}\n   student: ${c.a.answerText ?? `${'ABCD'[c.a.selectedIndex!]}) ${c.q.options![c.a.selectedIndex!]}`}   key: ${r.correctAnswer}\n   feedback: ${r.feedback}`);
  }
  return { metrics: m, bar, rows: rows.map(({ lang, c, r }) => ({ id: c.id, lang, accept: c.accept, errorType: r.errorType, feedback: r.feedback, isCorrect: r.isCorrect })), usage: out.map((o) => o.ev.usage) };
}
