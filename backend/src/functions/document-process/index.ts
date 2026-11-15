// Edge Function: read an uploaded image with the vision model (Phase 6c).
// POST { documentId }
//
//   authenticate -> zod -> consent (document_upload + ai_tutoring) -> the student's own
//   registered document (RLS) -> limit (reserve_ai_call) -> claim it ('processing', admin client,
//   so two parallel calls cannot both run) -> download the image AS THE STUDENT (storage RLS:
//   only their own folder) -> size + file-signature checks -> Document Intelligence agent
//   (Gemma 4) -> admin client saves the text / confidence / review flag, or marks it 'failed'.
//
// The student never writes the extracted text: only this function does. The image itself is
// never logged; only counts and costs go to model_usage.
import { createAdminClient } from '@insforge/sdk';
import { z } from 'zod';
import { runDocumentReader } from '../../agents/document.ts';
import { authenticate, json, preflight } from '../../shared/http.ts';
import { requireEnv } from '../../shared/env.ts';
import { signatureMatches, toBase64 } from '../../shared/image.ts';

const FUNCTION_SLUG = 'document-process';
const MAX_PER_MINUTE = 3;
const MAX_PER_DAY = 40;
const MAX_COST_INR_PER_DAY = 10;
const MAX_BYTES = 4 * 1024 * 1024;
const STALE_MS = 120_000;

const Body = z.object({ documentId: z.string().uuid() });

interface DocRow {
  id: string; storage_key: string; mime: string; size_bytes: number; status: string;
  kind: 'notes' | 'textbook_page' | 'diagram' | 'question_paper' | 'other';
  processed_at: string | null;
}

export default async function (req: Request): Promise<Response> {
  const early = preflight(req);
  if (early) return early;
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const user = await authenticate(req);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: 'Invalid request', issues: parsed.error.issues }, 400);
  const db = user.client.database;

  // 1. Parent consent: storing the document AND reading it with AI.
  for (const type of ['document_upload', 'ai_tutoring']) {
    const consent = await db.rpc('has_consent', { p_student: user.userId, p_consent_type: type });
    if (consent.error) return json({ error: 'consent_check_failed' }, 500);
    if (consent.data !== true) return json({ error: 'consent_required', consent: type }, 403);
  }

  // 2. The student's own document (RLS), not already read.
  const docRes = await db.from('uploaded_documents').select('id, storage_key, mime, size_bytes, kind, status, processed_at').eq('id', parsed.data.documentId).limit(1);
  if (docRes.error) return json({ error: 'document_failed' }, 500);
  const doc = (docRes.data as DocRow[] | null)?.[0];
  if (!doc) return json({ error: 'document_not_found' }, 404);
  if (doc.status === 'ready') return json({ error: 'already_processed' }, 409);
  // A run that died (30 s limit) leaves 'processing' behind: after 2 minutes it may be retried.
  const stale = doc.status === 'processing' && (!doc.processed_at || Date.now() - Date.parse(doc.processed_at) > STALE_MS);
  if (doc.status === 'processing' && !stale) return json({ error: 'in_progress' }, 409);
  // Defence in depth on top of the table CHECK: the key must be inside the student's own folder.
  if (!doc.storage_key.startsWith(`${user.userId}/`) || doc.storage_key.split('/').some((p) => p === '..' || p === '.')) {
    return json({ error: 'document_not_found' }, 404);
  }

  // 3. Limits, before any AI work.
  const reserved = await db.rpc('reserve_ai_call', {
    p_agent: 'document_request', p_function: FUNCTION_SLUG,
    p_max_per_minute: MAX_PER_MINUTE, p_max_per_day: MAX_PER_DAY, p_max_cost_inr: MAX_COST_INR_PER_DAY,
  });
  if (reserved.error) return json({ error: 'usage_failed' }, 500);
  if (reserved.data === 'slow_down' || reserved.data === 'daily_limit') return json({ error: reserved.data }, 429);
  if (reserved.data !== 'ok') return json({ error: 'usage_failed' }, 500);

  // 4. Claim it (one reader at a time). Only this function can change status/text (admin client).
  const admin = createAdminClient({ baseUrl: requireEnv('INSFORGE_BASE_URL'), apiKey: requireEnv('API_KEY') });
  // Compare-and-set on (status, processed_at): of two parallel calls only one can match.
  const base = admin.database.from('uploaded_documents').update({ status: 'processing', processed_at: new Date().toISOString() })
    .eq('id', doc.id).eq('owner_id', user.userId).eq('status', doc.status);
  const claim = await (doc.processed_at ? base.eq('processed_at', doc.processed_at) : base.is('processed_at', null)).select('id');
  if (claim.error) return json({ error: 'document_failed' }, 500);
  if (!(claim.data as unknown[] | null)?.length) return json({ error: 'in_progress' }, 409);

  const fail = async (code: string, status = 422) => {
    await admin.database.from('uploaded_documents').update({ status: 'failed', error: code, processed_at: new Date().toISOString() }).eq('id', doc.id);
    return json({ error: code }, status);
  };

  // 5. Download as the student (storage RLS), then check size and signature.
  const file = await user.client.storage.from('student-uploads').download(doc.storage_key);
  if (file.error || !file.data) return fail('file_not_found', 404);
  const bytes = new Uint8Array(await file.data.arrayBuffer());
  if (bytes.length > MAX_BYTES) return fail('file_too_large');
  if (!signatureMatches(doc.mime, bytes)) return fail('file_type_mismatch');

  // 6. Read it.
  const run = await runDocumentReader({ imageDataUrl: `data:${doc.mime};base64,${toBase64(bytes)}`, kind: doc.kind });
  if (run.usage) {
    const usage = await db.from('model_usage').insert([{
      function_slug: FUNCTION_SLUG, agent: 'document', model: run.usage.model ?? null,
      input_tokens: run.usage.inputTokens ?? 0, output_tokens: run.usage.outputTokens ?? 0, reasoning_tokens: run.usage.reasoningTokens ?? null,
      cost_inr: Number((run.usage.costInr ?? 0).toFixed(5)), latency_ms: Math.round(run.usage.latencyMs ?? 0),
      used_fallback: run.source === 'fallback', error: run.error ? run.error.slice(0, 200) : null,
    }]);
    if (usage.error) console.error(`${FUNCTION_SLUG}: usage save failed`);
  }
  if (!run.output) return fail('read_failed', 502);

  const r = run.output;
  const saved = await admin.database.from('uploaded_documents').update({
    status: 'ready', extracted_text: r.extractedText, ocr_confidence: r.confidence, needs_review: r.needsReview,
    uncertain: r.uncertain, error: null, processed_at: new Date().toISOString(),
  }).eq('id', doc.id);
  if (saved.error) {
    console.error(`${FUNCTION_SLUG}: save failed`);
    return fail('save_failed', 500);
  }

  return json({ documentId: doc.id, status: 'ready', text: r.extractedText, confidence: r.confidence, needsReview: r.needsReview, uncertain: r.uncertain });
}
