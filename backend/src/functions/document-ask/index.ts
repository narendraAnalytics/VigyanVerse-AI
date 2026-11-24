// Edge Function: ask a question about one uploaded document (Phase 6c).
// POST { documentId, question, language?: 'en' | 'te' | 'te_latn', wantsDetail?, title? }
//
//   authenticate -> zod -> consent (ai_tutoring) -> the student's own READY document (RLS)
//   -> limit (reserve_ai_call) -> Document Q&A agent (Sarvam 105B) answers ONLY from the
//   document text. If the document does not answer it, the app says so; it never answers from
//   general knowledge here (that is the tutor chat). Answers are labelled "from your notes".
//   The question and answer are saved into the image's conversation (created on first use, titled
//   "Image: <title>"), so the image keeps its history; tutor-chat "solve it" turns go there too.
import { z } from 'zod';
import { runDocQa } from '../../agents/docqa.ts';
import { authenticate, json, preflight, withCors } from '../../shared/http.ts';
import { chargeFailed, chargeTask, refundCharge } from '../../shared/wallet.ts';
import { findOrCreateImageConversation } from '../../shared/image-conversation.ts';
import { stripPrivateUse } from '../../shared/text.ts';

const FUNCTION_SLUG = 'document-ask';
const MAX_PER_MINUTE = 4;
const MAX_PER_DAY = 40;
const MAX_COST_INR_PER_DAY = 10;

const Body = z.object({
  documentId: z.string().uuid(),
  question: z.string().trim().min(2).max(500),
  language: z.enum(['en', 'te', 'te_latn']).default('en'),
  wantsDetail: z.boolean().default(false),
  /** Title for the image's conversation if this is its first saved question. */
  title: z.string().trim().min(1).max(80).optional(),
});

interface DocRow { id: string; status: string; extracted_text: string | null; needs_review: boolean }

export default withCors(async function (req: Request): Promise<Response> {
  const early = preflight(req);
  if (early) return early;
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const user = await authenticate(req);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: 'Invalid request', issues: parsed.error.issues }, 400);
  const body = parsed.data;
  const db = user.client.database;

  const consent = await db.rpc('has_consent', { p_student: user.userId, p_consent_type: 'ai_tutoring' });
  if (consent.error) return json({ error: 'consent_check_failed' }, 500);
  if (consent.data !== true) return json({ error: 'consent_required' }, 403);

  const docRes = await db.from('uploaded_documents').select('id, status, extracted_text, needs_review').eq('id', body.documentId).limit(1);
  if (docRes.error) return json({ error: 'document_failed' }, 500);
  const doc = (docRes.data as DocRow[] | null)?.[0];
  if (!doc) return json({ error: 'document_not_found' }, 404);
  if (doc.status !== 'ready' || !doc.extracted_text) return json({ error: 'document_not_ready' }, 409);

  const reserved = await db.rpc('reserve_ai_call', {
    p_agent: 'document_request', p_function: FUNCTION_SLUG,
    p_max_per_minute: MAX_PER_MINUTE, p_max_per_day: MAX_PER_DAY, p_max_cost_inr: MAX_COST_INR_PER_DAY,
  });
  if (reserved.error) return json({ error: 'usage_failed' }, 500);
  if (reserved.data === 'slow_down' || reserved.data === 'daily_limit') return json({ error: reserved.data }, 429);
  if (reserved.data !== 'ok') return json({ error: 'usage_failed' }, 500);

  // Pay (Rs 0.50) before the model call; refunded if the model fails.
  const charge = await chargeTask(db, 'photo_question', doc.id);
  if (!charge.ok) return chargeFailed(charge);

  const run = await runDocQa({ question: body.question, language: body.language, documentText: doc.extracted_text, wantsDetail: body.wantsDetail });
  if (run.usage) {
    const usage = await db.from('model_usage').insert([{
      function_slug: FUNCTION_SLUG, agent: 'docqa', model: run.usage.model ?? null,
      input_tokens: run.usage.inputTokens ?? 0, output_tokens: run.usage.outputTokens ?? 0, reasoning_tokens: run.usage.reasoningTokens ?? null,
      cost_inr: Number((run.usage.costInr ?? 0).toFixed(5)), latency_ms: Math.round(run.usage.latencyMs ?? 0),
      used_fallback: run.usage.model !== 'sarvam-105b', error: run.error ? run.error.slice(0, 200) : null,
    }]);
    if (usage.error) console.error(`${FUNCTION_SLUG}: usage save failed`);
  }
  // A model failure is not "not in your notes": ask the student to try again.
  if (run.source === 'fallback') return json({ error: 'try_again', balancePaise: await refundCharge(charge) }, 503);

  // Save the turn into the image's conversation. The student still gets the answer if this fails.
  const label = run.output.found ? 'From your uploaded notes' : null;
  let conversationId: string | null = null;
  let saved = false;
  const conversation = await findOrCreateImageConversation(db, doc.id, body.title);
  if (conversation) {
    conversationId = conversation.id;
    const write = await db.from('messages').insert([
      { conversation_id: conversation.id, role: 'student', content: body.question, agent: null, citations: [], meta: {} },
      { conversation_id: conversation.id, role: 'tutor', content: stripPrivateUse(run.output.answer).slice(0, 6000), agent: 'docqa', citations: [], meta: { label, found: run.output.found } },
    ]);
    saved = !write.error;
    if (!saved) console.error(`${FUNCTION_SLUG}: message save failed for conversation ${conversation.id}`);
    else await db.from('conversations').update({ language: body.language }).eq('id', conversation.id);
  } else {
    console.error(`${FUNCTION_SLUG}: no conversation for document ${doc.id}`);
  }

  return json({
    documentId: doc.id,
    conversationId,
    saved,
    answer: stripPrivateUse(run.output.answer),
    found: run.output.found,
    // The reading may have been uncertain: the app can show a "check the text" hint.
    needsReview: doc.needs_review,
    label,
    balancePaise: charge.balancePaise,
  });
});
