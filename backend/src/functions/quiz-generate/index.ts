// Edge Function: make a practice quiz for one chapter (Phase 4c).
// POST { chapterId, count?: 1-5, language?: 'en' | 'te', difficulty?: 1-3, types?: ['mcq','numeric'],
//        assessmentId?, batch?: 0-2 }
//
// Quizzes of 10 / 15 questions (owner 2026-11-16): the app first creates the assessment itself
// (topic, planned_questions 1-15, timed; RLS "create own"), then calls this once per batch of 5,
// in parallel, with { assessmentId, batch }. Each batch fills positions batch*5+1.. so parallel
// batches never collide; its size, topic and language come from the assessment row, not the body.
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
import { BATCH_ANGLES, MAX_QUESTIONS } from '../../agents/quiz.ts';
import { samplePassages, topicPassages } from '../../shared/chapter-passages.ts';
import { authenticate, json, preflight, withCors } from '../../shared/http.ts';
import { requireEnv } from '../../shared/env.ts';
import { chargeFailed, chargeTask, refundCharge } from '../../shared/wallet.ts';

const FUNCTION_SLUG = 'quiz-generate';
/** Edge Functions stop at 30 s: generating + validating gets 25 s, saving the rest. */
const BUDGET_MS = 25_000;
/** ~Rs 0.1 per quiz (4b + 4a evals). Owner to confirm the numbers. */
// Counted per call: a 15-question quiz is 3 calls (batches).
const MAX_QUIZZES_PER_MINUTE = 6;
const MAX_QUIZZES_PER_DAY = 30;
const MAX_COST_INR_PER_DAY = 10;

const Body = z.object({
  chapterId: z.string().uuid(),
  count: z.number().int().min(1).max(MAX_QUESTIONS).default(MAX_QUESTIONS),
  language: z.enum(['en', 'te']).default('en'),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  types: z.array(z.enum(['mcq', 'numeric'])).min(1).max(2).optional(),
  /** Fill one batch of an assessment the app created (see the header). */
  assessmentId: z.string().uuid().optional(),
  batch: z.number().int().min(0).max(2).default(0),
});

interface AssessmentRow {
  id: string; chapter_id: string | null; language: 'en' | 'te'; submitted_at: string | null;
  topic: string | null; planned_questions: number | null; timer_started_at: string | null;
}

interface ChapterRow {
  id: string; board_code: string; subject_code: string; number: number | null; title_en: string;
  assessment_scope: 'summative' | 'formative_only';
}

export default withCors(async function (req: Request): Promise<Response> {
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

  // A batch of an assessment the app created: it must be the student's own (RLS), still open,
  // not yet timed, for this chapter; it decides the batch size, topic and language.
  let target: AssessmentRow | null = null;
  let count = body.count;
  let language = body.language;
  if (body.assessmentId) {
    const res = await db.from('assessments').select('id, chapter_id, language, submitted_at, topic, planned_questions, timer_started_at').eq('id', body.assessmentId).limit(1);
    if (res.error) return json({ error: 'assessment_failed' }, 500);
    target = (res.data as AssessmentRow[] | null)?.[0] ?? null;
    if (!target) return json({ error: 'assessment_not_found' }, 404);
    if (target.submitted_at || target.timer_started_at || target.chapter_id !== chapter.id) return json({ error: 'assessment_closed' }, 409);
    count = Math.min(MAX_QUESTIONS, (target.planned_questions ?? MAX_QUESTIONS) - body.batch * MAX_QUESTIONS);
    if (count < 1) return json({ error: 'bad_batch' }, 400);
    language = target.language;
  }
  const topic = target?.topic ?? undefined;

  // Pay for this batch (Rs 2 per 5 questions, task_prices) before any AI work. Every failure below
  // gives it back; a batch that returns fewer questions gives back the unserved share.
  const charge = await chargeTask(db, 'quiz_batch', target ? `${target.id}:${body.batch}` : chapter.id);
  if (!charge.ok) return chargeFailed(charge);
  const refund = async (payload: Record<string, unknown>, status: number) => json({ ...payload, balancePaise: await refundCharge(charge) }, status);


  // Passages: about the student's topic (refused if the chapter does not cover it), or a sample.
  let passages;
  if (topic) {
    const picked = await topicPassages(user.client, chapter, topic, body.batch);
    if (picked.rewrite?.usage) {
      const u = picked.rewrite.usage;
      await db.from('model_usage').insert([{ function_slug: FUNCTION_SLUG, agent: 'query_rewrite', model: u.model ?? null, input_tokens: u.inputTokens ?? 0, output_tokens: u.outputTokens ?? 0, reasoning_tokens: null, cost_inr: Number((u.costInr ?? 0).toFixed(5)), latency_ms: Math.round(u.latencyMs ?? 0), used_fallback: false, error: picked.rewrite.error?.slice(0, 200) ?? null }]);
    }
    if (!picked.ok) {
      return refund(picked.error === 'topic_not_found'
        ? { error: 'topic_not_found', message: `"${topic}" is not in this chapter of your textbook. Try another topic, or leave it empty.` }
        : { error: picked.error }, picked.error === 'topic_not_found' ? 422 : 500);
    }
    passages = picked.passages;
  } else {
    const picked = await samplePassages(user.client, chapter);
    if (!picked.ok) return refund({ error: picked.error }, picked.error === 'no_passages' ? 422 : 500);
    passages = picked.passages;
  }
  const planned = target?.planned_questions ?? count;

  // 4. Write -> validate (fails closed: only validated questions come back).
  const types = body.types ?? (chapter.subject_code === 'physics' ? ['mcq' as const, 'numeric' as const] : ['mcq' as const]);
  let result: Awaited<ReturnType<typeof generateValidatedQuiz>>;
  try {
    result = await generateValidatedQuiz(
      { passages, count, language, assessmentScope: chapter.assessment_scope, difficulty: body.difficulty, types, topic, angle: planned > MAX_QUESTIONS ? BATCH_ANGLES[body.batch] : undefined },
      { timeLeft: () => BUDGET_MS - (Date.now() - started) },
    );
  } catch (e) {
    console.error(`${FUNCTION_SLUG}: pipeline failed: ${e instanceof Error ? e.message.slice(0, 200) : 'unknown'}`);
    return refund({ error: 'quiz_failed' }, 500);
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
    if (result.reason === 'refused') return refund({ error: 'formative_only', message: result.message }, 422);
    // Nothing unchecked is ever served: the student can simply try again.
    return refund({ error: result.reason, message: result.message }, result.reason === 'no_time' ? 503 : 502);
  }

  // 5. Save the bank rows (admin client) and the student's assessment (the student, under RLS).
  const rows = toQuestionRows(result.questions, {
    chapterId: chapter.id, language, generatedBy: result.models.generated, validatedBy: result.models.validated,
    newId: () => crypto.randomUUID(),
  });
  const admin = createAdminClient({ baseUrl: requireEnv('INSFORGE_BASE_URL'), apiKey: requireEnv('API_KEY') });
  const savedQuestions = await admin.database.from('questions').insert(rows.map((r) => r.question));
  if (savedQuestions.error) { console.error(`${FUNCTION_SLUG}: questions save failed`); return refund({ error: 'save_failed' }, 500); }
  const savedKeys = await admin.database.from('question_keys').insert(rows.map((r) => r.key));
  if (savedKeys.error) {
    console.error(`${FUNCTION_SLUG}: keys save failed`);
    await admin.database.from('questions').delete().in('id', rows.map((r) => r.question.id as string)); // keys cascade
    return refund({ error: 'save_failed' }, 500);
  }

  let assessmentId = target?.id;
  if (!assessmentId) {
    const assessment = await db.from('assessments').insert([{ kind: 'practice', chapter_id: chapter.id, language }]).select('id');
    assessmentId = (assessment.data as { id: string }[] | null)?.[0]?.id;
    // Fails for accounts without a students row (only students take quizzes).
    if (assessment.error || !assessmentId) return refund({ error: 'assessment_failed' }, 403);
  }
  // Batch b fills positions b*5+1 .. b*5+5: parallel batches never collide.
  const offset = body.batch * MAX_QUESTIONS;
  const links = await db.from('assessment_questions').insert(rows.map((r, i) => ({ assessment_id: assessmentId, question_id: r.question.id, position: offset + i + 1, marks: 1 })));
  if (links.error) {
    console.error(`${FUNCTION_SLUG}: assessment questions save failed`);
    // Only delete an assessment this call created; a shared one keeps its other batches.
    if (!target) await db.from('assessments').delete().eq('id', assessmentId);
    return refund({ error: 'assessment_failed' }, 500);
  }

  // Fewer questions than asked for (some failed a check): give back the unserved share.
  let balancePaise = charge.balancePaise;
  if (rows.length < count) {
    balancePaise = await refundCharge(charge, Math.floor((charge.pricePaise * (count - rows.length)) / count));
  }

  return json({
    assessmentId,
    chapter: { id: chapter.id, number: chapter.number, title: chapter.title_en, subject: chapter.subject_code },
    language,
    batch: body.batch,
    requested: count,
    // Fewer than requested is normal: questions that fail a check are dropped, never served.
    questions: rows.map((r, i) => publicQuestion(r.question, offset + i + 1, 1)),
    dropped: result.dropped.length,
    balancePaise,
  });
});
