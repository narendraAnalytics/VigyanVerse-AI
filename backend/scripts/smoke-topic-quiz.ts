// Live check of topic quizzes (owner 2026-11-16): topic passages inside a chapter -> quiz writer
// (with the batch angle) -> validator. Real models, ONE quiz (~Rs 0.1-0.2), nothing saved.
// Usage: npx tsx scripts/smoke-topic-quiz.ts ["topic"] [chapter number] [batch 0-2]
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { createAdminClient } from '@insforge/sdk';
import { topicPassages } from '../src/shared/chapter-passages.ts';
import { generateValidatedQuiz } from '../src/agents/quiz-pipeline.ts';
import { BATCH_ANGLES } from '../src/agents/quiz.ts';

const project = JSON.parse(readFileSync(new URL('../.insforge/project.json', import.meta.url), 'utf8'));
const admin = createAdminClient({ baseUrl: process.env.INSFORGE_BASE_URL ?? project.oss_host, apiKey: process.env.INSFORGE_API_KEY ?? project.api_key });

const topic = process.argv[2] ?? "Ohm's law";
const number = Number(process.argv[3] ?? 11);
const batch = Number(process.argv[4] ?? 1);

const { data } = await admin.database.from('chapters').select('id, board_code, subject_code, number, title_en, assessment_scope').eq('number', number).eq('board_code', 'CBSE').limit(1);
const chapter = (data as { id: string; board_code: string; subject_code: string; number: number; title_en: string; assessment_scope: 'summative' | 'formative_only' }[])[0];
console.log(`Chapter ${chapter.number} ${chapter.title_en} | topic "${topic}" | batch ${batch}`);

for (const off of ['photosynthesis']) {
  const r = await topicPassages(admin, chapter, off, 0);
  console.log(`off-chapter topic "${off}": ${r.ok ? 'ACCEPTED (bad)' : r.error}`);
}

const picked = await topicPassages(admin, chapter, topic, batch);
if (!picked.ok) { console.log('topic refused:', picked.error); process.exit(1); }
console.log('passages:', picked.passages.map((p) => `p${p.page_start} ${p.section_path ?? ''}`).join(' | '));
const t0 = Date.now();
const types = chapter.subject_code === 'physics' ? ['mcq' as const, 'numeric' as const] : ['mcq' as const];
const r = await generateValidatedQuiz({ passages: picked.passages, count: 5, language: 'en', assessmentScope: chapter.assessment_scope, types, topic, angle: BATCH_ANGLES[batch] }, { timeLeft: () => 25_000 - (Date.now() - t0) });
const cost = r.usage.reduce((s, u) => s + (u.costInr ?? 0), 0);
console.log(`time ${((Date.now() - t0) / 1000).toFixed(1)} s, cost Rs ${cost.toFixed(4)}`);
if (!r.ok) { console.log('FAILED:', r.reason, r.message); process.exit(1); }
r.questions.forEach((q, i) => console.log(`${i + 1}. [${q.type}] ${q.stem}\n   -> ${q.answer}`));
console.log(`returned ${r.questions.length}/5, dropped ${r.dropped.length}: ${r.dropped.map((d) => d.reason).join('; ')}`);
