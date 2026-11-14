// Live check for the Assessment Validation agent (4b). SMALL on purpose (owner 2026-11-14:
// minimum Sarvam tokens now; full testing with the frontend): 2 quiz-writing calls (DeepSeek)
// and 2 validator calls (Sarvam 105B), no judge model.
//
// Questions come from the quiz agent on 2 topics (physics EN with numeric, biology EN). Then:
//   call A  = the genuine questions, as written;
//   call B  = corrupted copies: (1) WRONG KEY (MCQ: key moved to another option; numeric: answer
//             doubled) and (2) OFF-PASSAGE (question kept, but cited passages swapped to the
//             other topic's, so it cannot be answered from them).
//
// Pass bar (set 2026-11-14 BEFORE the first run):
//   both validator calls return valid JSON; genuine questions kept >= 80%;
//   wrong-key copies rejected 100%; off-passage copies rejected >= 80%;
//   p95 latency per call <= 12 s. (Cost is reported, no bar.)
import type { AgentContext } from '../../src/agents/kit.ts';
import { runQuiz, type QuizQuestion } from '../../src/agents/quiz.ts';
import { retrieveContext } from '../../src/agents/retrieval.ts';
import { runValidator } from '../../src/agents/validator.ts';
import type { ChunkHit } from '../../src/shared/retrieval.ts';
import { adminClient, makeThrottle, pct, percentile } from './common.ts';

const TOPICS = [
  { id: 'v1', topic: "Ohm's law resistance of a conductor resistors in series and parallel", subject: 'physics' as const, count: 4, types: ['mcq', 'numeric'] as ('mcq' | 'numeric')[] },
  { id: 'v2', topic: 'photosynthesis autotrophic nutrition chlorophyll stomata', subject: 'biology' as const, count: 3, types: ['mcq'] as ('mcq' | 'numeric')[] },
];

function wrongKey(q: QuizQuestion): QuizQuestion | null {
  if (q.type === 'mcq') {
    const i = ((q.answerIndex ?? 0) + 1) % 4;
    return { ...q, answerIndex: i, answer: q.options![i] };
  }
  const m = q.answer.match(/^\s*(-?[\d.]+(?:e[+-]?\d+)?)\s*(.*)$/i);
  return m ? { ...q, answer: `${Number(m[1]) * 2} ${m[2]}`.trim() } : null;
}

export async function evalValidator(ctx: AgentContext, opts: { only?: string[] }) {
  const admin = adminClient();
  const throttle = makeThrottle();
  const genuine: { q: QuizQuestion; topic: string }[] = [];
  const passages = new Map<string, ChunkHit[]>();
  for (const t of TOPICS.filter((x) => !opts.only || opts.only.includes(x.id))) {
    const retrieval = await retrieveContext(admin, { question: t.topic, screenSubject: t.subject });
    passages.set(t.id, retrieval.hits);
    await throttle();
    const run = await runQuiz({ passages: retrieval.hits, count: t.count, language: 'en', assessmentScope: 'summative', types: t.types }, {});
    for (const q of run.output.questions) genuine.push({ q, topic: t.id });
    process.stdout.write('.');
  }
  const allPassages = [...passages.values()].flat();
  const otherTopicChunks = (topic: string) => [...passages.entries()].find(([id]) => id !== topic)?.[1].slice(0, 1).map((h) => h.chunk_id) ?? [];

  const wrong = genuine.flatMap(({ q }) => { const w = wrongKey(q); return w ? [w] : []; }).slice(0, 4);
  const off = genuine.filter(({ q }) => q.type === 'mcq').slice(0, 2).map(({ q, topic }) => ({ ...q, sourceChunkIds: otherTopicChunks(topic) }));

  await throttle();
  const t0 = Date.now();
  const a = await runValidator({ questions: genuine.map((g) => g.q), passages: allPassages }, ctx);
  const latA = Date.now() - t0;
  await throttle();
  const t1 = Date.now();
  const b = await runValidator({ questions: [...wrong, ...off], passages: allPassages }, ctx);
  const latB = Date.now() - t1;
  process.stdout.write('\n');

  const rejectedStems = new Set(b.output.rejected.map((r) => r.stem));
  const offAccepted = off.filter((q) => b.output.accepted.some((x) => x === q)).length;
  const m = {
    valid: a.source === 'model' && b.source === 'model',
    genuineKept: genuine.length ? a.output.accepted.length / genuine.length : 0,
    wrongKeyRejected: wrong.length ? (wrong.length - b.output.accepted.filter((x) => wrong.includes(x)).length) / wrong.length : 0,
    offPassageRejected: off.length ? (off.length - offAccepted) / off.length : 0,
    p95Ms: percentile([latA, latB], 0.95),
    costInr: (a.usage?.costInr ?? 0) + (b.usage?.costInr ?? 0),
    tokens: (a.usage?.inputTokens ?? 0) + (a.usage?.outputTokens ?? 0) + (b.usage?.inputTokens ?? 0) + (b.usage?.outputTokens ?? 0),
  };
  const bar = {
    valid: m.valid, genuineKept: m.genuineKept >= 0.8, wrongKeyRejected: m.wrongKeyRejected === 1,
    offPassageRejected: m.offPassageRejected >= 0.8, p95Ms: m.p95Ms <= 12_000,
  };

  console.log(`\nvalidator  genuine=${genuine.length}  wrong-key=${wrong.length}  off-passage=${off.length}`);
  console.log(`valid ${m.valid}  genuine kept ${pct(m.genuineKept)}  wrong-key rejected ${pct(m.wrongKeyRejected)}  off-passage rejected ${pct(m.offPassageRejected)}`);
  console.log(`latency A ${latA} ms, B ${latB} ms; total ₹${m.costInr.toFixed(4)} (${m.tokens} tokens)`);
  console.log(`PASS BAR: ${Object.values(bar).every(Boolean) ? 'PASS' : `FAIL ${Object.entries(bar).filter(([, v]) => !v).map(([k]) => k).join(', ')}`}`);
  if (a.error) console.log(`A ERROR: ${a.error}`);
  if (b.error) console.log(`B ERROR: ${b.error}`);
  console.log('\ngenuine, rejected by the validator:');
  for (const r of a.output.rejected) console.log(`  ✘ ${r.reason}: ${r.stem}`);
  console.log('corrupted, wrongly ACCEPTED:');
  for (const q of b.output.accepted) console.log(`  ! ${wrong.includes(q) ? 'wrong key' : 'off passage'}: ${q.stem}  (key: ${q.answer})`);
  return {
    metrics: m, bar,
    genuine: genuine.map((g) => g.q), genuineRejected: a.output.rejected,
    corrupted: { wrong: wrong.length, off: off.length, accepted: b.output.accepted.map((q) => q.stem), rejected: b.output.rejected },
    usage: { a: a.usage, b: b.usage },
  };
}
