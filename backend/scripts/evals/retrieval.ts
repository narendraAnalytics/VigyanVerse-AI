// Live eval + calibration for the Curriculum Retrieval agent (Agent 2), production path:
// router (subject + Telugu keywords) -> retrieveContext() -> assessContext().
//   in-book : data/eval/retrieval-v1.json (150, gold sections)
//   out     : data/eval/out-of-book-v1.json (36, not answered by the book)
// Pass bar (set 2026-11-13 before the first run): in-book marked "none" <= 3%,
// out-of-book caught as "none" >= 80%, in-book gold section in top 5 >= 95%.
// --tune also prints in-book / out-of-book trade-offs for noneCoverage (no extra API calls).
import { readFileSync } from 'node:fs';
import type { AgentContext } from '../../src/agents/kit.ts';
import { CONTEXT_THRESHOLDS, retrieveContext } from '../../src/agents/retrieval.ts';
import { routeMessage, type Subject } from '../../src/agents/router.ts';
import { adminClient, makeThrottle, matchesGold, pct, pool } from './common.ts';

interface Q { id: string; subject: Subject; lang: string; question: string; gold?: string[]; kind?: string }
const load = <T>(p: string): T => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));

export async function evalRetrieval(ctx: AgentContext, opts: { only?: string[]; tune?: boolean }) {
  const inBook = load<{ questions: Q[] }>('../../data/eval/retrieval-v1.json').questions;
  const outBook = load<{ questions: Q[] }>('../../data/eval/out-of-book-v1.json').questions;
  const all = [...inBook.map((q) => ({ ...q, inBook: true })), ...outBook.map((q) => ({ ...q, inBook: false }))]
    .filter((q) => !opts.only || opts.only.includes(q.id));
  const admin = adminClient();
  const throttle = makeThrottle();

  const rows = await pool(all, 2, async (q) => {
    let route;
    for (let attempt = 1; ; attempt++) {
      await throttle();
      route = await routeMessage({ message: q.question }, ctx);
      if (!route.error?.includes('429') || attempt === 4) break;
      await new Promise((r) => setTimeout(r, 20_000));
    }
    const input = { question: q.question, routerKeywords: route.output.keywords, routerSubject: route.output.subject, routerLanguage: route.output.language };
    const routed = await retrieveContext(admin, input);              // no screen subject (hardest case)
    const screen = await retrieveContext(admin, { ...input, screenSubject: q.subject }); // student is on the subject screen
    const rankIn = (hits: typeof routed.hits) => (q.gold ? hits.findIndex((h) => matchesGold(h.section_path, q.gold!)) + 1 : 0);
    return {
      id: q.id, inBook: q.inBook, lang: q.lang, kind: q.kind, question: q.question,
      routerIntent: route.output.intent, routerSubject: route.output.subject, routerKeywords: route.output.keywords, routerSource: route.source,
      routed: { status: routed.status, topScore: routed.topScore, coverage: routed.coverage, missing: routed.missingTerms, rank: rankIn(routed.hits), retried: routed.subjectRetried, top: routed.hits[0]?.section_path ?? null },
      screen: { status: screen.status, topScore: screen.topScore, coverage: screen.coverage, missing: screen.missingTerms, rank: rankIn(screen.hits), top: screen.hits[0]?.section_path ?? null },
    };
  });

  const report = (mode: 'routed' | 'screen') => {
    const ib = rows.filter((r) => r.inBook);
    const ob = rows.filter((r) => !r.inBook);
    const m = {
      inBookNone: ib.filter((r) => r[mode].status === 'none').length / (ib.length || 1),
      inBookGrounded: ib.filter((r) => r[mode].status === 'grounded').length / (ib.length || 1),
      inBookR5: ib.filter((r) => r[mode].rank > 0 && r[mode].rank <= 5).length / (ib.length || 1),
      outCaught: ob.filter((r) => r[mode].status === 'none').length / (ob.length || 1),
      outGrounded: ob.filter((r) => r[mode].status === 'grounded').length / (ob.length || 1),
    };
    const bar = { inBookNone: m.inBookNone <= 0.03, outCaught: m.outCaught >= 0.8, inBookR5: m.inBookR5 >= 0.95 };
    console.log(`\n[${mode === 'routed' ? 'router subject' : 'screen subject'}] in-book: none ${pct(m.inBookNone)} (bar <=3%), grounded ${pct(m.inBookGrounded)}, R@5 ${pct(m.inBookR5)}` +
      ` | out-of-book: caught ${pct(m.outCaught)} (bar >=80%), wrongly grounded ${pct(m.outGrounded)}` +
      `  => ${Object.values(bar).every(Boolean) ? 'PASS' : `FAIL ${Object.entries(bar).filter(([, v]) => !v).map(([k]) => k).join(', ')}`}`);
    return { metrics: m, bar };
  };

  console.log(`\nretrieval agent  thresholds=${JSON.stringify(CONTEXT_THRESHOLDS)}  subject retries=${rows.filter((r) => r.routed.retried).length}`);
  const routed = report('routed');
  const screen = report('screen');

  for (const r of rows.filter((x) => (x.inBook && x.routed.status === 'none') || (!x.inBook && x.routed.status !== 'none'))) {
    console.log(`  ${r.inBook ? 'IN  marked none ' : 'OUT not caught  '} ${r.id} [${r.routed.status}] cov ${r.routed.coverage.toFixed(2)} ` +
      `missing: ${r.routed.missing.join(' ')} | top ${r.routed.top ?? '-'} | ${r.question.slice(0, 50)}`);
  }

  let tuned;
  if (opts.tune) tuned = tune(rows.map((r) => ({ inBook: r.inBook, ...r.routed })));
  return { routed, screen, tuned, rows };
}

/** Threshold search on saved signals: none = coverage < c. Max out-of-book caught with in-book none <= 3%. */
export function tune(rows: { inBook: boolean; topScore: number; coverage: number }[]) {
  const ib = rows.filter((r) => r.inBook);
  const ob = rows.filter((r) => !r.inBook);
  console.log('\nTuning noneCoverage (none = coverage < c):');
  const results = [];
  for (let c = 0.3; c <= 0.851; c += 0.05) {
    const none = (r: { coverage: number }) => r.coverage < c;
    const row = { c: +c.toFixed(2), inNone: ib.filter(none).length / ib.length, outCaught: ob.filter(none).length / ob.length };
    results.push(row);
    console.log(`  c ${row.c.toFixed(2)}  in-book none ${pct(row.inNone)}  out caught ${pct(row.outCaught)}${row.inNone <= 0.03 ? '' : '  (in-book too high)'}`);
  }
  const q = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return [0.05, 0.1, 0.25, 0.5, 0.75, 0.9].map((p) => s[Math.floor(p * (s.length - 1))]?.toFixed(2)).join(' / '); };
  console.log(`  in-book  coverage p5/10/25/50/75/90: ${q(ib.map((r) => r.coverage))}`);
  console.log(`  out-book coverage p5/10/25/50/75/90: ${q(ob.map((r) => r.coverage))}`);
  return results;
}


