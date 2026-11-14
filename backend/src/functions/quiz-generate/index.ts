// Edge Function: make a practice quiz for one chapter (Phase 4c).
// POST { chapterId, count?: 1-5, language?: 'en' | 'te', difficulty?: 1-3, types?: ['mcq','numeric'] }
//
//   authenticate -> zod -> consent (ai_tutoring) -> quiz limit (reserve_quiz)
//   -> chapter + sampled textbook passages -> quiz agent (DeepSeek) -> validation agent
//   (Sarvam 105B, answers blind) -> save the questions and the SECRET answer keys
//   -> create the student's assessment -> return the questions WITHOUT keys.
//
// The student's identity, consent, limits and own rows all use the user-scoped client (RLS).
// Only two writes use the project admin client: `questions` and `question_keys`, because no
// student may insert a question or read an answer key. Both happen after the checks above.
import { createAdminClient } from '@insforge/sdk';
import { z } from 'zod';
import { generateValidatedQuiz, publicQuestion, toQuestionRows } from '../../agents/quiz-pipeline.ts';
import { MAX_QUESTIONS } from '../../agents/quiz.ts';
import { samplePassages } from '../../shared/chapter-passages.ts';
import { authenticate, json, preflight } from '../../shared/http.ts';
import { requireEnv } from '../../shared/env.ts';

const FUNCTION_SLUG = 'quiz-generate';
/** Edge Functions stop at 30 s: generating + validating gets 25 s, saving the rest. */
const BUDGET_MS = 25_000;
/** ~Rs 0.1 per quiz (4b + 4a evals). Owner to confirm the numbers. */
const MAX_QUIZZES_PER_MINUTE = 3;
const MAX_QUIZZES_PER_DAY = 20;
const MAX_COST_INR_PER_DAY = 10;

const Body = z.object({
  chapterId: z.string().uuid(),
  count: z.number().int().min(1).max(MAX_QUESTIONS).default(MAX_QUESTIONS),
  language: z.enum(['en', 'te']).default('en'),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  types: z.array(z.enum(['mcq', 'numeric'])).min(1).max(2).optional(),
});

interface ChapterRow {
  id: string; board_code: string; subject_code: string; number: number | null; title_en: string;
  assessment_scope: 'summative' | 'formative_only';
}

export default async function (req: Request): Promise<Response> {
  const started = Date.now();
  const early = preflight(req);
  if (early) return early;
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const user = await authenticate(req);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: 'Invalid request', issues: parsed.error.issues }, 400);
  const body = parsed.data;
  const db = user.client.database;

  // 1. A linked parent must have allowed AI features.
  const consent = await db.rpc('has_consent', { p_student: user.userId, p_consent_type: 'ai_tutoring' });
  if (consent.error) return json({ error: 'consent_check_failed' }, 500);
  if (consent.data !== true) return json({ error: 'consent_required' }, 403);

  // 2. Limits: check and count this request in one locked step, before any AI work.
  const reserved = await db.rpc('reserve_quiz', {
    p_max_per_minute: MAX_QUIZZES_PER_MINUTE, p_max_per_day: MAX_QUIZZES_PER_DAY, p_max_cost_inr: MAX_COST_INR_PER_DAY,
  });
  if (reserved.error) return json({ error: 'usage_failed' }, 500);
  if (reserved.data === 'slow_down' || reserved.data === 'daily_limit') return json({ error: reserved.data }, 429);
  if (reserved.data !== 'ok') return json({ error: 'usage_failed' }, 500);

  // 3. The chapter (RLS: active chapters only) and sampled textbook passages.
  const chapterRes = await db.from('chapters').select('id, board_code, subject_code, number, title_en, assessment_scope').eq('id', body.chapterId).limit(1);
  if (chapterRes.error) return json({ error: 'chapter_failed' }, 500);
  const chapter = (chapterRes.data as ChapterRow[] | null)?.[0];
  if (!chapter) return json({ error: 'chapter_not_found' }, 404);
  if (chapter.assessment_scope === 'formative_only') {
    return json({ error: 'formative_only', message: 'This chapter is formative only: no exam-style quiz (CBSE 2026-27).' }, 422);
  }

  const picked = await samplePassages(user.client, chapter);
  if (!picked.ok) return json({ error: picked.error }, picked.error === 'no_passages' ? 422 : 500);
  const passages = picked.passages;

  // 4. Write -> validate (fails closed: only validated questions come back).
  const types = body.types ?? (chapter.subject_code === 'physics' ? ['mcq' as const, 'numeric' as const] : ['mcq' as const]);
  let result: Awaited<ReturnType<typeof generateValidatedQuiz>>;
  try {
    result = await generateValidatedQuiz(
      { passages, count: body.count, language: body.language, assessmentScope: chapter.assessment_scope, difficulty: body.difficulty, types },
      { timeLeft: () => BUDGET_MS - (Date.now() - started) },
    );
  } catch (e) {
    console.error(`${FUNCTION_SLUG}: pipeline failed: ${e instanceof Error ? e.message.slice(0, 200) : 'unknown'}`);
    return json({ error: 'quiz_failed' }, 500);
  }

  // Usage rows are saved whatever happened (cost and errors are tracked per call).
  const usageRows = result.usage.map((u) => ({
    function_slug: FUNCTION_SLUG, agent: u.agent, model: u.model ?? null,
    input_tokens: u.inputTokens ?? 0, output_tokens: u.outputTokens ?? 0, reasoning_tokens: u.reasoningTokens ?? null,
    cost_inr: Number((u.costInr ?? 0).toFixed(5)), latency_ms: Math.round(u.latencyMs ?? 0), used_fallback: u.usedFallback, error: u.error ?? null,
  }));
  const saveUsage = usageRows.length ? await db.from('model_usage').insert(usageRows) : { error: null };
  if (saveUsage.error) console.error(`${FUNCTION_SLUG}: usage save failed`);

  if (!result.ok) {
    if (result.reason === 'refused') return json({ error: 'formative_only', message: result.message }, 422);
    // Nothing unchecked is ever served: the student can simply try again.
    return json({ error: result.reason, message: result.message }, result.reason === 'no_time' ? 503 : 502);
  }

  // 5. Save the bank rows (admin client) and the student's assessment (the student, under RLS).
  const rows = toQuestionRows(result.questions, {
    chapterId: chapter.id, language: body.language, generatedBy: result.models.generated, validatedBy: result.models.validated,
    newId: () => crypto.randomUUID(),
  });
  const admin = createAdminClient({ baseUrl: requireEnv('INSFORGE_BASE_URL'), apiKey: requireEnv('API_KEY') });
  const savedQuestions = await admin.database.from('questions').insert(rows.map((r) => r.question));
  if (savedQuestions.error) { console.error(`${FUNCTION_SLUG}: questions save failed`); return json({ error: 'save_failed' }, 500); }
  const savedKeys = await admin.database.from('question_keys').insert(rows.map((r) => r.key));
  if (savedKeys.error) {
    console.error(`${FUNCTION_SLUG}: keys save failed`);
    await admin.database.from('questions').delete().in('id', rows.map((r) => r.question.id as string)); // keys cascade
    return json({ error: 'save_failed' }, 500);
  }

  const assessment = await db.from('assessments').insert([{ kind: 'practice', chapter_id: chapter.id, language: body.language }]).select('id');
  const assessmentId = (assessment.data as { id: string }[] | null)?.[0]?.id;
  // Fails for accounts without a students row (only students take quizzes).
  if (assessment.error || !assessmentId) return json({ error: 'assessment_failed' }, 403);
  const links = await db.from('assessment_questions').insert(rows.map((r, i) => ({ assessment_id: assessmentId, question_id: r.question.id, position: i + 1, marks: 1 })));
  if (links.error) {
    console.error(`${FUNCTION_SLUG}: assessment questions save failed`);
    await db.from('assessments').delete().eq('id', assessmentId);
    return json({ error: 'assessment_failed' }, 500);
  }

  return json({
    assessmentId,
    chapter: { id: chapter.id, number: chapter.number, title: chapter.title_en, subject: chapter.subject_code },
    language: body.language,
    requested: body.count,
    // Fewer than requested is normal: questions that fail a check are dropped, never served.
    questions: rows.map((r, i) => publicQuestion(r.question, i + 1, 1)),
    dropped: result.dropped.length,
  });
}
