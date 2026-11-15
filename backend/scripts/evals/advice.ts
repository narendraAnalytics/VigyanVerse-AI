// Live check for the Learning Intelligence advice agent (5d). SMALL on purpose (owner 2026-11-14:
// minimum tokens now; full testing with the frontend): 6 GLM calls (4 English, 2 Telugu) on made-up
// next_activity results, one per activity kind.
//
// Pass bar (set 2026-11-15 BEFORE the first run):
//   model message accepted by the code checks (source = model, no fallback) >= 5 of 6;
//   EVERY final message (model or template) names the chapter title, <= 3 sentences, right language: 100%;
//   no invented numbers or promises in a model message: 100% (the checks reject them, so a failure
//   shows up as a fallback, counted above); p95 latency <= 6 s; total cost <= Rs 0.05.
// The messages are also read by hand (printed).
import type { AgentContext } from '../../src/agents/kit.ts';
import { adviceProblem, runAdvice, type AdviceLanguage, type NextActivity } from '../../src/agents/advice.ts';
import { makeThrottle, percentile } from './common.ts';

const base = { chapter_id: '11111111-1111-4111-8111-111111111111', due_at: null, due_count: 0, top_errors: [] as NextActivity['top_errors'] };
const CASES: { id: string; lang: AdviceLanguage; a: NextActivity }[] = [
  { id: 'a1', lang: 'en', a: { ...base, kind: 'revise_due', chapter_title: 'Electricity', state: 'learning', score: 40, due_count: 1, top_errors: [{ error_type: 'calculation', count: 3 }] } },
  { id: 'a2', lang: 'en', a: { ...base, kind: 'practise_weakest', chapter_title: 'Acids, Bases and Salts', state: 'developing', score: 58, top_errors: [{ error_type: 'terminology', count: 2 }] } },
  { id: 'a3', lang: 'en', a: { ...base, kind: 'start_new', chapter_title: 'Life Processes', state: 'not_started', score: 0 } },
  { id: 'a4', lang: 'en', a: { ...base, kind: 'keep_going', chapter_title: 'Magnetic Effects of Electric Current', state: 'proficient', score: 78 } },
  { id: 't1', lang: 'te', a: { ...base, kind: 'revise_due', chapter_title: 'Light - Reflection and Refraction', state: 'developing', score: 61, due_count: 2, top_errors: [{ error_type: 'conceptual', count: 4 }] } },
  { id: 't2', lang: 'te', a: { ...base, kind: 'practise_weakest', chapter_title: 'Chemical Reactions and Equations', state: 'learning', score: 35, top_errors: [{ error_type: 'formula_selection', count: 2 }] } },
];
const sentences = (t: string) => t.split(/(?<=[.?!।])\s+|\n+/).map((s) => s.trim()).filter((s) => s.length > 2).length;

export async function evalAdvice(ctx: AgentContext, opts: { only?: string[] }) {
  const throttle = makeThrottle();
  const cases = CASES.filter((c) => !opts.only || opts.only.includes(c.id));
  const rows = [];
  for (const c of cases) {
    await throttle();
    const t0 = Date.now();
    const run = await runAdvice({ activity: c.a, language: c.lang }, ctx);
    rows.push({ c, run, ms: Date.now() - t0 });
    process.stdout.write('.');
  }
  process.stdout.write('\n');
  const n = rows.length || 1;
  const m = {
    modelAccepted: rows.filter((r) => r.run.source === 'model').length,
    finalOk: rows.filter((r) => adviceProblem(r.run.output.message, r.c.a, r.c.lang) === null && sentences(r.run.output.message) <= 3).length / n,
    p95Ms: percentile(rows.map((r) => r.ms), 0.95),
    costInr: rows.reduce((s, r) => s + (r.run.usage?.costInr ?? 0), 0),
  };
  const need = Math.ceil(n * 5 / 6);
  const bar = { modelAccepted: m.modelAccepted >= need, finalOk: m.finalOk === 1, p95Ms: m.p95Ms <= 6_000, cost: m.costInr <= 0.05 };
  console.log(`\nadvice  cases=${rows.length}  model accepted ${m.modelAccepted}/${n}  final ok ${(m.finalOk * 100).toFixed(0)}%  p95 ${m.p95Ms} ms  total ₹${m.costInr.toFixed(4)}`);
  console.log(`PASS BAR: ${Object.values(bar).every(Boolean) ? 'PASS' : `FAIL ${Object.entries(bar).filter(([, v]) => !v).map(([k]) => k).join(', ')}`}`);
  for (const { c, run } of rows) console.log(`\n${c.id} [${c.lang}] ${c.a.kind} source=${run.source}${run.error ? ` (${run.error})` : ''}\n   ${run.output.message}`);
  return { metrics: m, bar, rows: rows.map(({ c, run }) => ({ id: c.id, source: run.source, error: run.error, message: run.output.message })) };
}
