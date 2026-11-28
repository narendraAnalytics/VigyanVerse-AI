// Life Processes study video (script.txt, 2026-11-28). Style: Scale Zoom Explainer (lemo-opuscar
// `flat-space-explainer`, its STYLE.md is the brief; helpers below are ported from its MIT demo engine film.js / flat.js).
// Flat solid shapes, one shade step each, hard two-ring glows on a deep night-blue ground, one continuous change of scale.
import lifeVoice from '../voice/life.json';

export const FPS = 30;
export const W = 1920;
export const H = 1080;
export const S0: [number, number] = [W / 2, H / 2];

export const C = {
  night: '#1D2052', n2: '#252A63', n3: '#30367C', mist: '#9298D4',
  blue: '#4D7CFE', blueD: '#3A5FD9',
  mint: '#3FD8AE', mintD: '#22B38C',
  coral: '#FF6B5E', coralD: '#E14B45',
  sun: '#FFC84A', sunD: '#F2A12F',
  cream: '#FFF4E2', creamD: '#F0DCC0',
};

export const FONT = 'Jost';

// ---------- easing: all pure functions of t ----------
export const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const eio = (k: number) => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
export const eo = (k: number) => 1 - Math.pow(1 - clamp(k), 3);
export const ei = (k: number) => Math.pow(clamp(k), 3);
/** Back-out: overshoots past 1 then settles (dots popping 0 -> 1.3 -> 1). */
export const backE = (k: number, s = 1.4) => { k = clamp(k) - 1; return 1 + k * k * ((s + 1) * k + s); };
export const smooth = (k: number) => { k = clamp(k); return k * k * (3 - 2 * k); };
/** Spring step: 0 before t0, settles to 1 with one soft overshoot. */
export const spr = (t: number, t0: number, w = 16, d = 8) => { const x = t - t0; return x <= 0 ? 0 : 1 - Math.exp(-d * x) * (Math.cos(w * x) + (d / w) * Math.sin(w * x)); };
/** A decaying wobble after t0 (follow-through). */
export const wob = (t: number, t0: number, w = 12, d = 5) => { const x = t - t0; return x <= 0 ? 0 : Math.exp(-d * x) * Math.sin(w * x); };
/** Up (a..b), hold, down (c..d), eased. */
export const ebump = (t: number, a: number, b: number, c: number, d: number) => eio(seg(t, a, b)) * (1 - eio(seg(t, c, d)));
/** Piecewise track [[t, v], ...], eased in and out between keys. */
export const kf = (t: number, keys: [number, number][]) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
    const [t0, v0] = keys[i - 1], [t1, v1] = keys[i];
    return lerp(v0, v1, eio((t - t0) / (t1 - t0)));
  }
  return keys[keys.length - 1][1];
};
export const blink = (t: number, t0: number) => eio(seg(t, t0, t0 + 0.07)) * (1 - eio(seg(t, t0 + 0.11, t0 + 0.22)));
/** Heartbeat at 72 per minute: "lub" then a smaller "dub", 0..1 contraction. */
export const beat = (t: number, phase = 0) => {
  const p = (((t + phase) * 1.2) % 1 + 1) % 1;
  const lub = Math.exp(-Math.pow((p - 0.08) / 0.05, 2));
  const dub = 0.6 * Math.exp(-Math.pow((p - 0.3) / 0.05, 2));
  return lub + dub;
};

export function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const r1 = (v: number) => Math.round(v * 10) / 10;

// ---------- narration ----------
type Line = { file: string; at: number; seconds: number; text: string; words: [string, number, number][] };
export const LINES = lifeVoice.lines as unknown as Line[];

const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, '');
/** Start time (video seconds) of the nth occurrence of `word` in line i. */
export const wordAt = (i: number, word: string, nth = 1) => {
  const l = LINES[i];
  let k = 0;
  for (const [w, s] of l.words) if (norm(w) === word.toLowerCase() && ++k === nth) return l.at + s;
  throw new Error(`word "${word}" not in line ${i}`);
};
export const lineEnd = (i: number) => LINES[i].at + LINES[i].words[LINES[i].words.length - 1][2];
