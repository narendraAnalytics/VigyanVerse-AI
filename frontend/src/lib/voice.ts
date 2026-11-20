'use client';

// Microphone recording for voice questions: at most 30 s, sent to voice-transcribe.
// Nothing is stored: the recording goes to the speech service and only the text comes back.
import { api, blobToBase64, type Lang } from './api';

const MAX_SECONDS = 29;
const TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

export interface Recording {
  stop: () => Promise<{ transcript: string } | null>;
  cancel: () => void;
}

export async function startRecording(language: Lang | 'auto', onAutoStop: () => void): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const type = TYPES.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
  const recorder = new MediaRecorder(stream, { mimeType: type || undefined, audioBitsPerSecond: 32_000 });
  const chunks: Blob[] = [];
  const started = performance.now();
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  recorder.start();
  const timer = window.setTimeout(onAutoStop, MAX_SECONDS * 1000);

  const finish = () => new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
    };
    if (recorder.state !== 'inactive') recorder.stop(); else resolve(new Blob(chunks));
  });

  return {
    async stop() {
      window.clearTimeout(timer);
      const seconds = Math.min(30, (performance.now() - started) / 1000);
      const blob = await finish();
      if (seconds < 0.6 || blob.size < 200) return null;
      const mime = (blob.type || 'audio/webm').split(';')[0];
      const audioBase64 = await blobToBase64(blob);
      return api.voiceTranscribe({ audioBase64, mime, seconds: Math.max(0.3, Number(seconds.toFixed(1))), language });
    },
    cancel() {
      window.clearTimeout(timer);
      void finish();
    },
  };
}

let playing: HTMLAudioElement | null = null;

/** Read a tutor answer aloud (voice-speak). Returns when playback starts. */
export async function speakText(text: string, language: Lang): Promise<HTMLAudioElement> {
  playing?.pause();
  const r = await api.voiceSpeak({ text, language });
  const audio = new Audio(`data:${r.mime};base64,${r.audioBase64}`);
  playing = audio;
  await audio.play();
  return audio;
}

export function stopSpeaking() {
  playing?.pause();
  playing = null;
}

/**
 * "Bindu explains": fetch the spoken answer (charged as bindu_explain) WITHOUT playing it, so the
 * whiteboard can start the audio after its title is written and replay it for free.
 */
export async function fetchLessonAudio(text: string, language: Lang): Promise<{ src: string; spokenText: string }> {
  stopSpeaking();
  const r = await api.voiceSpeak({ text, language, purpose: 'bindu' });
  return { src: `data:${r.mime};base64,${r.audioBase64}`, spokenText: r.spokenText };
}
