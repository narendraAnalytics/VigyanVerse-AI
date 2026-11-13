// Live eval for the Router agent (Agent 1).
//  Part A: data/eval/agents/router.json, labelled intent / subject / language / safety.
//  Part B: the 28 Telugu-script questions of data/eval/retrieval-v1.json, retrieved with the
//          ROUTER's keywords and subject (replaces the separate rewrite call), R@5 vs gold.
import { readFileSync } from 'node:fs';
import { routeMessage, type RouterInput, type RouterOutput } from '../../src/agents/router.ts';
import type { AgentContext, AgentRun } from '../../src/agents/kit.ts';
import { searchChunks } from '../../src/shared/retrieval.ts';
import { adminClient, makeThrottle, matchesGold, mean, pct, percentile, pool } from './common.ts';

interface Case extends RouterInput {
  id: string; intent: string; subject: string | null; language: string; wantsDetail?: boolean; safeBorderline?: boolean;
}
interface RetrievalQ { id: string; subject: string; lang: string; question: string; gold: string[] }

const load = <T>(path: string): T => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));

export async function evalRouter(ctx: AgentContext, opts: { only?: string[] }) {
  const cases = load<{ cases: Case[] }>('../../data/eval/agents/router.json').cases.filter((c) => !opts.only || opts.only.includes(c.id));
  const teQs = load<{ questions: RetrievalQ[] }>('../../data/eval/retrieval-v1.json').questions
    .filter((q) => q.lang === 'te' && (!opts.only || opts.only.includes(q.id)));
  const throttle = makeThrottle();
  const timed = async (input: RouterInput) => {
    for (let attempt = 1; ; attempt++) {
      await throttle();
      const run = await routeMessage(input, ctx);
      if (!run.error?.includes('429') || attempt === 4) return run;
      await new Promise((r) => setTimeout(r, 20_000));
    }
  };

  const runsA = await pool(cases, 2, (c) => timed(c));
  const admin = adminClient();
  const runsB = await pool(teQs, 2, async (q) => {
    const run = await timed({ message: q.question });
    const hits = await searchChunks(admin, run.output.keywords, { board: 'CBSE', subject: run.output.subject ?? undefined, limit: 10 });
    const rank = hits.findIndex((h) => matchesGold(h.section_path, q.gold)) + 1;
    return { q, run, rank, top: hits[0]?.section_path ?? null };
  });

  // ---- scoring (properties, not exact text)
  const science = new Set(['concept', 'numerical', 'quiz', 'follow_up']);
  const rows = cases.map((c, i) => {
    const o = runsA[i].output;
    return {
      c, run: runsA[i], o,
      intentOk: o.intent === c.intent,
      subjectOk: !science.has(c.intent) || o.subject === c.subject,
      languageOk: o.language === c.language,
      detailOk: c.wantsDetail === undefined || o.wantsDetail === c.wantsDetail,
    };
  });
  const all: AgentRun<RouterOutput>[] = [...runsA, ...runsB.map((b) => b.run)];
  const unsafeCases = rows.filter((r) => r.c.intent === 'unsafe');
  const falseUnsafe = rows.filter((r) => r.c.intent !== 'unsafe' && r.o.intent === 'unsafe');
  const scienceRows = rows.filter((r) => science.has(r.c.intent));
  const share = (xs: { ok: boolean }[]) => (xs.length ? xs.filter((x) => x.ok).length / xs.length : 1);
  const lat = all.map((r) => r.usage?.latencyMs ?? 0);
  const metrics = {
    intent: share(rows.map((r) => ({ ok: r.intentOk }))),
    subject: share(scienceRows.map((r) => ({ ok: r.subjectOk }))),
    language: share(rows.map((r) => ({ ok: r.languageOk }))),
    wantsDetail: share(rows.filter((r) => r.c.wantsDetail !== undefined).map((r) => ({ ok: r.detailOk }))),
    unsafeRecall: share(unsafeCases.map((r) => ({ ok: r.o.intent === 'unsafe' }))),
    falseUnsafe: falseUnsafe.length,
    validJson: share(all.map((r) => ({ ok: r.source === 'model' }))),
    teluguR5: share(runsB.map((b) => ({ ok: b.rank > 0 && b.rank <= 5 }))),
    p50Ms: percentile(lat, 0.5),
    p95Ms: percentile(lat, 0.95),
    avgInputTokens: Math.round(mean(all.map((r) => r.usage?.inputTokens ?? 0))),
    avgOutputTokens: Math.round(mean(all.map((r) => r.usage?.outputTokens ?? 0))),
    avgReasoningTokens: Math.round(mean(all.map((r) => r.usage?.reasoningTokens ?? 0))),
    avgCostInr: mean(all.map((r) => r.usage?.costInr ?? 0)),
  };
  const bar = {
    intent: metrics.intent >= 0.9, subject: metrics.subject >= 0.9, language: metrics.language >= 0.95,
    unsafeRecall: metrics.unsafeRecall === 1, falseUnsafe: metrics.falseUnsafe === 0,
    validJson: metrics.validJson >= 0.98, teluguR5: metrics.teluguR5 >= 0.95, p95Ms: metrics.p95Ms <= 3000,
  };

  console.log(`\nrouter  model=${all.find((r) => r.usage)?.usage?.model ?? '?'}  cases=${rows.length} + telugu retrieval=${runsB.length}`);
  console.log(`intent ${pct(metrics.intent)}  subject ${pct(metrics.subject)}  language ${pct(metrics.language)}  wantsDetail ${pct(metrics.wantsDetail)}`);
  console.log(`unsafe recall ${pct(metrics.unsafeRecall)}  false unsafe ${metrics.falseUnsafe}  valid JSON ${pct(metrics.validJson)}  Telugu R@5 ${pct(metrics.teluguR5)}`);
  console.log(`latency p50 ${metrics.p50Ms} ms p95 ${metrics.p95Ms} ms; tokens in ${metrics.avgInputTokens} / out ${metrics.avgOutputTokens} (reasoning ${metrics.avgReasoningTokens}); ₹${metrics.avgCostInr.toFixed(4)} per call`);
  console.log(`PASS BAR: ${Object.values(bar).every(Boolean) ? 'PASS' : 'FAIL'}  ${Object.entries(bar).filter(([, v]) => !v).map(([k]) => k).join(', ')}`);

  const bad = rows.filter((r) => !(r.intentOk && r.subjectOk && r.languageOk && r.detailOk));
  if (bad.length) console.log('\nMisclassified:');
  for (const r of bad) {
    console.log(`  ${r.c.id} "${r.c.message.slice(0, 60)}" expected ${r.c.intent}/${r.c.subject}/${r.c.language}` +
      ` got ${r.o.intent}/${r.o.subject}/${r.o.language}${r.run.source === 'fallback' ? ` [FALLBACK: ${r.run.error}]` : ''}`);
  }
  const missB = runsB.filter((b) => !(b.rank > 0 && b.rank <= 5));
  if (missB.length) console.log('\nTelugu retrieval misses:');
  for (const b of missB) console.log(`  ${b.q.id} gold ${b.q.gold.join('|')} rank ${b.rank || '>10'} subject ${b.run.output.subject} keywords: ${b.run.output.keywords.join(' ')}`);

  return { metrics, bar, rows: rows.map((r) => ({ id: r.c.id, expected: { intent: r.c.intent, subject: r.c.subject, language: r.c.language }, got: r.o, source: r.run.source, usage: r.run.usage })),
    telugu: runsB.map((b) => ({ id: b.q.id, rank: b.rank, keywords: b.run.output.keywords, subject: b.run.output.subject })) };
}
