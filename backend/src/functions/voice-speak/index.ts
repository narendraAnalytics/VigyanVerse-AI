// Edge Function: text to speech (Phase 6d). Bulbul v4 Flash.
// POST { text, language: 'en' | 'te', purpose?: 'listen' | 'bindu' }
//   listen (default): Listen, charges voice_read, spoken text <= 600 characters (one short answer).
//   bindu: "Bindu explains" (the app writes the answer on a whiteboard while this audio plays), charges
//   bindu_explain, spoken text <= 900 characters (Bindu's welcome + the answer). Same voice and limits.
//   With `lesson` ({ messageId, title, greeting }: the saved tutor answer it explains) the audio is SAVED
//   (bucket lesson-audio + lesson_audio row, migration lesson-audio) so it can be watched again for free;
//   an already-saved lesson is refused BEFORE any charge (409 lesson_saved: the app loads the saved one).
//
//   authenticate -> zod -> consent (ai_tutoring) -> limit (reserve_ai_call) -> Bulbul
//   -> { audioBase64, mime: 'audio/mpeg' }.
// Nothing is stored. Cost is about Rs 1 per 1,000 characters, so the text is cleaned (no
// markdown or citation marks) and capped; the app speaks the answer, never the citations.
import { z } from 'zod';
import { authenticate, json, preflight, withCors } from '../../shared/http.ts';
import { chargeFailed, chargeTask, refundCharge } from '../../shared/wallet.ts';
import { createAdminClient } from '@insforge/sdk';
import { requireEnv } from '../../shared/env.ts';
import { checkLessonTarget, saveLesson, type LessonDb, type LessonStorage } from '../../shared/lesson-audio.ts';
import { MAX_LESSON_SPEAK_CHARS, MAX_SPEAK_CHARS, speak, speakableText, speakTask, TTS_MODEL } from '../../shared/speech.ts';

const FUNCTION_SLUG = 'voice-speak';
const MAX_PER_MINUTE = 6;
const MAX_PER_DAY = 100;
const MAX_COST_INR_PER_DAY = 10;

const Body = z.object({
  text: z.string().trim().min(2).max(2000),
  language: z.enum(['en', 'te']),
  purpose: z.enum(['listen', 'bindu']).default('listen'),
  lesson: z.object({
    messageId: z.number().int().positive(),
    title: z.string().trim().min(1).max(120),
    greeting: z.string().trim().max(300),
  }).optional(),
});

let adminClient: ReturnType<typeof createAdminClient> | null = null;
const admin = () => (adminClient ??= createAdminClient({ baseUrl: requireEnv('INSFORGE_BASE_URL'), apiKey: requireEnv('API_KEY') }));

export default withCors(async function (req: Request): Promise<Response> {
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

  const text = speakableText(body.text, body.purpose === 'bindu' ? MAX_LESSON_SPEAK_CHARS : MAX_SPEAK_CHARS);
  if (text.length < 2) return json({ error: 'Invalid request', message: 'nothing to speak' }, 400);

  // A lesson to save: the caller's own tutor answer, not saved yet (never charge twice for one answer).
  const lesson = body.purpose === 'bindu' ? body.lesson : undefined;
  if (lesson) {
    const target = await checkLessonTarget(db as unknown as LessonDb, lesson.messageId);
    if (target === 'saved') return json({ error: 'lesson_saved' }, 409);
    if (target === 'not_found') return json({ error: 'Invalid request', message: 'unknown answer' }, 400);
    if (target === 'failed') return json({ error: 'lesson_check_failed' }, 500);
  }

  const reserved = await db.rpc('reserve_ai_call', {
    p_agent: 'voice_request', p_function: FUNCTION_SLUG,
    p_max_per_minute: MAX_PER_MINUTE, p_max_per_day: MAX_PER_DAY, p_max_cost_inr: MAX_COST_INR_PER_DAY,
  });
  if (reserved.error) return json({ error: 'usage_failed' }, 500);
  if (reserved.data === 'slow_down' || reserved.data === 'daily_limit') return json({ error: reserved.data }, 429);
  if (reserved.data !== 'ok') return json({ error: 'usage_failed' }, 500);

  // Pay (task_prices: voice_read or bindu_explain) before the speech model; refunded if it fails.
  const charge = await chargeTask(db, speakTask(body.purpose));
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

  const saved = lesson
    ? await saveLesson(admin() as unknown as { database: LessonDb; storage: LessonStorage }, user.userId, lesson, { base64: result.audioBase64, mime: result.mime, spokenText: text })
    : false;

  return json({ audioBase64: result.audioBase64, mime: result.mime, chars: result.chars, spokenText: text, saved, balancePaise: charge.balancePaise });
});
