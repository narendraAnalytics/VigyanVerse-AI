// Retrieval eval: runs every question in data/eval/retrieval-v1.json through the same
// retrieve() the tutor uses (Sarvam query rewrite for Telugu script -> match_chunks_keyword)
// and scores the ranked chunks against gold section numbers.
//
//   npm run eval:retrieval                     production setting: rewrite only Telugu script
//   npm run eval:retrieval -- --split dev      only the dev split (tune on this)
//   npm run eval:retrieval -- --always-rewrite rewrite every question (pre-2026-11-13 setting)
//   npm run eval:retrieval -- --no-rewrite     baseline: the question's own words as keywords
//   npm run eval:retrieval -- --no-subject     search all subjects (no subject filter)
//   npm run eval:retrieval -- --only c01,p29   selected ids, with full top-5 output
//   npm run eval:retrieval -- --save           also write data/eval/results/<name>-<date>-<mode>.json
//
// Metrics: Recall@1, Recall@5 (gold section among the top k chunks), MRR@10.
// Cost: about ₹0.005 per question with rewrite (≈ ₹0.75 for 150 questions). Rewrite calls are
// throttled to 40/min (Sarvam pay-as-you-go: 50/min), so a full run takes about 4 minutes.
import 'dotenv/config';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createAdminClient } from '@insforge/sdk';
import { needsRewrite, retrieve, type ChunkHit, type RewriteResult } from '../src/shared/retrieval.ts';

interface EvalQuestion {
  id: string; subject: string; lang: 'en' | 'te' | 'te-latn'; type: string; question: string; gold: string[];
}
interface EvalSet { name: string; questions: EvalQuestion[] }

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const option = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const K = 10;

const evalSet: EvalSet = JSON.parse(readFileSync(new URL('../data/eval/retrieval-v1.json', import.meta.url), 'utf8'));
const splitOf = (id: string) => (Number(id.replace(/\D/g, '')) % 3 === 0 ? 'test' : 'dev');
const only = option('--only')?.split(',');
const split = option('--split');
const questions = evalSet.questions.filter((q) =>
  (!only || only.includes(q.id)) && (!split || split === 'all' || splitOf(q.id) === split));
const rewriteMode: 'auto' | 'always' | 'never' = flag('--always-rewrite') ? 'always' : flag('--no-rewrite') ? 'never' : 'auto';
const useSubject = !flag('--no-subject');
const mode = [{ auto: 'rewrite-te', always: 'rewrite', never: 'norewrite' }[rewriteMode], useSubject ? 'subject' : 'nosubject'].join('-');

const project = JSON.parse(readFileSync(new URL('../.insforge/project.json', import.meta.url), 'utf8'));
const admin = createAdminClient({
  baseUrl: process.env.INSFORGE_BASE_URL ?? project.oss_host,
  apiKey: process.env.INSFORGE_API_KEY ?? project.api_key,
});

/** "12.1" must match "12.1 Magnetic..." and "... > 12.1.2 ...", never "2.1" inside "12.1". */
function matchesGold(sectionPath: string | null, gold: readonly string[]): boolean {
  if (!sectionPath) return false;
  return gold.some((g) => new RegExp(`(^|> )${g.replace(/\./g, '\\.')}[ .]`).test(sectionPath));
}

// Every gold section must exist in the ingested corpus, or the question can never score.
{
  const { data, error } = await admin.database.from('document_chunks').select('section_path').limit(5000);
  if (error) throw new Error(`section list: ${JSON.stringify(error)}`);
  const paths = [...new Set((data as { section_path: string | null }[]).map((r) => r.section_path))];
  const exists = (g: string) => paths.some((p) => matchesGold(p, [g]));
  const missing = questions.flatMap((q) => q.gold.filter((g) => !exists(g)).map((g) => `${q.id}:${g}`));
  const unscorable = questions.filter((q) => !q.gold.some(exists)).map((q) => q.id);
  if (unscorable.length) throw new Error(`No gold section of these questions exists in document_chunks: ${unscorable.join(', ')}`);
  if (missing.length) console.log(`note: alternative gold sections not in the corpus (ok): ${missing.join(', ')}`);
}

// At most one rewrite call every 1.5 s (40/min), below the plan's 50/min.
let nextSlot = 0;
let rateLimited = 0;
async function throttle() {
  const wait = Math.max(0, nextSlot - Date.now());
  nextSlot = Math.max(nextSlot, Date.now()) + 1500;
  if (wait) await new Promise((r) => setTimeout(r, wait));
}

interface Row {
  id: string; subject: string; lang: string; type: string; split: string; question: string; gold: string[];
  rank: number | null; keywords: string[]; keywordSource: string; rewriteError?: string; latencyMs: number; costInr: number;
  top: { chapter: number | null; pages: string; section: string | null }[];
}

async function runOne(q: EvalQuestion): Promise<Row> {
  let t0 = Date.now();
  const opts = { board: 'CBSE', subject: useSubject ? q.subject : undefined, limit: K };
  let hits: ChunkHit[];
  let rewrite: RewriteResult;
  const callsModel = rewriteMode === 'always' || (rewriteMode === 'auto' && needsRewrite(q.question));
  // Sarvam pay-as-you-go allows 50 req/min for glm5.3-flash (account-wide). A 429 would
  // score the fallback, not retrieval quality, so wait and retry instead.
  for (let attempt = 1; ; attempt++) {
    if (callsModel) await throttle();
    t0 = Date.now(); // latency excludes the throttle wait
    ({ hits, rewrite } = await retrieve(admin, q.question, { ...opts, rewrite: rewriteMode }));
    if (!rewrite.error?.includes('429') || attempt === 4) break;
    rateLimited++;
    await new Promise((r) => setTimeout(r, 20_000));
  }
  const idx = hits.findIndex((h) => matchesGold(h.section_path, q.gold));
  return {
    id: q.id, subject: q.subject, lang: q.lang, type: q.type, split: splitOf(q.id), question: q.question, gold: q.gold,
    rank: idx >= 0 ? idx + 1 : null,
    keywords: rewrite.keywords, keywordSource: rewrite.source, rewriteError: rewrite.error,
    latencyMs: Date.now() - t0, costInr: rewrite.usage?.costInr ?? 0,
    top: hits.slice(0, 5).map((h) => ({ chapter: h.chapter_number, pages: `${h.page_start}-${h.page_end}`, section: h.section_path })),
  };
}

// Small worker pool: gentle on Sarvam and the Nano database.
const rows: Row[] = new Array(questions.length);
let next = 0;
const concurrency = Number(option('--concurrency') ?? 4);
await Promise.all(Array.from({ length: Math.min(concurrency, questions.length) }, async () => {
  while (next < questions.length) {
    const i = next++;
    try {
      rows[i] = await runOne(questions[i]);
    } catch (e) {
      throw new Error(`${questions[i].id}: ${(e as Error).message}`);
    }
    process.stdout.write('.');
  }
}));
console.log('\n');

function metrics(rs: Row[]) {
  const n = rs.length || 1;
  return {
    n: rs.length,
    r1: rs.filter((r) => r.rank === 1).length / n,
    r5: rs.filter((r) => r.rank !== null && r.rank <= 5).length / n,
    mrr: rs.reduce((s, r) => s + (r.rank ? 1 / r.rank : 0), 0) / n,
  };
}
const pct = (x: number) => `${(x * 100).toFixed(0)}%`.padStart(5);
const line = (label: string, rs: Row[]) => {
  const m = metrics(rs);
  console.log(`${label.padEnd(22)} n=${String(m.n).padStart(3)}  R@1 ${pct(m.r1)}  R@5 ${pct(m.r5)}  MRR@10 ${m.mrr.toFixed(3)}`);
};
const groupBy = (key: keyof Row) => [...new Set(rows.map((r) => String(r[key])))].sort();

console.log(`${evalSet.name}  mode=${mode}${split ? `  split=${split}` : ''}`);
line('ALL', rows);
for (const key of ['split', 'subject', 'lang', 'type'] as const) {
  for (const v of groupBy(key)) line(`  ${key}=${v}`, rows.filter((r) => String(r[key]) === v));
}
const lat = rows.map((r) => r.latencyMs).sort((a, b) => a - b);
const cost = rows.reduce((s, r) => s + r.costInr, 0);
const fallbacks = rows.filter((r) => r.keywordSource === 'question').length;
console.log(`latency p50 ${lat[Math.floor(lat.length / 2)]} ms, p95 ${lat[Math.floor(lat.length * 0.95)]} ms; ` +
  `rewrite cost ₹${cost.toFixed(3)}; rewrite fallbacks ${fallbacks}; 429 retries ${rateLimited}`);
const errors = [...new Set(rows.map((r) => r.rewriteError).filter(Boolean))];
if (errors.length) console.log(`rewrite errors: ${errors.join(' | ')}`);

const misses = rows.filter((r) => r.rank === null || r.rank > 5);
if (misses.length) console.log(`\nNot in top 5 (${misses.length}):`);
for (const r of only ? rows : misses) {
  console.log(`\n${r.id} [${r.lang}/${r.split}] ${r.question}\n  gold ${r.gold.join('|')}  rank ${r.rank ?? '>10'}  keywords: ${r.keywords.join(' ')}`);
  r.top.forEach((t, i) => console.log(`  ${i + 1}. Ch${t.chapter} p${t.pages} ${t.section ?? '(intro)'}`));
}

if (flag('--save')) {
  const dir = new URL('../data/eval/results/', import.meta.url);
  mkdirSync(dir, { recursive: true });
  const file = new URL(`${evalSet.name}-${new Date().toISOString().slice(0, 10)}-${mode}${split ? `-${split}` : ''}.json`, dir);
  writeFileSync(file, JSON.stringify({ evalSet: evalSet.name, mode, split: split ?? 'all', ranAt: new Date().toISOString(),
    summary: metrics(rows), costInr: cost, rows }, null, 2) + '\n');
  console.log(`\nsaved ${file.pathname}`);
}
