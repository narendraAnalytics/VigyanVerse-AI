// Gentle music bed and paper sound effects for the intro video, synthesized here (no samples, no licences, no API).
//   node scripts/synth.mjs            -> public/music/intro-bed.wav, public/sfx/thump.wav, card-pop.wav, paper-tick.wav
// Deterministic (seeded): running it again writes the same files.
// Music: F major, 76 bpm, Fmaj7 - Dm7 - Bbmaj7 - Csus/C. A warm pad, a soft music-box melody, a round sine bass and a
// small room reverb. The first two bars are pad + a few music-box notes only (the night-time opening); it fills out
// from bar 3. It is meant to sit far under the narration (volume about 0.15 in Root.tsx, ducked under each voice line).
import { mkdirSync, writeFileSync } from 'node:fs';

const SR = 44100;
const TAU = Math.PI * 2;

// ---------------------------------------------------------------- helpers
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const hz = (n) => { const m = /^([A-G][#b]?)(-?\d)$/.exec(n); return 440 * Math.pow(2, (NOTE[m[1]] + (Number(m[2]) + 1) * 12 - 69) / 12); };

function writeWav(path, L, R) {
  const n = L.length, buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4);
  }
  writeFileSync(path, buf);
}
function normalize(L, R, peakDb) {
  let peak = 1e-9; for (let i = 0; i < L.length; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const g = Math.pow(10, peakDb / 20) / peak; for (let i = 0; i < L.length; i++) { L[i] *= g; R[i] *= g; }
}
// RBJ biquad, run in place
function biquad(x, type, f, q = 0.707) {
  const w = TAU * f / SR, c = Math.cos(w), s = Math.sin(w), a = s / (2 * q);
  let b0, b1, b2; const a0 = 1 + a, a1 = -2 * c, a2 = 1 - a;
  if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
  else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
  else { b0 = a; b1 = 0; b2 = -a; }   // band-pass (0 dB peak)
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) { const y = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = x[i]; y2 = y1; y1 = y; x[i] = y; }
  return x;
}
// a small Schroeder room: 4 combs + 2 all-passes per channel (slightly different lengths left and right)
function reverb(x, spread, fb = 0.8, damp = 0.35) {
  const out = new Float32Array(x.length);
  for (const d of [1557, 1617, 1491, 1422].map((d) => d + spread)) {
    const line = new Float32Array(d); let k = 0, lp = 0;
    for (let i = 0; i < x.length; i++) { const y = line[k]; lp = y * (1 - damp) + lp * damp; line[k] = x[i] + lp * fb; k = (k + 1) % d; out[i] += y * 0.25; }
  }
  for (const d of [225, 556].map((d) => d + Math.round(spread / 3))) {
    const line = new Float32Array(d); let k = 0;
    for (let i = 0; i < out.length; i++) { const b = line[k], y = -0.5 * out[i] + b; line[k] = out[i] + 0.5 * b; k = (k + 1) % d; out[i] = y; }
  }
  return out;
}

// ---------------------------------------------------------------- music
function music(seconds) {
  const N = Math.ceil(seconds * SR), L = new Float32Array(N), R = new Float32Array(N);
  const r = rng(7);
  const BPM = 76, BEAT = 60 / BPM, BAR = BEAT * 4;
  const CHORDS = [
    { root: 'F2', pad: ['F3', 'A3', 'C4', 'E4'], box: ['A4', 'C5', 'E5', 'F5', 'A5'] },
    { root: 'D2', pad: ['D3', 'F3', 'A3', 'C4'], box: ['F4', 'A4', 'C5', 'D5', 'F5'] },
    { root: 'Bb1', pad: ['Bb2', 'D3', 'F3', 'A3'], box: ['D5', 'F5', 'A4', 'Bb4', 'D5'] },
    { root: 'C2', pad: ['C3', 'F3', 'G3', 'C4'], box: ['G4', 'C5', 'F5', 'G5', 'E5'] },   // Csus4, the F resolves to E on the last box notes
  ];
  const add = (t0, dur, pan, gain, fn) => {   // fn(t) -> sample for t seconds after the note starts
    const i0 = Math.max(0, Math.floor(t0 * SR)), i1 = Math.min(N, Math.ceil((t0 + dur) * SR));
    const gl = gain * Math.cos((pan + 1) * Math.PI / 4), gr = gain * Math.sin((pan + 1) * Math.PI / 4);
    for (let i = i0; i < i1; i++) { const v = fn(i / SR - t0); L[i] += v * gl; R[i] += v * gr; }
  };
  const bars = Math.ceil(seconds / BAR);
  for (let b = 0; b < bars; b++) {
    const ch = CHORDS[b % 4], t = b * BAR, full = b >= 2;
    // pad: two slightly detuned sines per chord tone, slow swell, overlapping the next bar
    ch.pad.forEach((n, k) => {
      const f = hz(n), len = BAR + 1.6;
      add(t, len, (k - 1.5) * 0.35, 0.05, (u) => {
        const env = Math.min(1, u / 1.2) * Math.min(1, Math.max(0, (len - u) / 1.6));
        return env * (Math.sin(TAU * f * u) + 0.6 * Math.sin(TAU * f * 1.003 * u + 1.3) + 0.18 * Math.sin(TAU * 2 * f * u)) * (1 + 0.08 * Math.sin(TAU * 0.35 * u + k));
      });
    });
    // bass: a round sine on beat 1, a softer one on beat 3 once the music fills out
    const fb = hz(ch.root);
    const bass = (t0, g) => add(t0, 2.2, 0, g, (u) => Math.min(1, u / 0.02) * Math.exp(-u / 0.9) * (Math.sin(TAU * fb * u) + 0.25 * Math.sin(TAU * 2 * fb * u)));
    if (b >= 1) bass(t, full ? 0.16 : 0.1);
    if (full) bass(t + 2 * BEAT, 0.08);
    // music box: eighth notes from the chord, sparse in the opening bars, a little humanized
    const pattern = [0, 2, 1, 3, 2, 1, 4, 2];
    for (let e = 0; e < 8; e++) {
      const play = full ? (e % 2 === 0 || r() < 0.55) : (e === 0 || e === 3 || e === 6);
      if (!play) continue;
      const n = ch.box[pattern[e]], f = hz(n), t0 = t + e * BEAT / 2 + (r() - 0.5) * 0.012, vel = (e % 2 ? 0.07 : 0.1) * (0.85 + 0.3 * r());
      add(t0, 2.4, e % 2 ? 0.35 : -0.35, vel, (u) => Math.min(1, u / 0.004) * (Math.sin(TAU * f * u) * Math.exp(-u / 0.9) + 0.32 * Math.sin(TAU * 2 * f * u) * Math.exp(-u / 0.32) + 0.1 * Math.sin(TAU * 3.01 * f * u) * Math.exp(-u / 0.15)));
    }
  }
  // room
  const wl = reverb(L, 0), wr = reverb(R, 23);
  for (let i = 0; i < N; i++) { L[i] = L[i] * 0.8 + wl[i] * 0.3; R[i] = R[i] * 0.8 + wr[i] * 0.3; }
  biquad(L, 'hp', 45); biquad(R, 'hp', 45);
  // fade in over the first second, out over the last four
  for (let i = 0; i < N; i++) { const t = i / SR, g = Math.min(1, t / 1.0) * Math.min(1, Math.max(0, (seconds - t) / 4)); L[i] *= g; R[i] *= g; }
  normalize(L, R, -3);
  return [L, R];
}

// ---------------------------------------------------------------- paper sounds
const mono = (x) => [x, Float32Array.from(x)];
function noise(seconds, seed) { const r = rng(seed), x = new Float32Array(Math.ceil(seconds * SR)); for (let i = 0; i < x.length; i++) x[i] = r() * 2 - 1; return x; }
// a cloth-bound board landing on the table: a low knock and a short soft slap of air
function thump() {
  const n = Math.ceil(0.6 * SR), x = new Float32Array(n);
  let ph = 0; for (let i = 0; i < n; i++) { const t = i / SR, f = 55 + 45 * Math.exp(-t / 0.05); ph += TAU * f / SR; x[i] = Math.sin(ph) * Math.exp(-t / 0.12) * Math.min(1, t / 0.002); }
  const slap = biquad(noise(0.6, 3), 'lp', 900);
  for (let i = 0; i < n; i++) { const t = i / SR; x[i] += 0.5 * slap[i] * Math.exp(-t / 0.035); }
  const [L, R] = mono(x); normalize(L, R, -1); return [L, R];
}
// a pop-up card standing up: a quick bright "fwip" of paper with a tiny crisp end
function cardPop() {
  const n = Math.ceil(0.3 * SR), x = noise(0.3, 5), y = new Float32Array(n);
  // sweep a band-pass upward by filtering in short blocks
  const blocks = 12;
  for (let b = 0; b < blocks; b++) {
    const i0 = Math.floor(b * n / blocks), i1 = Math.floor((b + 1) * n / blocks), seg = x.slice(i0, i1);
    biquad(seg, 'bp', 1200 * Math.pow(3.2, b / blocks), 1.4); y.set(seg, i0);
  }
  for (let i = 0; i < n; i++) { const t = i / SR; y[i] *= Math.min(1, t / 0.012) * Math.exp(-t / 0.06); }
  const tick = biquad(noise(0.3, 9), 'bp', 4200, 3);
  for (let i = 0; i < n; i++) { const t = i / SR - 0.07; if (t > 0) y[i] += 0.6 * tick[i] * Math.exp(-t / 0.008); }
  const [L, R] = mono(y); normalize(L, R, -2); return [L, R];
}
// a dry little paper tick (card creaking upright, a piece trembling on its arm)
function paperTick() {
  const x = biquad(biquad(noise(0.08, 11), 'bp', 3000, 2.5), 'hp', 1200);
  for (let i = 0; i < x.length; i++) { const t = i / SR; x[i] *= Math.min(1, t / 0.0008) * Math.exp(-t / 0.009); }
  const [L, R] = mono(x); normalize(L, R, -3); return [L, R];
}

mkdirSync('public/music', { recursive: true });
mkdirSync('public/sfx', { recursive: true });
const SECONDS = Number(process.env.SECONDS || 96);
writeWav('public/music/intro-bed.wav', ...music(SECONDS));
writeWav('public/sfx/thump.wav', ...thump());
writeWav('public/sfx/card-pop.wav', ...cardPop());
writeWav('public/sfx/paper-tick.wav', ...paperTick());
console.log(`wrote public/music/intro-bed.wav (${SECONDS} s) and public/sfx/thump.wav, card-pop.wav, paper-tick.wav`);
