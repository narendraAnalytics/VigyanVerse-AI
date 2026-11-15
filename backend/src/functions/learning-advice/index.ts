// Edge Function: what should I practise next? (Phase 5d)
// POST { language?: 'en' | 'te' }
//
//   authenticate -> zod -> next_activity() (SQL, RLS: the caller's own data; CODE decides)
//   -> GLM words it in 1-2 sentences (agents/advice.ts), checked by code, with a fixed template
//   as the fallback -> returns the activity + message.
//
// It always answers. The model is skipped (template sentence, no cost) when the parent has not
// allowed AI features (consent ai_tutoring), when the student hit the per-minute / daily-cost
// limits, or when the model fails the checks. No student text is sent to the model: only the
// chapter title, level, score and mistake-type names.
import { z } from 'zod';
import { NextActivity, runAdvice, templateMessage } from '../../agents/advice.ts';
import { authenticate, json, preflight } from '../../shared/http.ts';

const FUNCTION_SLUG = 'learning-advice';
const MAX_PER_MINUTE = 3;
const MAX_COST_INR_PER_DAY = 10;

const Body = z.object({ language: z.enum(['en', 'te']).default('en') });

export default async function (req: Request): Promise<Response> {
  const early = preflight(req);
  if (early) return early;
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const user = await authenticate(req);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: 'Invalid request', issues: parsed.error.issues }, 400);
  const { language } = parsed.data;
  const db = user.client.database;

  // 1. Code picks the activity (the student's own data only: identity comes from the token).
  const act = await db.rpc('next_activity', { p_student: null });
  if (act.error) {
    console.error(`${FUNCTION_SLUG}: next_activity failed`);
    return json({ error: 'activity_failed' }, 500);
  }
  const activity = NextActivity.safeParse(act.data);
  if (!activity.success) return json({ error: 'activity_failed' }, 500);

  // 2. Should the model be used? Consent and limits only decide that, never whether we answer.
  let useModel = activity.data.kind !== 'none';
  if (useModel) {
    const consent = await db.rpc('has_consent', { p_student: user.userId, p_consent_type: 'ai_tutoring' });
    if (consent.error || consent.data !== true) useModel = false;
  }
  if (useModel) {
    const status = await db.rpc('ai_usage_status');
    const row = (status.data as { cost_today_inr: number }[] | null)?.[0];
    if (status.error || !row || Number(row.cost_today_inr) >= MAX_COST_INR_PER_DAY) useModel = false;
  }
  if (useModel) {
    const since = new Date(Date.now() - 60_000).toISOString();
    const recent = await db.from('model_usage').select('id').eq('agent', 'advice').gte('created_at', since);
    if (recent.error || (recent.data?.length ?? 0) >= MAX_PER_MINUTE) useModel = false;
  }

  // 3. Words (GLM) or the fixed sentence.
  const a = activity.data;
  if (!useModel) {
    return json(result(a, templateMessage(a, language), 'template'));
  }
  const run = await runAdvice({ activity: a, language });
  if (run.usage) {
    const usage = await db.from('model_usage').insert([{
      function_slug: FUNCTION_SLUG, agent: 'advice', model: run.usage.model ?? null,
      input_tokens: run.usage.inputTokens ?? 0, output_tokens: run.usage.outputTokens ?? 0, reasoning_tokens: run.usage.reasoningTokens ?? null,
      cost_inr: Number((run.usage.costInr ?? 0).toFixed(5)), latency_ms: Math.round(run.usage.latencyMs ?? 0),
      used_fallback: run.source === 'fallback', error: run.error ? run.error.slice(0, 200) : null,
    }]);
    if (usage.error) console.error(`${FUNCTION_SLUG}: usage save failed`);
  }
  return json(result(a, run.output.message, run.source === 'model' ? 'model' : 'template'));
}

function result(a: NextActivity, message: string, messageSource: 'model' | 'template') {
  return {
    kind: a.kind,
    chapter: a.chapter_id ? { id: a.chapter_id, title: a.chapter_title } : null,
    state: a.state, score: a.score, dueCount: a.due_count, dueAt: a.due_at,
    topErrors: a.top_errors.map((e) => ({ errorType: e.error_type, count: e.count })),
    message, messageSource,
  };
}
