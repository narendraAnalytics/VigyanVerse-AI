// Live eval for the Maths & Science Reasoning agent (Agent 5): router -> retrieval -> math.
// Cases: NCERT Class 10 in-text examples / exercises (Ch 1, 9, 11) with known answers, plus
// Telugu and Telugu-in-English-letters versions. Answers are checked against the gold value
// by code (no LLM judge needed).
//
// Pass bar (set 2026-11-14 BEFORE the first run):
//   valid JSON >= 95%, final answer correct (value + unit, 2% tolerance / exact coefficients)
//   >= 95%, NO wrong answer shown as checked (verified or corrected) = 0, model agrees with the
//   calculator ("verified") >= 80%, language right >= 95%, short (<= 6 steps, explanation
//   <= 3 sentences) >= 90%, p95 latency <= 10 s.
import type { AgentContext } from '../../src/agents/kit.ts';
import { runMath } from '../../src/agents/math.ts';
import { retrieveContext } from '../../src/agents/retrieval.ts';
import { routeMessage } from '../../src/agents/router.ts';
import { compareNumericAnswer } from '../../src/verify/numeric.ts';
import { adminClient, makeThrottle, mean, pct, percentile, pool } from './common.ts';
import { languageOk } from './tutor.ts';

/** gold: a mathjs quantity ("0.25 A") or balanced coefficients ([3, 4, 1, 4]). */
interface Case { id: string; lang: 'en' | 'te' | 'te_latn'; question: string; gold: string | number[] }

const CASES: Case[] = [
  // Ch 11 Electricity
  { id: 'm01', lang: 'en', question: 'A current of 0.5 A is drawn by a filament of an electric bulb for 10 minutes. Find the amount of electric charge that flows through the circuit.', gold: '300 C' },
  { id: 'm02', lang: 'en', question: 'How much work is done in moving a charge of 2 C across two points having a potential difference 12 V?', gold: '24 J' },
  { id: 'm03', lang: 'en', question: 'An electric lamp of resistance 20 Ω and a conductor of resistance 4 Ω are connected in series to a 6 V battery. Calculate the current through the circuit.', gold: '0.25 A' },
  { id: 'm04', lang: 'en', question: 'An electric iron consumes energy at a rate of 840 W when heating is at the maximum rate and the voltage is 220 V. What is the current?', gold: '3.82 A' },
  { id: 'm05', lang: 'en', question: 'The current through a heater is 4 A when the potential difference is 60 V. What is the resistance of the heater?', gold: '15 ohm' },
  { id: 'm06', lang: 'en', question: 'Resistors of 5 Ω, 10 Ω and 30 Ω are connected in parallel. Find the equivalent resistance.', gold: '3 ohm' },
  { id: 'm07', lang: 'en', question: 'How much electrical energy in kWh does a 1 kW heater use in 3 hours?', gold: '3 kWh' },
  { id: 'm08', lang: 'en', question: 'The resistance of a metal wire of length 1 m is 26 Ω at 20°C. If the diameter of the wire is 0.3 mm, what will be the resistivity of the metal?', gold: '1.84e-6 ohm m' },
  { id: 'm09', lang: 'en', question: 'A 4 Ω resistor and a 6 Ω resistor are connected in series to a 12 V battery. What is the current?', gold: '1.2 A' },
  { id: 'm10', lang: 'en', question: 'An electric iron of resistance 20 Ω takes a current of 5 A. Calculate the heat developed in 30 s.', gold: '15000 J' },
  { id: 'm11', lang: 'en', question: 'What is the resistance of a 1100 W heater that works on 220 V?', gold: '44 ohm' },
  { id: 'm12', lang: 'en', question: 'What is the potential difference across a 5 Ω resistor when a current of 2 A flows through it?', gold: '10 V' },
  // Ch 9 Light
  { id: 'm13', lang: 'en', question: 'Find the power of a concave lens of focal length 2 m.', gold: '-0.5 m^-1' },
  { id: 'm14', lang: 'en', question: 'An object 4.0 cm in size is placed at 25.0 cm in front of a concave mirror of focal length 15.0 cm. At what distance from the mirror is the image formed?', gold: '-37.5 cm' },
  { id: 'm15', lang: 'en', question: 'A convex mirror used for rear-view on an automobile has a radius of curvature of 3.00 m. If a bus is located at 5.00 m from this mirror, find the position of the image.', gold: '1.15 m' },
  { id: 'm16', lang: 'en', question: 'A concave lens has focal length of 15 cm. At what distance should the object from the lens be placed so that it forms an image at 10 cm from the lens?', gold: '-30 cm' },
  { id: 'm17', lang: 'en', question: 'A 2.0 cm tall object is placed perpendicular to the principal axis of a convex lens of focal length 10 cm. The distance of the object from the lens is 15 cm. Find the position of the image.', gold: '30 cm' },
  { id: 'm18', lang: 'en', question: 'A 2.0 cm tall object is placed 15 cm from a convex lens of focal length 10 cm. Find the height of the image.', gold: '-4 cm' },
  { id: 'm19', lang: 'en', question: 'The refractive index of glass is 1.5. Find the speed of light in glass. The speed of light in vacuum is 3 × 10^8 m/s.', gold: '2e8 m/s' },
  { id: 'm20', lang: 'en', question: 'Find the focal length of a convex mirror whose radius of curvature is 32 cm.', gold: '16 cm' },
  // Ch 1 balancing
  { id: 'm21', lang: 'en', question: 'Balance the equation: Fe + H2O → Fe3O4 + H2', gold: [3, 4, 1, 4] },
  { id: 'm22', lang: 'en', question: 'Balance: H2 + Cl2 → HCl', gold: [1, 1, 2] },
  { id: 'm23', lang: 'en', question: 'Balance: BaCl2 + Al2(SO4)3 → BaSO4 + AlCl3', gold: [3, 1, 3, 2] },
  { id: 'm24', lang: 'en', question: 'Balance the chemical equation for sodium reacting with water: Na + H2O → NaOH + H2', gold: [2, 2, 2, 1] },
  { id: 'm25', lang: 'en', question: 'Balance: Pb(NO3)2 → PbO + NO2 + O2', gold: [2, 2, 4, 1] },
  { id: 'm26', lang: 'en', question: 'Write the balanced equation: CH4 + O2 → CO2 + H2O', gold: [1, 2, 1, 2] },
  // Telugu script / Telugu in English letters
  { id: 'm27', lang: 'te', question: '4 Ω నిరోధం గుండా 3 A విద్యుత్ ప్రవహిస్తే పొటెన్షియల్ తేడా ఎంత?', gold: '12 V' },
  { id: 'm28', lang: 'te', question: 'ఈ సమీకరణాన్ని తుల్యం చేయండి: Mg + O2 → MgO', gold: [2, 1, 2] },
  { id: 'm29', lang: 'te_latn', question: '12 V battery ki 6 ohm resistor connect chesthe current entha?', gold: '2 A' },
  { id: 'm30', lang: 'te_latn', question: '2 kW heater 5 gantalu vadithe entha energy kharchu avutundi? kWh lo cheppandi', gold: '10 kWh' },
];

const sentences = (t: string) => t.split(/(?<=[.?!।])\s+/).filter((s) => s.trim().length > 2).length;

function correct(c: Case, answer: string | null, answerValue: string | null): boolean {
  if (!answer) return false;
  if (Array.isArray(c.gold)) {
    const coeffs = answer.split(/→|->/).flatMap((side) => side.split(/\s+\+\s+/)).map((s) => Number(/^\s*(\d*)/.exec(s)?.[1] || 1));
    return coeffs.join() === c.gold.join();
  }
  const value = (answerValue ?? answer.replace(/\s*\(.*$/, '').replace(/^\s*\+\s*/, '')).replace(/\bD\b/, 'm^-1');
  return compareNumericAnswer(value, c.gold).match;
}

export async function evalMath(ctx: AgentContext, opts: { only?: string[] }) {
  const all = CASES.filter((c) => !opts.only || opts.only.includes(c.id));
  const admin = adminClient();
  const throttle = makeThrottle(); // router + math share the default tier (deepseek, 50/min)

  const rows = await pool(all, 2, async (c) => {
    await throttle();
    const route = await routeMessage({ message: c.question });
    const retrieval = await retrieveContext(admin, {
      question: c.question, routerKeywords: route.output.keywords, routerSubject: route.output.subject, routerLanguage: route.output.language,
    });
    await throttle();
    const t0 = Date.now();
    const run = await runMath({ question: c.question, language: route.output.language, passages: retrieval.hits, status: retrieval.status }, ctx);
    const latencyMs = Date.now() - t0;
    const o = run.output;
    const ok = correct(c, o.answer, o.answerValue);
    return {
      c, intent: route.output.intent, o, source: run.source, error: run.error, usage: run.usage, latencyMs,
      checks: {
        valid: run.source === 'model',
        correct: ok,
        wrongShownAsChecked: !ok && (o.check === 'verified' || o.check === 'corrected'),
        verified: o.check === 'verified',
        language: languageOk(c.lang, o.explanation || o.reply),
        short: o.steps.length <= 6 && sentences(o.explanation) <= 3,
      },
    };
  });

  const share = (xs: boolean[]) => (xs.length ? xs.filter(Boolean).length / xs.length : 1);
  const lat = rows.map((r) => r.latencyMs);
  const m = {
    valid: share(rows.map((r) => r.checks.valid)),
    correct: share(rows.map((r) => r.checks.correct)),
    wrongShownAsChecked: rows.filter((r) => r.checks.wrongShownAsChecked).length,
    verified: share(rows.map((r) => r.checks.verified)),
    corrected: rows.filter((r) => r.o.check === 'corrected').length,
    unchecked: rows.filter((r) => r.o.check === 'unchecked').length,
    language: share(rows.map((r) => r.checks.language)),
    short: share(rows.map((r) => r.checks.short)),
    routedNumerical: share(rows.map((r) => r.intent === 'numerical')),
    p50Ms: percentile(lat, 0.5), p95Ms: percentile(lat, 0.95),
    avgIn: Math.round(mean(rows.map((r) => r.usage?.inputTokens ?? 0))),
    avgOut: Math.round(mean(rows.map((r) => r.usage?.outputTokens ?? 0))),
    avgCostInr: mean(rows.map((r) => r.usage?.costInr ?? 0)),
  };
  const bar = {
    valid: m.valid >= 0.95, correct: m.correct >= 0.95, wrongShownAsChecked: m.wrongShownAsChecked === 0,
    verified: m.verified >= 0.8, language: m.language >= 0.95, short: m.short >= 0.9, p95Ms: m.p95Ms <= 10_000,
  };

  console.log(`\nmath  model=${rows.find((r) => r.usage)?.usage?.model ?? '?'}  cases=${rows.length}`);
  console.log(`valid ${pct(m.valid)}  correct ${pct(m.correct)}  wrong shown as checked ${m.wrongShownAsChecked}  | verified ${pct(m.verified)}  corrected ${m.corrected}  unchecked ${m.unchecked}`);
  console.log(`language ${pct(m.language)}  short ${pct(m.short)}  | router said "numerical" ${pct(m.routedNumerical)}`);
  console.log(`latency p50 ${m.p50Ms} ms p95 ${m.p95Ms} ms; tokens in ${m.avgIn} / out ${m.avgOut}; ₹${m.avgCostInr.toFixed(4)} per answer`);
  console.log(`PASS BAR: ${Object.values(bar).every(Boolean) ? 'PASS' : `FAIL ${Object.entries(bar).filter(([, v]) => !v).map(([k]) => k).join(', ')}`}`);

  for (const r of rows) {
    const failed = Object.entries(r.checks).filter(([k, v]) => (k === 'wrongShownAsChecked' ? v : !v) && k !== 'verified').map(([k]) => k);
    if (!failed.length && r.o.check === 'verified') continue;
    console.log(`\n${r.c.id} [${r.c.lang}] check=${r.o.check} intent=${r.intent}${failed.length ? `  FAILED: ${failed.join(', ')}` : ''}${r.source === 'fallback' ? `  [FALLBACK: ${r.error}]` : ''}`);
    console.log(`  Q: ${r.c.question}`);
    console.log(`  gold: ${Array.isArray(r.c.gold) ? r.c.gold.join(', ') : r.c.gold}   answer: ${r.o.answer}   model said: ${r.o.modelAnswer}`);
    if (r.o.check === 'unchecked') console.log(`  work: ${JSON.stringify(r.o.work)}`);
    console.log(`  ${r.o.reply.replace(/\n+/g, ' | ').slice(0, 400)}`);
  }
  return { metrics: m, bar, rows: rows.map((r) => ({ id: r.c.id, lang: r.c.lang, question: r.c.question, gold: r.c.gold, intent: r.intent, output: r.o, source: r.source, checks: r.checks, usage: r.usage, latencyMs: r.latencyMs })) };
}
