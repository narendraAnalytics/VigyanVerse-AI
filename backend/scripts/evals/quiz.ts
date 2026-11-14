// Live check for the Quiz Generation agent (4a). SMALL on purpose (owner 2026-11-14: minimum
// Sarvam tokens now; full testing with the frontend): 3 generation calls, no judge model.
// Whether questions are right / unambiguous is the Assessment Validation agent's job (4b).
//
// Pass bar (set 2026-11-14 BEFORE the first run):
//   valid JSON 3/3 calls; >= 80% of generated questions pass the code gates; accepted
//   questions >= 80% of those requested; language right on accepted questions >= 95%;
//   MCQ keys in >= 2 different positions; p95 latency <= 20 s.
import type { AgentContext } from '../../src/agents/kit.ts';
import { runQuiz, type QuestionType } from '../../src/agents/quiz.ts';
import { retrieveContext } from '../../src/agents/retrieval.ts';
import type { Language } from '../../src/agents/tutor.ts';
import { adminClient, makeThrottle, pct, percentile } from './common.ts';
import { languageOk } from './tutor.ts';

interface Case { id: string; topic: string; subject: 'physics' | 'chemistry' | 'biology'; language: Language; count: number; types: QuestionType[] }

const CASES: Case[] = [
  { id: 'q1', topic: "Ohm's law resistance of a conductor resistors in series and parallel", subject: 'physics', language: 'en', count: 4, types: ['mcq', 'numeric'] },
  { id: 'q2', topic: 'photosynthesis autotrophic nutrition chlorophyll stomata', subject: 'biology', language: 'en', count: 3, types: ['mcq'] },
  { id: 'q3', topic: 'combination decomposition displacement reaction types of chemical reactions', subject: 'chemistry', language: 'te', count: 3, types: ['mcq'] },
];

export async function evalQuiz(ctx: AgentContext, opts: { only?: string[] }) {
  const cases = CASES.filter((c) => !opts.only || opts.only.includes(c.id));
  const admin = adminClient();
  const throttle = makeThrottle();
  const rows = [];
  for (const c of cases) {
    const retrieval = await retrieveContext(admin, { question: c.topic, screenSubject: c.subject });
    await throttle();
    const t0 = Date.now();
    const run = await runQuiz({ passages: retrieval.hits, count: c.count, language: c.language, assessmentScope: 'summative', types: c.types }, ctx);
    rows.push({ c, run, latencyMs: Date.now() - t0, generated: run.output.questions.length + run.output.rejected.length });
    process.stdout.write('.');
  }
  process.stdout.write('\n');

  const questions = rows.flatMap((r) => r.run.output.questions.map((q) => ({ q, lang: r.c.language })));
  const generated = rows.reduce((n, r) => n + r.generated, 0);
  const requested = rows.reduce((n, r) => n + r.c.count, 0);
  const lat = rows.map((r) => r.latencyMs);
  const m = {
    valid: rows.filter((r) => r.run.source === 'model').length / (rows.length || 1),
    passGates: generated ? questions.length / generated : 0,
    acceptedOfRequested: questions.length / (requested || 1),
    language: questions.length ? questions.filter(({ q, lang }) => languageOk(lang, `${q.stem} ${q.options?.join(' ') ?? ''}`)).length / questions.length : 0,
    keyPositions: new Set(questions.filter(({ q }) => q.type === 'mcq').map(({ q }) => q.answerIndex)).size,
    p95Ms: percentile(lat, 0.95),
    costInr: rows.reduce((n, r) => n + (r.run.usage?.costInr ?? 0), 0),
    outTokens: rows.reduce((n, r) => n + (r.run.usage?.outputTokens ?? 0), 0),
  };
  const bar = {
    valid: m.valid === 1, passGates: m.passGates >= 0.8, accepted: m.acceptedOfRequested >= 0.8,
    language: m.language >= 0.95, keyPositions: m.keyPositions >= 2, p95Ms: m.p95Ms <= 20_000,
  };

  console.log(`\nquiz  calls=${rows.length}  requested=${requested}  generated=${generated}  accepted=${questions.length}`);
  console.log(`valid ${pct(m.valid)}  pass gates ${pct(m.passGates)}  accepted/requested ${pct(m.acceptedOfRequested)}  language ${pct(m.language)}  key positions ${m.keyPositions}`);
  console.log(`latency p95 ${m.p95Ms} ms; total ₹${m.costInr.toFixed(4)} (${m.outTokens} output tokens)`);
  console.log(`PASS BAR: ${Object.values(bar).every(Boolean) ? 'PASS' : `FAIL ${Object.entries(bar).filter(([, v]) => !v).map(([k]) => k).join(', ')}`}`);
  for (const r of rows) {
    console.log(`\n${r.c.id} [${r.c.language}] ${r.latencyMs} ms${r.run.error ? `  ERROR: ${r.run.error}` : ''}`);
    for (const q of r.run.output.questions) {
      console.log(`  ✔ ${q.type}: ${q.stem}`);
      if (q.options) console.log(`      ${q.options.map((o, i) => `${i === q.answerIndex ? '*' : ' '}${'ABCD'[i]}) ${o}`).join('   ')}`);
      else console.log(`      answer: ${q.answer}  (${q.work?.expression} with ${JSON.stringify(q.work?.given)})`);
      console.log(`      cites: ${q.citations.map((ct) => `${ct.section} p.${ct.pageStart}`).join('; ')}`);
    }
    for (const x of r.run.output.rejected) console.log(`  ✘ ${x.reason}: ${x.stem}`);
  }
  return { metrics: m, bar, rows: rows.map((r) => ({ id: r.c.id, language: r.c.language, output: r.run.output, usage: r.run.usage, latencyMs: r.latencyMs, error: r.run.error })) };
}
