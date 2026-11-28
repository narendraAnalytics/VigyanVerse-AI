// Music bed + sound effects for the Life Processes video (2026-11-28, Scale Zoom style). Synthesized: no samples, no licences.
//   SECONDS=60 node scripts/synth-life.mjs   -> public/music/life-bed.wav + public/sfx/life-*.wav   (deterministic)
// Bed: gentle and warm, 80 bpm, D major, D - Bm - G - A (with 9ths and a sus4). A soft bowed pad from the start (the dark
// opening), then a marimba arpeggio and a pizzicato bass from bar 3, and a sparse glockenspiel tune from bar 5.
// The style's sound palette: tuned percussion and plucks, a small machine's foley, silence before a reveal.
import { mkdirSync, writeFileSync } from 'node:fs';

const SR = 44100;
const TAU = Math.PI * 2;
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const hz = (n) => { const m = /^([A-G]#?)(-?\d)$/.exec(n); return 440 * Math.pow(2, (NOTE[m[1]] + (Number(m[2]) + 1) * 12 - 69) / 12); };

function writeWav(path, L, R = L) {
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
function reverb(x, spread, fb = 0.8, damp = 0.45) {
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
const normalize = (bufs, db) => {
  let peak = 1e-9; for (const b of bufs) for (let i = 0; i < b.length; i++) peak = Math.max(peak, Math.abs(b[i]));
  const g = Math.pow(10, db / 20) / peak; for (const b of bufs) for (let i = 0; i < b.length; i++) b[i] *= g;
};
const marimba = (f, vel) => (t) => vel * Math.min(1, t * 600) * (Math.exp(-t * 4.2) * Math.sin(TAU * f * t) + 0.35 * Math.exp(-t * 14) * Math.sin(TAU * f * 3.93 * t));
const glock = (f, vel) => (t) => vel * Math.min(1, t * 900) * (Math.exp(-t * 2.2) * Math.sin(TAU * f * t) + 0.25 * Math.exp(-t * 6) * Math.sin(TAU * f * 2.76 * t) + 0.08 * Math.exp(-t * 9) * Math.sin(TAU * f * 5.4 * t));

function music(seconds) {
  const N = Math.ceil(seconds * SR), dry = new Float32Array(N), pad = new Float32Array(N);
  const r = rng(29);
  const BPM = 80, BEAT = 60 / BPM, BAR = BEAT * 4;
  const CHORDS = [
    { root: 'D2', pad: ['A3', 'D4', 'F#4', 'E5'], arp: ['D4', 'F#4', 'A4', 'E5'] },     // Dadd9
    { root: 'B1', pad: ['F#3', 'B3', 'D4', 'C#5'], arp: ['B3', 'D4', 'F#4', 'C#5'] },   // Bm(add9)
    { root: 'G1', pad: ['G3', 'B3', 'D4', 'F#4'], arp: ['G3', 'B3', 'D4', 'F#4'] },     // Gmaj7
    { root: 'A1', pad: ['A3', 'D4', 'E4', 'B4'], arp: ['A3', 'D4', 'E4', 'B4'] },       // Asus4(add9)
  ];
  const TUNE = [[0, 0, 'F#6', 2], [0, 2.5, 'A6', 1.5], [1, 0, 'E6', 3], [2, 0, 'D6', 2], [2, 2.5, 'F#6', 1.5], [3, 0, 'E6', 2], [3, 2, 'C#6', 2]];
  const add = (buf, at, len, fn) => { const a = Math.max(0, Math.floor(at * SR)), b = Math.min(N, Math.floor((at + len) * SR)); for (let i = a; i < b; i++) buf[i] += fn((i - a) / SR); };
  const bars = Math.ceil(seconds / BAR);
  for (let bar = 0; bar < bars; bar++) {
    const t0 = bar * BAR, ch = CHORDS[bar % 4];
    // bowed pad: two detuned sines per note, slow swell over the bar, overlapping into the next
    for (const n of ch.pad) for (const det of [-0.0025, 0.0025]) {
      const f = hz(n) * (1 + det);
      add(pad, t0, BAR + 1.6, (t) => 0.03 * Math.min(1, t / 1.3) * Math.min(1, Math.max(0, (BAR + 1.6 - t) / 1.6)) * Math.sin(TAU * f * t + 0.4 * Math.sin(TAU * 4.6 * t) * 0.02));
    }
    // marimba arpeggio from bar 3: eighths up and back down the chord
    if (bar >= 2) {
      const order = [0, 1, 2, 3, 2, 1, 2, 3];
      order.forEach((j, e) => add(dry, t0 + e * BEAT / 2 + r() * 0.006, 1.2, marimba(hz(ch.arp[j]), (e % 2 ? 0.035 : 0.05) * (bar === 2 ? 0.6 : 1))));
    }
    // pizzicato bass on 1 and 3 from bar 3
    if (bar >= 2) for (const b of [0, 2]) {
      const f = hz(ch.root) * (b === 2 ? 1.5 : 1);
      add(dry, t0 + b * BEAT, 1.0, (t) => 0.14 * Math.min(1, t * 400) * Math.exp(-t * 4.5) * (Math.sin(TAU * f * t) + 0.3 * Math.sin(TAU * f * 2 * t) * Math.exp(-t * 9)));
    }
    // glockenspiel tune from bar 5, one 4-bar phrase, then every other phrase
    if (bar >= 4 && Math.floor((bar - 4) / 4) % 2 === 0) for (const [pb, beat, note] of TUNE) if (pb === bar % 4) add(dry, t0 + beat * BEAT, 2.6, glock(hz(note), 0.045));
  }
  biquad(pad, 'lp', 2400);
  for (let i = 0; i < N; i++) dry[i] += pad[i];
  biquad(dry, 'lp', 6000);
  const wl = reverb(dry, 0), wr = reverb(dry, 23);
  const L = new Float32Array(N), R = new Float32Array(N);
  for (let i = 0; i < N; i++) { L[i] = dry[i] * 0.8 + wl[i] * 0.42; R[i] = dry[i] * 0.8 + wr[i] * 0.42; }
  normalize([L, R], -3);
  for (let i = 0; i < N; i++) { const fade = Math.min(1, i / (SR * 2), (N - i) / (SR * 3)); L[i] *= fade; R[i] *= fade; }
  return [L, R];
}

// ---------- sound effects ----------
const fx = (seconds, fn, tail = 0.3) => {
  const N = Math.ceil((seconds + tail) * SR), x = new Float32Array(N);
  fn(x);
  return x;
};
const addTo = (x, at, len, f) => { const a = Math.floor(at * SR), b = Math.min(x.length, Math.floor((at + len) * SR)); for (let i = a; i < b; i++) x[i] += f((i - a) / SR); };
const noise = (n, seed) => { const r = rng(seed), x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = r() * 2 - 1; return x; };
const withVerb = (x, wet = 0.3) => { const w = reverb(x, 7, 0.7, 0.5); const L = new Float32Array(x.length), R = new Float32Array(x.length); const w2 = reverb(x, 31, 0.7, 0.5); for (let i = 0; i < x.length; i++) { L[i] = x[i] + w[i] * wet; R[i] = x[i] + w2[i] * wet; } return [L, R]; };

const SFX = {
  'life-chime': () => withVerb(fx(2.2, (x) => { addTo(x, 0, 2.2, glock(hz('D6'), 0.5)); addTo(x, 0.09, 2.1, glock(hz('A6'), 0.35)); }), 0.5),
  'life-pop': () => withVerb(fx(0.3, (x) => addTo(x, 0, 0.3, (t) => 0.7 * Math.min(1, t * 800) * Math.exp(-t * 22) * Math.sin(TAU * (260 * t + 900 * t * t))))),
  'life-blip': () => withVerb(fx(0.15, (x) => addTo(x, 0, 0.15, (t) => 0.5 * Math.min(1, t * 900) * Math.exp(-t * 30) * Math.sin(TAU * (880 * t + 1800 * t * t)))), 0.4),
  'life-pluck': () => {
    // Karplus-Strong nylon pluck on D4, soft
    const f = hz('D4'), N = Math.ceil(1.8 * SR), x = new Float32Array(N), p = Math.round(SR / f), r = rng(5);
    const line = new Float32Array(p); for (let i = 0; i < p; i++) line[i] = r() * 2 - 1;
    let k = 0; for (let i = 0; i < N; i++) { const a = line[k], b = line[(k + 1) % p]; line[k] = 0.996 * 0.5 * (a + b); x[i] = a * 0.5; k = (k + 1) % p; }
    biquad(x, 'lp', 2200);
    return withVerb(x, 0.35);
  },
  'life-heartbeat': () => fx(0.55, (x) => {
    const thump = (at, v, f0, f1) => addTo(x, at, 0.2, (t) => v * Math.min(1, t * 300) * Math.exp(-t * 18) * Math.sin(TAU * (f0 * t + (f1 - f0) * 2.5 * t * t)));
    thump(0, 0.9, 70, 44); thump(0.24, 0.6, 76, 50);
    biquad(x, 'lp', 260);
  }, 0.1),
  'life-whoosh': () => {
    const len = 1.1, n = Math.ceil((len + 0.2) * SR), x = noise(n, 9), y = new Float32Array(n);
    // a band-pass whose centre rises then falls (a soft dive)
    for (let seg = 0; seg < 22; seg++) {
      const a = Math.floor((seg / 22) * len * SR), b = Math.floor(((seg + 1) / 22) * len * SR), f = 350 + 1900 * Math.sin(Math.PI * (seg / 22));
      const part = biquad(x.slice(a, b + 2000), 'bp', f, 0.9);
      for (let i = 0; i < part.length && a + i < n; i++) { const t = (a + i) / SR, env = Math.sin(Math.PI * Math.min(1, t / len)) ** 2; y[a + i] += part[i] * env * (i < b - a ? 1 : 0) * 0.5; }
    }
    return withVerb(y, 0.25);
  },
  'life-lock': () => withVerb(fx(1.6, (x) => {
    const c = noise(Math.floor(0.012 * SR), 3); biquad(c, 'hp', 2500);
    for (let i = 0; i < c.length; i++) x[i] += c[i] * 0.5 * (1 - i / c.length);
    addTo(x, 0.03, 1.5, glock(hz('A5'), 0.4)); addTo(x, 0.03, 1.5, glock(hz('E6'), 0.22));
  }), 0.45),
  'life-breath': () => {
    const len = 1.8, n = Math.ceil((len + 0.3) * SR), x = noise(n, 13);
    biquad(x, 'lp', 900); biquad(x, 'hp', 180);
    for (let i = 0; i < n; i++) { const t = i / SR; x[i] *= 0.35 * Math.pow(Math.sin(Math.PI * Math.min(1, t / len)), 2); }
    return withVerb(x, 0.2);
  },
  'life-sparkle': () => withVerb(fx(1.6, (x) => { ['A6', 'D7', 'F#6', 'B6', 'E7'].forEach((n, i) => addTo(x, i * 0.11, 1.3, glock(hz(n), 0.22 - i * 0.02))); }), 0.55),
};

const SECONDS = Number(process.env.SECONDS || 60);
mkdirSync('public/music', { recursive: true });
mkdirSync('public/sfx', { recursive: true });
writeWav('public/music/life-bed.wav', ...music(SECONDS));
console.log(`wrote public/music/life-bed.wav (${SECONDS} s)`);
for (const [name, make] of Object.entries(SFX)) {
  const out = make();
  const [L, R] = Array.isArray(out) ? out : [out, out];
  normalize([L, R], -1);
  writeWav(`public/sfx/${name}.wav`, L, R);
  console.log(`wrote public/sfx/${name}.wav`);
}
