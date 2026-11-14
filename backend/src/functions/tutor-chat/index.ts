// Edge Function: one student chat turn (Phase 3g).
// POST { message, conversationId?, mode?: 'tutor' | 'socratic', subject?, newTopic? }
//
//   authenticate -> zod -> consent (ai_tutoring) -> rate limit + daily budget
//   -> load / create conversation + recent turns -> LangGraph turn (src/agents/graph.ts)
//   -> save both messages, Socratic state and one model_usage row per model call
//
// Everything runs AS THE STUDENT (user-scoped client): RLS keeps each student's chats private.
// The student's identity comes only from the session token, never from the body.
import { z } from 'zod';
import { runTurn, type UsageRow } from '../../agents/graph.ts';
import { retrieveContext } from '../../agents/retrieval.ts';
import { SUBJECTS } from '../../agents/router.ts';
import type { Turn } from '../../agents/tutor.ts';
import { authenticate, json, preflight } from '../../shared/http.ts';

const FUNCTION_SLUG = 'tutor-chat';
/** Edge Functions stop at 30 s: the AI part gets 26 s, the rest is auth and saving. */
const TURN_BUDGET_MS = 26_000;
/**
 * Limits count append-only "turn" rows in model_usage, written BEFORE any AI work (fail
 * closed; security review 2026-11-14). ~Rs 0.04 per turn -> about Rs 4 per student per day at
 * the daily limit. Owner to confirm the numbers.
 */
const MAX_TURNS_PER_DAY = 100;
const MAX_TURNS_PER_MINUTE = 6;
const HISTORY_MESSAGES = 8;

const Body = z.object({
  message: z.string().trim().min(1).max(1500),
  conversationId: z.string().uuid().optional(),
  mode: z.enum(['tutor', 'socratic']).optional(),
  subject: z.enum(SUBJECTS).optional(),
  /** Socratic mode: drop the open question and start a new one. */
  newTopic: z.boolean().optional(),
});

interface ConversationRow { id: string; mode: 'tutor' | 'socratic'; subject_code: string | null; socratic_topic: string | null; socratic_hints: number }
const CONVERSATION_COLUMNS = 'id, mode, subject_code, socratic_topic, socratic_hints';

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

  // 1. A linked parent must have allowed AI tutoring.
  const consent = await db.rpc('has_consent', { p_student: user.userId, p_consent_type: 'ai_tutoring' });
  if (consent.error) return json({ error: 'consent_check_failed' }, 500);
  if (consent.data !== true) return json({ error: 'consent_required' }, 403);

  // 2. Rate limit and daily budget.
  const usage = await db.rpc('ai_usage_status', {});
  if (usage.error) return json({ error: 'usage_check_failed' }, 500);
  const status = (Array.isArray(usage.data) ? usage.data[0] : usage.data) as { turns_last_minute: number; turns_today: number } | undefined;
  if ((status?.turns_last_minute ?? 0) >= MAX_TURNS_PER_MINUTE) return json({ error: 'slow_down' }, 429);
  if ((status?.turns_today ?? 0) >= MAX_TURNS_PER_DAY) return json({ error: 'daily_limit' }, 429);

  // 3. The conversation (RLS: only the student's own) and its recent turns.
  let conversation: ConversationRow;
  if (body.conversationId) {
    const { data, error } = await db.from('conversations').select(CONVERSATION_COLUMNS).eq('id', body.conversationId).limit(1);
    if (error) return json({ error: 'conversation_failed' }, 500);
    if (!(data as ConversationRow[] | null)?.length) return json({ error: 'conversation_not_found' }, 404);
    conversation = (data as ConversationRow[])[0];
  } else {
    const { data, error } = await db.from('conversations')
      .insert([{ mode: body.mode ?? 'tutor', subject_code: body.subject ?? null, title: body.message.slice(0, 80) }])
      .select(CONVERSATION_COLUMNS);
    // Fails for accounts without a students row (only students chat).
    if (error || !(data as ConversationRow[] | null)?.length) return json({ error: 'conversation_failed' }, 403);
    conversation = (data as ConversationRow[])[0];
  }
  const mode = body.mode ?? conversation.mode;
  const socratic = mode === 'socratic' && !body.newTopic
    ? { topic: conversation.socratic_topic, hints: conversation.socratic_hints }
    : { topic: null, hints: 0 };

  const recent = await db.from('messages').select('role, content').eq('conversation_id', conversation.id)
    .order('id', { ascending: false }).limit(HISTORY_MESSAGES);
  const history: Turn[] = ((recent.data as { role: Turn['role']; content: string }[] | null) ?? [])
    .reverse().map((m) => ({ role: m.role, text: m.content }));

  // Count the turn BEFORE any AI work: no turn row, no AI (fail closed).
  const reserved = await db.from('model_usage').insert([{ function_slug: FUNCTION_SLUG, agent: 'turn', conversation_id: conversation.id }]);
  if (reserved.error) return json({ error: 'usage_failed' }, 500);

  // 4. The turn (LangGraph): router -> fixed reply | retrieval -> tutor | socratic | math.
  let turn: Awaited<ReturnType<typeof runTurn>>;
  try {
    turn = await runTurn(
      { message: body.message, mode, subject: body.subject ?? (conversation.subject_code as (typeof SUBJECTS)[number] | null) ?? undefined, history, socratic },
      { retrieve: (input) => retrieveContext(user.client, input), timeLeft: () => TURN_BUDGET_MS - (Date.now() - started) },
    );
  } catch (e) {
    console.error(`${FUNCTION_SLUG}: turn failed: ${e instanceof Error ? e.message.slice(0, 200) : 'unknown'}`);
    return json({ error: 'tutor_failed' }, 500);
  }

  // 5. Save. The student still gets the answer if saving fails (logged, flagged in the reply).
  const usageRows = turn.usage.map((u: UsageRow) => ({
    conversation_id: conversation.id, function_slug: FUNCTION_SLUG, agent: u.agent, model: u.model ?? null,
    input_tokens: u.inputTokens ?? 0, output_tokens: u.outputTokens ?? 0, reasoning_tokens: u.reasoningTokens ?? null,
    cost_inr: Number((u.costInr ?? 0).toFixed(5)), latency_ms: Math.round(u.latencyMs ?? 0), used_fallback: u.usedFallback,
    error: u.error ?? null,
  }));
  const writes = await Promise.all([
    db.from('messages').insert([
      { conversation_id: conversation.id, role: 'student', content: body.message },
      { conversation_id: conversation.id, role: 'tutor', content: turn.reply.slice(0, 6000), agent: turn.agent, citations: turn.citations, meta: { ...turn.meta, label: turn.label, related: turn.related } },
    ]),
    db.from('conversations').update({ mode, language: turn.language, socratic_topic: turn.socratic.topic, socratic_hints: turn.socratic.hints }).eq('id', conversation.id),
    usageRows.length ? db.from('model_usage').insert(usageRows) : Promise.resolve({ error: null }),
  ]);
  const saveErrors = writes.filter((w) => w.error).length;
  // Logs carry no conversation text (child-data rule): counts and ids only.
  if (saveErrors) console.error(`${FUNCTION_SLUG}: ${saveErrors} save(s) failed for conversation ${conversation.id}`);

  return json({
    conversationId: conversation.id,
    reply: turn.reply,
    agent: turn.agent,
    language: turn.language,
    citations: turn.citations,
    label: turn.label,
    related: turn.related,
    meta: turn.meta,
    mode,
    socraticOpen: turn.socratic.topic !== null,
    saved: saveErrors === 0,
  });
}
