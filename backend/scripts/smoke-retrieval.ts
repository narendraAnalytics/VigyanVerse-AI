// End-to-end retrieval smoke test on the ingested chapters: question -> Sarvam rewrite ->
// match_chunks_keyword. Runs with the admin client (RLS is tested separately in SQL).
// Usage: npm run smoke:retrieval              (sample EN/TE questions)
//        npm run smoke:retrieval -- "your question" [subject]
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { createAdminClient } from '@insforge/sdk';
import { retrieve } from '../src/shared/retrieval.ts';

const project = JSON.parse(readFileSync(new URL('../.insforge/project.json', import.meta.url), 'utf8'));
const admin = createAdminClient({
  baseUrl: process.env.INSFORGE_BASE_URL ?? project.oss_host,
  apiKey: process.env.INSFORGE_API_KEY ?? project.api_key,
});

const custom = process.argv[2];
const QUESTIONS: [string, string | undefined, string][] = custom
  ? [[custom, process.argv[3], '']]
  : [
      ['Why do leaves look green and how do plants make food?', 'biology', '5.2.1'],
      ['ఆకులు ఆకుపచ్చగా ఎందుకు ఉంటాయి?', 'biology', '5.2.1'],
      ['How does blood flow through the human heart?', 'biology', '5.4.1'],
      ['మూత్రపిండాలు ఎలా పని చేస్తాయి?', 'biology', '5.5.1'],
      ['Why does iron rust?', 'chemistry', '1.3.1'],
      ['ఇనుము తుప్పు ఎందుకు పడుతుంది?', 'chemistry', '1.3.1'],
      ['How to balance a chemical equation?', 'chemistry', '1.1.2'],
      ['what happens to current if resistance doubles', 'physics', '11.4'],
      ['Resistors in parallel formula', 'physics', '11.6.2'],
      ['విద్యుత్ శక్తి అంటే ఏమిటి?', 'physics', '11.8'],
    ];

let hitsAt1 = 0;
let hitsAt5 = 0;
for (const [question, subject, expect] of QUESTIONS) {
  const t0 = Date.now();
  const { hits, rewrite } = await retrieve(admin, question, { board: 'CBSE', subject, limit: 5 });
  const rankOk = expect ? hits.findIndex((h) => h.section_path?.includes(expect)) : -1;
  if (rankOk === 0) hitsAt1++;
  if (rankOk >= 0) hitsAt5++;
  console.log(`\n${question}  [${Date.now() - t0} ms, keywords(${rewrite.source}): ${rewrite.keywords.join(' ')}]`);
  if (expect) console.log(`  expected section ${expect}: ${rankOk >= 0 ? `rank ${rankOk + 1}` : 'NOT in top 5'}`);
  hits.slice(0, 3).forEach((h, i) =>
    console.log(`  ${i + 1}. Ch${h.chapter_number} p${h.page_start}-${h.page_end} [${h.section_path ?? 'intro'}] ${h.content.slice(0, 80)}…`));
}
if (!custom) console.log(`\nExpected section at rank 1: ${hitsAt1}/${QUESTIONS.length}, in top 5: ${hitsAt5}/${QUESTIONS.length}`);
