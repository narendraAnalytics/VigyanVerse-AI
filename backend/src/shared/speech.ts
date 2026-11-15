// Sarvam speech (Phase 6d): Saaras v4 speech-to-text and Bulbul v4 Flash text-to-speech.
// Plain REST (not OpenAI-compatible): the models registry is for chat models only.
// Docs checked 2026-11-15: POST /speech-to-text (multipart, clips < 30 s), POST /text-to-speech
// (JSON, <= 2500 chars, base64 `audios`). Audio is NEVER stored: it goes to Sarvam and the text
// comes back (or the reverse). Costs go to model_usage like every other AI call.
import { readEnv, requireEnv } from './env.ts';
import { SCIENCE_KEYTERMS, validKeyterms } from './keyterms.ts';

const BASE = readEnv('SARVAM_SPEECH_BASE_URL') ?? 'https://api.sarvam.ai';
export const STT_MODEL = 'saaras:v4';
export const TTS_MODEL = 'bulbul:v4-flash';

/** INR, excluding GST, pay-as-you-go (docs.sarvam.ai pricing page, checked 2026-11-15). Recheck before budgeting. */
export const STT_INR_PER_MINUTE = 0.49;
export const TTS_INR_PER_1000_CHARS = 1.0;

export const MAX_AUDIO_SECONDS = 30;
export const MAX_AUDIO_BYTES = 1_000_000;
/** One spoken tutor answer. 600 chars is about Rs 0.60: answers are short by the owner's rule. */
export const MAX_SPEAK_CHARS = 600;
export const MAX_TRANSCRIPT_CHARS = 600;

export type SpeechLanguage = 'en' | 'te' | 'auto';

export const STT_LANGUAGE_CODE: Record<SpeechLanguage, string> = { en: 'en-IN', te: 'te-IN', auto: 'unknown' };
export const TTS_LANGUAGE_CODE = { en: 'en-IN', te: 'te-IN' } as const;
/**
 * Default persona voices from the Bulbul v4 Flash catalog (docs voices page; the page labels no gender,
 * these are female-named voices). Each voice is tied to one language. Change them WITHOUT a code change
 * with the secrets TTS_SPEAKER_EN / TTS_SPEAKER_TE (a speaker id such as simran_en_edtech).
 */
export const TTS_SPEAKER = { en: 'aparna_en_edtech', te: 'kavitha_te_conversation' } as const;
const SPEAKER_ID = /^[a-z]+_[a-z]+_[a-z_]+$/;
export function speakerFor(language: 'en' | 'te'): string {
  const chosen = readEnv(language === 'en' ? 'TTS_SPEAKER_EN' : 'TTS_SPEAKER_TE');
  return chosen && SPEAKER_ID.test(chosen) ? chosen : TTS_SPEAKER[language];
}

/** Audio types Saaras accepts (extension used for the multipart file name). */
export const AUDIO_TYPES: Record<string, string> = {
  'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/webm': 'webm',
  'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/aac': 'aac', 'audio/flac': 'flac',
};

export const sttCostInr = (seconds: number) => (Math.max(0, seconds) / 60) * STT_INR_PER_MINUTE;
export const ttsCostInr = (chars: number) => (Math.max(0, chars) / 1000) * TTS_INR_PER_1000_CHARS;

export type FetchFn = typeof fetch;

export interface Transcription { transcript: string; languageCode: string | null; latencyMs: number; costInr: number }
export interface Speech { audioBase64: string; mime: string; chars: number; latencyMs: number; costInr: number }

/** Decode base64 to bytes (the data URL prefix, if any, is removed). Returns null for invalid input. */
export function decodeBase64(b64: string): Uint8Array | null {
  const clean = b64.replace(/^data:[^,]*,/, '').replace(/\s+/g, '');
  if (!clean || clean.length % 4 === 1 || !/^[A-Za-z0-9+/]*={0,2}$/.test(clean)) return null;
  try {
    const bin = atob(clean);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

/** Text for the speaker: no markdown or citation marks, one line, cut at a sentence end if too long. */
export function speakableText(text: string, max = MAX_SPEAK_CHARS): string {
  const clean = text
    .replace(/[`*_#>]+/g, '')
    .replace(/\[\s*\d+(?:\s*,\s*\d+)*\s*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '), cut.lastIndexOf('।'));
  return end > max * 0.4 ? cut.slice(0, end + 1) : cut;
}

/** One retry after a short pause on 503 (seen once 2026-11-15: model briefly unavailable, fine on retry). */
async function post(fetchFn: FetchFn, url: string, init: () => RequestInit): Promise<Response> {
  const res = await fetchFn(url, init());
  if (res.status !== 503) return res;
  await new Promise((r) => setTimeout(r, 600));
  return fetchFn(url, init());
}

async function sarvamError(res: Response): Promise<Error> {
  let code = '';
  try {
    const body = (await res.json()) as { error?: { code?: string; message?: string } };
    code = body.error?.code ?? '';
  } catch { /* not JSON */ }
  return new Error(`sarvam speech HTTP ${res.status}${code ? ` ${code}` : ''}`);
}

export async function transcribe(
  audio: Uint8Array, mime: string, language: SpeechLanguage, seconds: number,
  opts: { fetchFn?: FetchFn; timeoutMs?: number; keyterms?: readonly string[] | null } = {},
): Promise<Transcription> {
  const ext = AUDIO_TYPES[mime] ?? 'wav';
  const form = new FormData();
  form.append('file', new Blob([audio.slice().buffer as ArrayBuffer], { type: mime }), `speech.${ext}`);
  form.append('model', STT_MODEL);
  form.append('language_code', STT_LANGUAGE_CODE[language]);
  // Class 10 Science words bias recognition (saaras:v4 only). English-only speech does not need them.
  const keyterms = validKeyterms(opts.keyterms === undefined ? (language === 'en' ? [] : SCIENCE_KEYTERMS) : (opts.keyterms ?? []));
  if (keyterms.length) form.append('keyterms', JSON.stringify(keyterms));
  const t0 = Date.now();
  const res = await post(opts.fetchFn ?? fetch, `${BASE}/speech-to-text`, () => ({
    method: 'POST', headers: { 'api-subscription-key': requireEnv('SARVAM_API_KEY') }, body: form,
    signal: AbortSignal.timeout(opts.timeoutMs ?? 10_000),
  }));
  if (!res.ok) throw await sarvamError(res);
  const body = (await res.json()) as { transcript?: string; language_code?: string | null };
  return {
    transcript: (body.transcript ?? '').trim().slice(0, MAX_TRANSCRIPT_CHARS),
    languageCode: body.language_code ?? null,
    latencyMs: Date.now() - t0,
    costInr: sttCostInr(seconds),
  };
}

export async function speak(
  text: string, language: 'en' | 'te',
  opts: { fetchFn?: FetchFn; timeoutMs?: number } = {},
): Promise<Speech> {
  const t0 = Date.now();
  const res = await post(opts.fetchFn ?? fetch, `${BASE}/text-to-speech`, () => ({
    method: 'POST',
    headers: { 'api-subscription-key': requireEnv('SARVAM_API_KEY'), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text, language_code: TTS_LANGUAGE_CODE[language], speaker: speakerFor(language), model: TTS_MODEL,
      pace: 1.0, output_audio_codec: 'mp3', speech_sample_rate: 22050,
    }),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 10_000),
  }));
  if (!res.ok) throw await sarvamError(res);
  const body = (await res.json()) as { audios?: string[] };
  const audioBase64 = body.audios?.[0];
  if (!audioBase64) throw new Error('sarvam speech: no audio returned');
  return { audioBase64, mime: 'audio/mpeg', chars: text.length, latencyMs: Date.now() - t0, costInr: ttsCostInr(text.length) };
}
