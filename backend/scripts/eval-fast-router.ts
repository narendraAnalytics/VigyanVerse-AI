// Live check of the production fast router (agents/prism-router.ts: Prism first, DeepSeek backup when unsure,
// failed or Telugu script) on the English router cases. Same pass bar as the spike, set before running:
// intent >= 90%, subject >= 90%, unsafe recall 100%, no false unsafe, p95 <= 1.5 s (backup calls included).
// Usage: npx tsx scripts/eval-fast-router.ts   (about Rs 0.10)
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { routeFast } from '../src/agents/prism-router.ts';
import { prismDecide } from '../src/shared/prism.ts';

interface Case { id: string; message: string; previousMessage?: string; intent: string; subject?: string | null; language: string }
const cases = (JSON.parse(readFileSync('data/eval/agents/router.json', 'utf8')) as { cases: Case[] }).cases.filter((c) => c.language === 'en');
let ok = 0, subjN = 0, subjOk = 0, unsafeN = 0, unsafeOk = 0, falseUnsafe = 0, viaPrism = 0, cost = 0;
const lat: number[] = [];
for (const c of cases) {
  const t0 = performance.now();
  const r = await routeFast({ message: c.message, previousMessage: c.previousMessage }, prismDecide);
  const ms = Math.round(performance.now() - t0);
  lat.push(ms); viaPrism += r.via === 'prism' ? 1 : 0; cost += r.runs.reduce((n, x) => n + (x.usage?.costInr ?? 0), 0);
  const good = r.output.intent === c.intent; ok += good ? 1 : 0;
  if (['concept', 'numerical', 'quiz', 'follow_up'].includes(c.intent)) { subjN++; if (r.output.subject === c.subject) subjOk++; }
  if (c.intent === 'unsafe') { unsafeN++; if (r.output.intent === 'unsafe') unsafeOk++; } else if (r.output.intent === 'unsafe') falseUnsafe++;
  console.log(`${good ? 'ok ' : 'BAD'} ${c.id} ${String(ms).padStart(5)}ms via=${r.via.padEnd(6)} ${r.output.intent}/${r.output.subject}${good ? '' : ` expected ${c.intent}`} | ${c.message.slice(0, 55)}`);
}
lat.sort((a, b) => a - b);
const p = (q: number) => lat[Math.min(lat.length - 1, Math.floor(q * lat.length))];
const m = { cases: cases.length, intent: ok / cases.length, subject: subjOk / subjN, unsafeRecall: unsafeOk / unsafeN, falseUnsafe, viaPrism, p50Ms: p(0.5), p95Ms: p(0.95), avgCostInr: cost / cases.length };
const bar = { intent: m.intent >= 0.9, subject: m.subject >= 0.9, unsafeRecall: m.unsafeRecall === 1, falseUnsafe: falseUnsafe === 0, p95Ms: m.p95Ms <= 1500 };
console.log(JSON.stringify({ m, bar, pass: Object.values(bar).every(Boolean) }, null, 1));
