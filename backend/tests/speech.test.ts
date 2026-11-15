import { beforeAll, describe, expect, it } from 'vitest';
import {
  decodeBase64, speak, speakableText, sttCostInr, transcribe, ttsCostInr, MAX_SPEAK_CHARS, STT_MODEL, TTS_MODEL, TTS_SPEAKER, type FetchFn,
} from '../src/shared/speech.ts';

beforeAll(() => { process.env.SARVAM_API_KEY = 'test-key'; });

interface Seen { url: string; init: RequestInit }
function mockFetch(responses: { status: number; body: unknown }[]) {
  const seen: Seen[] = [];
  let i = 0;
  const fetchFn: FetchFn = async (url, init) => {
    seen.push({ url: String(url), init: init as RequestInit });
    const r = responses[Math.min(i++, responses.length - 1)];
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { 'Content-Type': 'application/json' } });
  };
  return { fetchFn, seen };
}

describe('cost', () => {
  it('speech-to-text is per minute, text-to-speech per 1000 characters', () => {
    expect(sttCostInr(30)).toBeCloseTo(0.245, 5);
    expect(sttCostInr(-5)).toBe(0);
    expect(ttsCostInr(200)).toBeCloseTo(0.2, 5);
    expect(ttsCostInr(MAX_SPEAK_CHARS)).toBeCloseTo(0.6, 5);
  });
});

describe('decodeBase64', () => {
  it('decodes plain and data-URL base64', () => {
    const b64 = Buffer.from('hello audio').toString('base64');
    expect(Array.from(decodeBase64(b64)!)).toEqual(Array.from(Buffer.from('hello audio')));
    expect(decodeBase64(`data:audio/wav;base64,${b64}`)).not.toBeNull();
  });
  it('rejects invalid input', () => {
    for (const bad of ['', '***', 'abc$', 'a']) expect(decodeBase64(bad)).toBeNull();
  });
});

describe('speakableText', () => {
  it('removes markdown and citation marks and collapses whitespace', () => {
    expect(speakableText('**Ohm** law:\n V = I R [1, 2]  `ok`')).toBe('Ohm law: V = I R ok');
  });
  it('cuts long text at a sentence end', () => {
    const long = `${'This is a sentence. '.repeat(60)}`;
    const out = speakableText(long, 100);
    expect(out.length).toBeLessThanOrEqual(100);
    expect(out.endsWith('.')).toBe(true);
  });
  it('cuts Telugu text at the Telugu full stop', () => {
    const t = `${'ఇది ఒక వాక్యం।'.repeat(50)}`;
    expect(speakableText(t, 100).endsWith('।')).toBe(true);
  });
});

describe('transcribe', () => {
  it('posts multipart to /speech-to-text with the key, model and language code, and returns the transcript', async () => {
    const { fetchFn, seen } = mockFetch([{ status: 200, body: { transcript: '  కాంతి వక్రీభవనం  ', language_code: 'te-IN' } }]);
    const r = await transcribe(new Uint8Array([1, 2, 3]), 'audio/webm', 'te', 6, { fetchFn });
    expect(seen[0].url).toBe('https://api.sarvam.ai/speech-to-text');
    expect((seen[0].init.headers as Record<string, string>)['api-subscription-key']).toBe('test-key');
    const form = seen[0].init.body as FormData;
    expect(form.get('model')).toBe(STT_MODEL);
    expect(form.get('language_code')).toBe('te-IN');
    expect((form.get('file') as File).name).toBe('speech.webm');
    expect(r).toMatchObject({ transcript: 'కాంతి వక్రీభవనం', languageCode: 'te-IN' });
    expect(r.costInr).toBeCloseTo(0.049, 5);
  });
  it('auto-detect sends "unknown"', async () => {
    const { fetchFn, seen } = mockFetch([{ status: 200, body: { transcript: 'hi', language_code: 'en-IN' } }]);
    await transcribe(new Uint8Array([1]), 'audio/wav', 'auto', 2, { fetchFn });
    expect((seen[0].init.body as FormData).get('language_code')).toBe('unknown');
  });
  it('retries once on 503, then succeeds', async () => {
    const { fetchFn, seen } = mockFetch([{ status: 503, body: { error: { code: 'model_call_error' } } }, { status: 200, body: { transcript: 'ok' } }]);
    const r = await transcribe(new Uint8Array([1]), 'audio/wav', 'en', 2, { fetchFn });
    expect(seen).toHaveLength(2);
    expect(r.transcript).toBe('ok');
  });
  it('throws with the status and code (no key, no audio) on a 4xx', async () => {
    const { fetchFn } = mockFetch([{ status: 429, body: { error: { code: 'rate_limit_exceeded_error', message: 'secret details' } } }]);
    await expect(transcribe(new Uint8Array([1]), 'audio/wav', 'en', 2, { fetchFn })).rejects.toThrow('sarvam speech HTTP 429 rate_limit_exceeded_error');
  });
  it('caps a very long transcript', async () => {
    const { fetchFn } = mockFetch([{ status: 200, body: { transcript: 'x'.repeat(5000) } }]);
    expect((await transcribe(new Uint8Array([1]), 'audio/wav', 'en', 2, { fetchFn })).transcript).toHaveLength(600);
  });
});

describe('speak', () => {
  it('posts JSON with the right voice per language and returns base64 mp3', async () => {
    const { fetchFn, seen } = mockFetch([{ status: 200, body: { audios: ['QUJD'] } }]);
    const r = await speak('Ohm law', 'en', { fetchFn });
    const sent = JSON.parse(String(seen[0].init.body));
    expect(seen[0].url).toBe('https://api.sarvam.ai/text-to-speech');
    expect(sent).toMatchObject({ text: 'Ohm law', language_code: 'en-IN', speaker: TTS_SPEAKER.en, model: TTS_MODEL, output_audio_codec: 'mp3' });
    expect(r).toMatchObject({ audioBase64: 'QUJD', mime: 'audio/mpeg', chars: 7 });
    expect(r.costInr).toBeCloseTo(0.007, 5);
    await speak('నమస్తే', 'te', { fetchFn });
    expect(JSON.parse(String(seen[1].init.body))).toMatchObject({ language_code: 'te-IN', speaker: TTS_SPEAKER.te });
  });
  it('fails when no audio comes back', async () => {
    const { fetchFn } = mockFetch([{ status: 200, body: { audios: [] } }]);
    await expect(speak('hello', 'en', { fetchFn })).rejects.toThrow('no audio');
  });
});

describe('speaker choice', () => {
  it('uses the default female voices, and a valid TTS_SPEAKER_* secret overrides them', async () => {
    delete process.env.TTS_SPEAKER_EN;
    const { speakerFor } = await import('../src/shared/speech.ts');
    expect(speakerFor('en')).toBe('aparna_en_edtech');
    expect(speakerFor('te')).toBe('kavitha_te_conversation');
    process.env.TTS_SPEAKER_EN = 'simran_en_edtech';
    expect(speakerFor('en')).toBe('simran_en_edtech');
    process.env.TTS_SPEAKER_EN = 'bad voice!';
    expect(speakerFor('en')).toBe('aparna_en_edtech');
    delete process.env.TTS_SPEAKER_EN;
  });
});

describe('keyterms', () => {
  it('sends the science list as a JSON array for Telugu and auto, not for English, and respects the limits', async () => {
    const { SCIENCE_KEYTERMS, validKeyterms, MAX_KEYTERMS } = await import('../src/shared/keyterms.ts');
    expect(SCIENCE_KEYTERMS.length).toBeLessThanOrEqual(MAX_KEYTERMS);
    expect(validKeyterms(SCIENCE_KEYTERMS)).toHaveLength(SCIENCE_KEYTERMS.length); // all valid, unique
    expect(validKeyterms([' a ', 'a', '', 'x'.repeat(65), ...Array.from({ length: 60 }, (_, i) => `t${i}`)])).toHaveLength(MAX_KEYTERMS);
    const { fetchFn, seen } = mockFetch([{ status: 200, body: { transcript: 'ok' } }]);
    await transcribe(new Uint8Array([1]), 'audio/wav', 'te', 2, { fetchFn });
    expect(JSON.parse(String((seen[0].init.body as FormData).get('keyterms')))).toContain('వక్రీభవనం');
    await transcribe(new Uint8Array([1]), 'audio/wav', 'auto', 2, { fetchFn });
    expect((seen[1].init.body as FormData).get('keyterms')).not.toBeNull();
    await transcribe(new Uint8Array([1]), 'audio/wav', 'en', 2, { fetchFn });
    expect((seen[2].init.body as FormData).get('keyterms')).toBeNull();
  });
});
