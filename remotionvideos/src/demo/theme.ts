// LinkedIn demo video (script.txt, 2026-11-24): mid-century cartoon style (1950s limited animation: flat shapes, a few
// warm print colours, no outlines, paper grain, characters moving "on twos" = 12 drawings a second).
import demoVoice from '../voice/demo.json';

export const FPS = 30;

export const C = {
  paper: '#F4E8D0',
  ink: '#2A2622',
  navy: '#22364E',
  teal: '#2E6E6A',
  tealDark: '#1F4D4A',
  tealLight: '#5E9C95',
  mustard: '#E1A325',
  mustardLight: '#F2C764',
  coral: '#E1653B',
  coralDark: '#B84A2A',
  pink: '#E8A598',
  olive: '#8A9A3B',
  oliveDark: '#5F6B26',
  cream: '#FBF3DF',
  wallL: '#E6C79D',
  wallR: '#EBD3AF',
  wallShade: '#D4AF80',
  sky1: '#203A4F',
  sky2: '#365F6E',
  sky3: '#C98A5C',
  glow: '#F7D37A',
  red: '#C8322B',
  gold: '#D9A21B',
};

/** 0..1 smoothstep between a and b (seconds). */
export const prog = (t: number, a: number, b: number) => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
/** Character time on twos: 12 drawings a second, the mid-century limited-animation look. */
export const twos = (t: number) => Math.floor(t * 12) / 12;
/** A short overshoot pop 0 -> 1 starting at `at`. */
export const pop = (t: number, at: number, dur = 0.35) => {
  if (t < at) return 0;
  const x = Math.min(1, (t - at) / dur);
  return 1 + Math.sin(x * Math.PI) * 0.18 * (1 - x) - (1 - x) * (1 - x) * (1 - x);
};

type Line = { file: string; at: number; seconds: number; text: string; words: [string, number, number][] };
export const LINES = demoVoice.lines as unknown as Line[];

/** Start time (video seconds) of the nth occurrence of `word` in line i. */
export const wordAt = (i: number, word: string, nth = 1) => {
  const l = LINES[i];
  let k = 0;
  for (const [w, s] of l.words) if (w.toLowerCase().replace(/[^a-z0-9']/g, '') === word.toLowerCase() && ++k === nth) return l.at + s;
  throw new Error(`word "${word}" not in line ${i}`);
};
export const lineEnd = (i: number) => LINES[i].at + LINES[i].words[LINES[i].words.length - 1][2];

/** Mouth open while a word of line i is being spoken (flaps on twos, closed between words). */
export const mouthOpen = (i: number, t: number) => {
  const l = LINES[i];
  const tt = twos(t);
  const inWord = l.words.some(([, s, e]) => tt >= l.at + s && tt < l.at + e + 0.03);
  return inWord && Math.floor(t * 12) % 3 !== 2;
};
export const speaking = (i: number, t: number) => t >= LINES[i].at && t <= lineEnd(i);

/** Blinks every few seconds (offset per character). */
export const blinking = (t: number, offset: number) => (t + offset) % 3.4 < 0.1;
