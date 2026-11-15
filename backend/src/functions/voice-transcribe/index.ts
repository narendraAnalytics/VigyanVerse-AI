// Edge Function: speech to text (Phase 6d). Saaras v4.
// POST { audioBase64, mime, seconds, language?: 'en' | 'te' | 'auto' }  (clip <= 30 s, <= 1 MB)
//
//   authenticate -> zod -> consent (voice_recording) -> limit (reserve_ai_call) -> size / type
//   checks -> Saaras -> { transcript, languageCode }.
// The audio is NEVER stored or logged: it is sent to Sarvam and dropped. The frontend then sends
// the transcript to tutor-chat like typed text (same router, retrieval, consent and limits), and
// can read the answer aloud with voice-speak.
import { z } from 'zod';
import { authenticate, json, preflight } from '../../shared/http.ts';
import { AUDIO_TYPES, decodeBase64, MAX_AUDIO_BYTES, MAX_AUDIO_SECONDS, STT_MODEL, transcribe } from '../../shared/speech.ts';

const FUNCTION_SLUG = 'voice-transcribe';
const MAX_PER_MINUTE = 6;
const MAX_PER_DAY = 100;
const MAX_COST_INR_PER_DAY = 10;

const Body = z.object({
  // base64 of <= 1 MB is about 1.4 M characters
  audioBase64: z.string().min(100).max(1_400_000),
  mime: z.string().refine((m) => m in AUDIO_TYPES, 'unsupported audio type'),
  seconds: z.number().min(0.3).max(MAX_AUDIO_SECONDS),
  language: z.enum(['en', 'te', 'auto']).default('auto'),
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

  const consent = await db.rpc('has_consent', { p_student: user.userId, p_consent_type: 'voice_recording' });
  if (consent.error) return json({ error: 'consent_check_failed' }, 500);
  if (consent.data !== true) return json({ error: 'consent_required', consent: 'voice_recording' }, 403);

  const audio = decodeBase64(body.audioBase64);
  if (!audio || audio.length === 0) return json({ error: 'Invalid request', message: 'audio is not valid base64' }, 400);
  if (audio.length > MAX_AUDIO_BYTES) return json({ error: 'audio_too_large' }, 413);

  const reserved = await db.rpc('reserve_ai_call', {
    p_agent: 'voice_request', p_function: FUNCTION_SLUG,
    p_max_per_minute: MAX_PER_MINUTE, p_max_per_day: MAX_PER_DAY, p_max_cost_inr: MAX_COST_INR_PER_DAY,
  });
  if (reserved.error) return json({ error: 'usage_failed' }, 500);
  if (reserved.data === 'slow_down' || reserved.data === 'daily_limit') return json({ error: reserved.data }, 429);
  if (reserved.data !== 'ok') return json({ error: 'usage_failed' }, 500);

  let result: Awaited<ReturnType<typeof transcribe>>;
  try {
    result = await transcribe(audio, body.mime, body.language, body.seconds);
  } catch (e) {
    console.error(`${FUNCTION_SLUG}: ${e instanceof Error ? e.message : 'failed'}`);
    return json({ error: 'try_again' }, 503);
  }

  // Cost / latency only: never the audio or the transcript.
  const usage = await db.from('model_usage').insert([{
    function_slug: FUNCTION_SLUG, agent: 'stt', model: STT_MODEL, input_tokens: 0, output_tokens: 0,
    cost_inr: Number(result.costInr.toFixed(5)), latency_ms: result.latencyMs, used_fallback: false,
  }]);
  if (usage.error) console.error(`${FUNCTION_SLUG}: usage save failed`);

  if (!result.transcript) return json({ error: 'no_speech' }, 422);
  return json({ transcript: result.transcript, languageCode: result.languageCode });
}
