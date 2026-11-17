// Edge Function: text to speech (Phase 6d). Bulbul v4 Flash.
// POST { text, language: 'en' | 'te' }  (text <= 600 characters: one short tutor answer)
//
//   authenticate -> zod -> consent (ai_tutoring) -> limit (reserve_ai_call) -> Bulbul
//   -> { audioBase64, mime: 'audio/mpeg' }.
// Nothing is stored. Cost is about Rs 1 per 1,000 characters, so the text is cleaned (no
// markdown or citation marks) and capped; the app speaks the answer, never the citations.
import { z } from 'zod';
import { authenticate, json, preflight } from '../../shared/http.ts';
import { chargeFailed, chargeTask, refundCharge } from '../../shared/wallet.ts';
import { MAX_SPEAK_CHARS, speak, speakableText, TTS_MODEL } from '../../shared/speech.ts';

const FUNCTION_SLUG = 'voice-speak';
const MAX_PER_MINUTE = 6;
const MAX_PER_DAY = 100;
const MAX_COST_INR_PER_DAY = 10;

const Body = z.object({
  text: z.string().trim().min(2).max(2000),
  language: z.enum(['en', 'te']),
});

export default async function (req: Request): Promise<Response> {
  const early = preflight(req);
  if (early) return early;
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const user = await authenticate(req);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: 'Invalid request', issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })) }, 400);
  const body = parsed.data;
  const db = user.client.database;

  const consent = await db.rpc('has_consent', { p_student: user.userId, p_consent_type: 'ai_tutoring' });
  if (consent.error) return json({ error: 'consent_check_failed' }, 500);
  if (consent.data !== true) return json({ error: 'consent_required' }, 403);

  const text = speakableText(body.text, MAX_SPEAK_CHARS);
  if (text.length < 2) return json({ error: 'Invalid request', message: 'nothing to speak' }, 400);

  const reserved = await db.rpc('reserve_ai_call', {
    p_agent: 'voice_request', p_function: FUNCTION_SLUG,
    p_max_per_minute: MAX_PER_MINUTE, p_max_per_day: MAX_PER_DAY, p_max_cost_inr: MAX_COST_INR_PER_DAY,
  });
  if (reserved.error) return json({ error: 'usage_failed' }, 500);
  if (reserved.data === 'slow_down' || reserved.data === 'daily_limit') return json({ error: reserved.data }, 429);
  if (reserved.data !== 'ok') return json({ error: 'usage_failed' }, 500);

  // Pay (Rs 0.50) before the speech model; refunded if it fails.
  const charge = await chargeTask(db, 'voice_read');
  if (!charge.ok) return chargeFailed(charge);

  let result: Awaited<ReturnType<typeof speak>>;
  try {
    result = await speak(text, body.language);
  } catch (e) {
    console.error(`${FUNCTION_SLUG}: ${e instanceof Error ? e.message : 'failed'}`);
    return json({ error: 'try_again', balancePaise: await refundCharge(charge) }, 503);
  }

  const usage = await db.from('model_usage').insert([{
    function_slug: FUNCTION_SLUG, agent: 'tts', model: TTS_MODEL, input_tokens: 0, output_tokens: 0,
    cost_inr: Number(result.costInr.toFixed(5)), latency_ms: result.latencyMs, used_fallback: false,
  }]);
  if (usage.error) console.error(`${FUNCTION_SLUG}: usage save failed`);

  return json({ audioBase64: result.audioBase64, mime: result.mime, chars: result.chars, spokenText: text, balancePaise: charge.balancePaise });
}
