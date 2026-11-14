// Edge Function: submit and grade a quiz (Phase 4d).
// POST { assessmentId, answers: [{ questionId, selectedIndex? (MCQ 0-3) | answerText? (numeric) }] }
//
//   authenticate -> zod -> consent (ai_tutoring) -> the student's own OPEN assessment and its
//   questions (RLS) -> answer keys (admin client: no student can read them) -> CODE grades
//   -> Mistake Classification agent (GLM) words feedback for the wrong answers
//   -> finalize_assessment() saves answers + results + score in one transaction (admin client)
//   -> returns marks, per-question feedback, and now the right answers.
//
// One submission per assessment (the database refuses a second one), so no separate request
// limit: quizzes themselves are limited by reserve_quiz in quiz-generate.
import { createAdminClient } from '@insforge/sdk';
import { z } from 'zod';
import { evaluateSubmission, MAX_ANSWERS, answerProblem, type EvalQuestion } from '../../agents/evaluate.ts';
import { authenticate, json, preflight } from '../../shared/http.ts';
import { requireEnv } from '../../shared/env.ts';

const FUNCTION_SLUG = 'answer-evaluate';
/** Edge Functions stop at 30 s: grading + one GLM call gets 25 s, saving the rest. */
const BUDGET_MS = 25_000;

const Body = z.object({
  assessmentId: z.string().uuid(),
  answers: z.array(z.object({
    questionId: z.string().uuid(),
    selectedIndex: z.number().int().min(0).max(3).optional(),
    answerText: z.string().trim().min(1).max(200).optional(),
  })).max(MAX_ANSWERS),
});

interface QuestionRow { id: string; type: 'mcq' | 'numeric'; stem: string; options: string[] | null }
interface LinkRow { question_id: string; position: number; marks: number }
interface KeyRow { question_id: string; answer_index: number | null; answer: string; explanation: string; work: { expression?: string } | null }

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

  // 1. A linked parent must have allowed AI features (the feedback is AI-written).
  const consent = await db.rpc('has_consent', { p_student: user.userId, p_consent_type: 'ai_tutoring' });
  if (consent.error) return json({ error: 'consent_check_failed' }, 500);
  if (consent.data !== true) return json({ error: 'consent_required' }, 403);

  // 2. The student's own assessment (RLS) must still be open.
  const assessmentRes = await db.from('assessments').select('id, language, submitted_at').eq('id', body.assessmentId).limit(1);
  if (assessmentRes.error) return json({ error: 'assessment_failed' }, 500);
  const assessment = (assessmentRes.data as { id: string; language: 'en' | 'te'; submitted_at: string | null }[] | null)?.[0];
  if (!assessment) return json({ error: 'assessment_not_found' }, 404);
  if (assessment.submitted_at) return json({ error: 'already_submitted' }, 409);

  // 3. Its questions (non-secret columns, RLS) and the keys (admin client, only after the checks above).
  const links = await db.from('assessment_questions').select('question_id, position, marks').eq('assessment_id', assessment.id);
  if (links.error) return json({ error: 'questions_failed' }, 500);
  const linkRows = (links.data as LinkRow[] | null) ?? [];
  if (!linkRows.length) return json({ error: 'assessment_empty' }, 422);
  const ids = linkRows.map((l) => l.question_id);
  const questionsRes = await db.from('questions').select('id, type, stem, options').in('id', ids);
  if (questionsRes.error) return json({ error: 'questions_failed' }, 500);
  const admin = createAdminClient({ baseUrl: requireEnv('INSFORGE_BASE_URL'), apiKey: requireEnv('API_KEY') });
  const keysRes = await admin.database.from('question_keys').select('question_id, answer_index, answer, explanation, work').in('question_id', ids);
  if (keysRes.error) return json({ error: 'questions_failed' }, 500);

  const questionById = new Map(((questionsRes.data as QuestionRow[] | null) ?? []).map((q) => [q.id, q]));
  const keyById = new Map(((keysRes.data as KeyRow[] | null) ?? []).map((k) => [k.question_id, k]));
  const questions: EvalQuestion[] = [];
  for (const l of linkRows) {
    const q = questionById.get(l.question_id);
    const k = keyById.get(l.question_id);
    if (!q || !k) { console.error(`${FUNCTION_SLUG}: question or key missing for assessment ${assessment.id}`); return json({ error: 'questions_failed' }, 500); }
    questions.push({
      id: q.id, position: l.position, marks: l.marks, type: q.type, stem: q.stem, options: q.options,
      key: { answerIndex: k.answer_index, answer: k.answer, explanation: k.explanation, work: k.work?.expression ? { expression: k.work.expression } : null },
    });
  }

  // 4. The answers must match this assessment: known questions, one answer each, right shape.
  const seen = new Set<string>();
  for (const a of body.answers) {
    const q = questions.find((x) => x.id === a.questionId);
    if (!q) return json({ error: 'Invalid request', message: 'answer for a question that is not in this assessment' }, 400);
    if (seen.has(a.questionId)) return json({ error: 'Invalid request', message: 'two answers for one question' }, 400);
    seen.add(a.questionId);
    const problem = answerProblem(q, a);
    if (problem) return json({ error: 'Invalid request', message: problem }, 400);
  }

  // 5. Grade (code) + explain (GLM, only for wrong answers, only if there is time).
  let evaluation: Awaited<ReturnType<typeof evaluateSubmission>>;
  try {
    evaluation = await evaluateSubmission(questions, body.answers, assessment.language, { timeLeft: () => BUDGET_MS - (Date.now() - started) });
  } catch (e) {
    console.error(`${FUNCTION_SLUG}: evaluation failed: ${e instanceof Error ? e.message.slice(0, 200) : 'unknown'}`);
    return json({ error: 'evaluation_failed' }, 500);
  }

  // 6. Save everything in one transaction. A second submission is refused by the database.
  const saved = await admin.database.rpc('finalize_assessment', {
    p_assessment: assessment.id, p_student: user.userId,
    p_results: evaluation.results.filter((r) => r.answered).map((r) => ({
      question_id: r.questionId, selected_index: r.selectedIndex, answer_text: r.answerText, is_correct: r.isCorrect,
      marks_awarded: r.marksAwarded, error_type: r.errorType, feedback: r.feedback ? r.feedback.slice(0, 800) : null, model: evaluation.model,
    })),
  });
  if (saved.error) {
    const message = JSON.stringify(saved.error);
    if (message.includes('already_submitted')) return json({ error: 'already_submitted' }, 409);
    console.error(`${FUNCTION_SLUG}: finalize failed for assessment ${assessment.id}`);
    return json({ error: 'save_failed' }, 500);
  }

  // Cost / latency / errors per model call (counts only, no student text).
  if (evaluation.usage.length) {
    const usage = await db.from('model_usage').insert(evaluation.usage.map((u) => ({
      function_slug: FUNCTION_SLUG, agent: u.agent, model: u.model ?? null,
      input_tokens: u.inputTokens ?? 0, output_tokens: u.outputTokens ?? 0, reasoning_tokens: u.reasoningTokens ?? null,
      cost_inr: Number((u.costInr ?? 0).toFixed(5)), latency_ms: Math.round(u.latencyMs ?? 0), used_fallback: u.usedFallback, error: u.error ?? null,
    })));
    if (usage.error) console.error(`${FUNCTION_SLUG}: usage save failed`);
  }

  return json({
    assessmentId: assessment.id,
    score: evaluation.score,
    maxScore: evaluation.maxScore,
    results: evaluation.results.map((r) => ({
      questionId: r.questionId, position: r.position, answered: r.answered, isCorrect: r.isCorrect, marks: r.marksAwarded,
      errorType: r.errorType, feedback: r.isCorrect ? null : r.feedback, correctAnswer: r.correctAnswer, explanation: r.explanation,
    })),
  });
}
