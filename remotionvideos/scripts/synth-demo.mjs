// Gentle mid-century music bed for the LinkedIn demo (script.txt, 2026-11-24). Synthesized here: no samples, no licences.
//   node scripts/synth-demo.mjs        -> public/music/demo-bed.wav   (SECONDS=90 by default; deterministic)
// A soft late-50s jazz loop, 92 bpm, swung eighths: I - vi - ii - V in C (Cmaj7 - Am7 - Dm7 - G7). Warm electric piano
// chords on beat 1 and the "and" of 2, a round plucked bass on every beat, brushed swishes on 2 and 4, and a sparse
// vibraphone tune with a slow tremolo from bar 3. Meant to sit far under the voices (about 0.14, ducked to 0.07).
import { mkdirSync, writeFileSync } from 'node:fs';

const SR = 44100;
const TAU = Math.PI * 2;
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
function biquad(x, type, f, q = 0.707) {
  const w = TAU * f / SR, c = Math.cos(w), s = Math.sin(w), a = s / (2 * q);
  let b0, b1, b2; const a0 = 1 + a, a1 = -2 * c, a2 = 1 - a;
  if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
  else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
  else { b0 = a; b1 = 0; b2 = -a; }
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) { const y = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = x[i]; y2 = y1; y1 = y; x[i] = y; }
  return x;
}
function reverb(x, spread, fb = 0.78, damp = 0.4) {
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

function music(seconds) {
  const N = Math.ceil(seconds * SR), L = new Float32Array(N), R = new Float32Array(N);
  const dry = new Float32Array(N);
  const r = rng(11);
  const BPM = 92, BEAT = 60 / BPM, BAR = BEAT * 4, SWING = BEAT * 0.62;   // swung "and" lands at 62% of the beat
  const CHORDS = [
    { root: 'C2', notes: ['E3', 'G3', 'B3', 'D4'] },   // Cmaj9 (no root in the piano: the bass has it)
    { root: 'A1', notes: ['E3', 'G3', 'C4', 'D4'] },   // Am7(add11)
    { root: 'D2', notes: ['F3', 'A3', 'C4', 'E4'] },   // Dm9
    { root: 'G1', notes: ['F3', 'B3', 'D4', 'E4'] },   // G13
  ];
  // vibraphone tune, one phrase per 4 bars: [bar, beat, note, beats long]
  const TUNE = [
    [0, 0.0, 'E5', 1.5], [0, 2.62, 'G5', 1], [1, 0.0, 'A5', 1.5], [1, 2.0, 'G5', 1], [1, 3.0, 'E5', 1],
    [2, 0.0, 'F5', 1.5], [2, 2.62, 'A5', 1], [3, 0.0, 'G5', 2], [3, 2.62, 'D5', 1],
  ];
  const add = (buf, at, len, fn) => { const a = Math.max(0, Math.floor(at * SR)), b = Math.min(N, Math.floor((at + len) * SR)); for (let i = a; i < b; i++) buf[i] += fn((i - a) / SR); };

  const bars = Math.ceil(seconds / BAR);
  for (let bar = 0; bar < bars; bar++) {
    const t0 = bar * BAR, ch = CHORDS[bar % 4];
    // electric piano: sine + soft bell partial, quick attack, slow decay; on beat 1 and the swung "and" of 2
    for (const at of [t0, t0 + BEAT + SWING]) {
      const vel = at === t0 ? 1 : 0.6;
      for (const n of ch.notes) {
        const f = hz(n) * (1 + (r() - 0.5) * 0.002);
        add(dry, at + r() * 0.012, BEAT * 2.4, (t) => vel * 0.05 * Math.exp(-t * 1.6) * Math.min(1, t * 200) * (Math.sin(TAU * f * t) + 0.18 * Math.sin(TAU * f * 3.01 * t) * Math.exp(-t * 6)));
      }
    }
    // plucked upright bass: root on 1 and 3, a passing tone on 2 and 4
    const rf = hz(ch.root);
    [[0, 1], [1, 9 / 8], [2, 3 / 2], [3, 15 / 8 * 0.94]].forEach(([b, mult]) => {
      add(dry, t0 + b * BEAT, BEAT * 0.95, (t) => (bar < 1 ? 0.5 : 1) * 0.16 * Math.exp(-t * 3.2) * Math.min(1, t * 300) * (Math.sin(TAU * rf * mult * t) + 0.25 * Math.sin(TAU * rf * mult * 2 * t)));
    });
    // brushes: a filtered noise swish on 2 and 4 (from bar 2)
    if (bar >= 1) for (const b of [1, 3]) {
      const len = 0.22, at = t0 + b * BEAT, a = Math.floor(at * SR), n = Math.floor(len * SR);
      const sw = new Float32Array(n); for (let i = 0; i < n; i++) sw[i] = (r() * 2 - 1);
      biquad(sw, 'bp', 3200, 0.8);
      for (let i = 0; i < n && a + i < N; i++) { const t = i / SR; dry[a + i] += sw[i] * 0.05 * Math.min(1, t * 40) * Math.exp(-t * 14); }
    }
    // vibraphone tune from bar 2 (phrase repeats every 4 bars), soft tremolo
    if (bar >= 2) for (const [pb, beat, note, beats] of TUNE) if (pb === bar % 4) {
      const f = hz(note);
      add(dry, t0 + beat * BEAT, beats * BEAT + 1.2, (t) => 0.055 * Math.exp(-t * 1.3) * Math.min(1, t * 400) * (1 - 0.25 * (0.5 + 0.5 * Math.sin(TAU * 5.2 * t))) * (Math.sin(TAU * f * t) + 0.12 * Math.sin(TAU * f * 4 * t) * Math.exp(-t * 8)));
    }
  }
  biquad(dry, 'lp', 5200);
  const wl = reverb(dry, 0), wr = reverb(dry, 23);
  for (let i = 0; i < N; i++) { L[i] = dry[i] * 0.85 + wl[i] * 0.35; R[i] = dry[i] * 0.85 + wr[i] * 0.35; }
  let peak = 1e-9; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const g = Math.pow(10, -3 / 20) / peak;
  for (let i = 0; i < N; i++) { const fade = Math.min(1, i / (SR * 1.5), (N - i) / (SR * 3)); L[i] *= g * fade; R[i] *= g * fade; }
  return [L, R];
}

const SECONDS = Number(process.env.SECONDS || 90);
mkdirSync('public/music', { recursive: true });
writeWav('public/music/demo-bed.wav', ...music(SECONDS));
console.log(`wrote public/music/demo-bed.wav (${SECONDS} s)`);
