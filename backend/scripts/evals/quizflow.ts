// Live check for the quiz-generate pipeline (4c): sampled chapter passages -> quiz agent ->
// validation agent -> database rows. SMALL on purpose (owner 2026-11-14: minimum Sarvam
// tokens now; full testing with the frontend): 2 chapters = 2 DeepSeek + 2 Sarvam calls.
// The database writes and the logged-in function call wait for real accounts.
//
// Pass bar (set 2026-11-14 BEFORE the first run):
//   both pipeline runs ok; questions returned >= 80% of requested; every returned question
//   has a citation, an answer key and (MCQ) 4 options; the student-facing JSON contains no
//   answer / explanation / key field; language right >= 95%; slowest run <= 22 s (the
//   function budget is 25 s of the 30 s limit).
import type { AgentContext } from '../../src/agents/kit.ts';
import { generateValidatedQuiz, publicQuestion, toQuestionRows } from '../../src/agents/quiz-pipeline.ts';
import type { Language } from '../../src/agents/tutor.ts';
import { samplePassages } from '../../src/shared/chapter-passages.ts';
import { adminClient, makeThrottle, pct } from './common.ts';
import { languageOk } from './tutor.ts';

const CASES: { id: string; title: string; language: Language; count: number; types: ('mcq' | 'numeric')[] }[] = [
  { id: 'f1', title: 'Electricity', language: 'en', count: 5, types: ['mcq', 'numeric'] },
  { id: 'f2', title: 'Chemical Reactions', language: 'te', count: 3, types: ['mcq'] },
];

export async function evalQuizflow(ctx: AgentContext, opts: { only?: string[] }) {
  const admin = adminClient();
  const throttle = makeThrottle();
  const rows = [];
  for (const c of CASES.filter((x) => !opts.only || opts.only.includes(x.id))) {
    const ch = await admin.database.from('chapters').select('id, number, title_en, subject_code, assessment_scope').eq('board_code', 'CBSE').ilike('title_en', `%${c.title}%`).limit(1);
    const chapter = (ch.data as { id: string; number: number | null; title_en: string; subject_code: string; assessment_scope: 'summative' | 'formative_only' }[] | null)?.[0];
    if (!chapter) throw new Error(`chapter not found: ${c.title}`);
    const picked = await samplePassages(admin, chapter);
    if (!picked.ok) throw new Error(`passages: ${picked.error}`);
    await throttle();
    const t0 = Date.now();
    const result = await generateValidatedQuiz(
      { passages: picked.passages, count: c.count, language: c.language, assessmentScope: chapter.assessment_scope, types: c.types },
      { ctx, timeLeft: () => 25_000 - (Date.now() - t0) },
    );
    const latencyMs = Date.now() - t0;
    const built = result.ok ? toQuestionRows(result.questions, { chapterId: chapter.id, language: c.language, generatedBy: result.models.generated, validatedBy: result.models.validated, newId: () => crypto.randomUUID() }) : [];
    const shown = built.map((r, i) => publicQuestion(r.question, i + 1, 1));
    rows.push({ c, chapter: chapter.title_en, result, built, shown, latencyMs });
    process.stdout.write('.');
  }
  process.stdout.write('\n');

  const returned = rows.reduce((n, r) => n + r.shown.length, 0);
  const requested = rows.reduce((n, r) => n + r.c.count, 0);
  const all = rows.flatMap((r) => r.built.map((b, i) => ({ b, s: r.shown[i], lang: r.c.language })));
  const structureOk = all.every(({ b, s }) =>
    (b.question.citations as unknown[]).length >= 1 && typeof b.key.answer === 'string' && (b.key.answer as string).length > 0 &&
    (s.type === 'mcq' ? s.options?.length === 4 : s.options === null));
  const leaks = all.some(({ s }) => /"(answer|answer_index|explanation|work|key)"/.test(JSON.stringify(s)));
  const m = {
    ok: rows.every((r) => r.result.ok),
    returnedOfRequested: returned / (requested || 1),
    structureOk, noLeak: !leaks,
    language: all.length ? all.filter(({ s, lang }) => languageOk(lang, `${s.stem} ${s.options?.join(' ') ?? ''}`)).length / all.length : 0,
    slowestMs: Math.max(...rows.map((r) => r.latencyMs)),
    costInr: rows.reduce((n, r) => n + r.result.usage.reduce((a, u) => a + (u.costInr ?? 0), 0), 0),
  };
  const bar = { ok: m.ok, returned: m.returnedOfRequested >= 0.8, structure: m.structureOk, noLeak: m.noLeak, language: m.language >= 0.95, slowest: m.slowestMs <= 22_000 };

  console.log(`\nquizflow  requested=${requested}  returned=${returned}`);
  console.log(`ok ${m.ok}  returned/requested ${pct(m.returnedOfRequested)}  structure ${m.structureOk}  no key leak ${m.noLeak}  language ${pct(m.language)}`);
  console.log(`slowest ${m.slowestMs} ms; total ₹${m.costInr.toFixed(4)}`);
  console.log(`PASS BAR: ${Object.values(bar).every(Boolean) ? 'PASS' : `FAIL ${Object.entries(bar).filter(([, v]) => !v).map(([k]) => k).join(', ')}`}`);
  for (const r of rows) {
    console.log(`\n${r.c.id} ${r.chapter} [${r.c.language}] ${r.latencyMs} ms ${r.result.ok ? '' : `NOT OK: ${r.result.reason}`}`);
    for (const s of r.shown) console.log(`  ✔ ${s.type}: ${s.stem}${s.options ? `\n      ${s.options.map((o, i) => `${'ABCD'[i]}) ${o}`).join('   ')}` : ''}`);
    if (r.result.ok) for (const d of r.result.dropped) console.log(`  ✘ ${d.reason}: ${d.stem}`);
  }
  return { metrics: m, bar, rows: rows.map((r) => ({ id: r.c.id, chapter: r.chapter, latencyMs: r.latencyMs, ok: r.result.ok, questions: r.shown, dropped: r.result.ok ? r.result.dropped : [], usage: r.result.usage })) };
}
