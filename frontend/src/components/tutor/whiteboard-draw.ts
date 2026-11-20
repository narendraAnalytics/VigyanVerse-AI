// Canvas drawing for the "Bindu explains" whiteboard, ported from the owner's Whiteboard Explainer
// style guide (`whitebordprompt.txt`): dry-erase marker strokes with pooled edges and dry streaks,
// marker lettering written letter by letter, a ghost of an erased lesson, ceiling-light sheen, the
// marker in hand, an aluminium frame with a tray, and fine grain. Logical size 1100 x 720.
// Every frame is a pure function of t: randomness comes only from seeded rng / noise.

export const W = 1100;
export const H = 720;
export const BX0 = 22;
export const BY0 = 22;
export const BX1 = W - 22;
export const BY1 = 640;

export type Pt = [number, number];
type RGB = [number, number, number];

// ---------- seeded randomness + noise ----------
export function rng(seed: number) {
  let a = seed >>> 0 || 1;
  const r = () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const range = (lo: number, hi: number) => lo + r() * (hi - lo);
  return Object.assign(r, { range });
}

export function makeNoise(seed: number) {
  const r = rng(seed), p = new Uint8Array(512), perm = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const g3 = (h: number, x: number, y: number, z: number) => { h &= 15; const u = h < 8 ? x : y, v = h < 4 ? y : h === 12 || h === 14 ? x : z; return ((h & 1) ? -u : u) + ((h & 2) ? -v : v); };
  function n3(x: number, y: number, z: number) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    const u = fade(x), v = fade(y), w = fade(z);
    const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z, B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
    return lerp(lerp(lerp(g3(p[AA], x, y, z), g3(p[BA], x - 1, y, z), u), lerp(g3(p[AB], x, y - 1, z), g3(p[BB], x - 1, y - 1, z), u), v),
      lerp(lerp(g3(p[AA + 1], x, y, z - 1), g3(p[BA + 1], x - 1, y, z - 1), u), lerp(g3(p[AB + 1], x, y - 1, z - 1), g3(p[BB + 1], x - 1, y - 1, z - 1), u), v), w);
  }
  return { n2: (x: number, y: number) => n3(x, y, 0.5) };
}
type Noise = ReturnType<typeof makeNoise>;

export const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const hex = (h: string): RGB => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgba = (c: string | RGB, a = 1) => { const [r, g, b] = Array.isArray(c) ? c : hex(c); return `rgba(${r | 0},${g | 0},${b | 0},${a})`; };
const mix = (c1: string, c2: string, t: number): RGB => { const a = hex(c1), b = hex(c2); return [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * t) as RGB; };

// ---------- paths ----------
export const seg = (pts: Pt[], step = 2.5): Pt[] => {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let j = 0; j < n; j++) out.push([x0 + (x1 - x0) * j / n, y0 + (y1 - y0) * j / n]);
  }
  out.push(pts[pts.length - 1]);
  return out;
};
const normals = (P: Pt[]): Pt[] => P.map((_, i) => {
  const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
  return [-dy / d, dx / d];
});
export const wobble = (pts: Pt[], nz: Noise, seed: number, amp = 1.6, freq = 0.011): Pt[] => {
  const N = normals(pts); let L = 0;
  return pts.map((p, i) => {
    if (i) L += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
    const o = nz.n2(L * freq + seed * 1.37, seed * 0.71) * amp + nz.n2(L * freq * 6 + seed, seed + 3.3) * amp * 0.25;
    return [p[0] + N[i][0] * o, p[1] + N[i][1] * o];
  });
};
const tracePath = (ctx: CanvasRenderingContext2D, P: Pt[]) => { ctx.beginPath(); P.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); };

// ---------- ink ----------
const BOARD: RGB = [236, 240, 239];
const MN = makeNoise(4242);

/** Where the marker tip is this frame (set while something is being drawn). Reset before each frame. */
export const tip: { at: [number, number, string] | null } = { at: null };

/** A dry-erase marker stroke: lighter wet centre, darker pooled edges, streaky dry lines. */
export function marker(ctx: CanvasRenderingContext2D, pts: Pt[], col: string, w: number, seed: number, prog = 1) {
  if (prog <= 0 || pts.length < 2) return;
  if (prog < 1) { const q = pts[Math.max(1, Math.ceil(pts.length * prog)) - 1]; tip.at = [q[0], q[1], col]; }
  const P = prog < 1 ? pts.slice(0, Math.max(2, Math.ceil(pts.length * prog))) : pts;
  const r = rng(seed), c = hex(col), N = normals(P);
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(c, 0.3); ctx.lineWidth = w; tracePath(ctx, P); ctx.stroke();
  ctx.lineCap = 'butt';
  const CH = 10;
  for (let i = 0; i < P.length - 1; i += CH) {
    const a = 0.16 + 0.22 * (0.5 + 0.5 * MN.n2(i * 0.03 + seed * 3.1, seed * 0.37));
    ctx.strokeStyle = rgba(c, a); ctx.lineWidth = w * 0.96;
    ctx.beginPath(); ctx.moveTo(P[i][0], P[i][1]);
    for (let j = i + 1; j <= Math.min(P.length - 1, i + CH); j++) ctx.lineTo(P[j][0], P[j][1]);
    ctx.stroke();
  }
  const n = 7;
  for (let k = 0; k < n; k++) {
    const u = k / (n - 1) - 0.5, edge = Math.abs(u) * 2;
    const a = (0.08 + 0.5 * Math.pow(edge, 2.2)) * (0.65 + r() * 0.7);
    ctx.strokeStyle = rgba(c, a); ctx.lineWidth = (w / n) * 1.5;
    const off = u * w * 0.84;
    ctx.beginPath();
    P.forEach((p, i) => { const x = p[0] + N[i][0] * off, y = p[1] + N[i][1] * off; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
    ctx.stroke();
  }
  for (let k = 0; k < 4; k++) {
    const off = (r() - 0.5) * w * 0.6;
    ctx.strokeStyle = rgba(BOARD, 0.14 + r() * 0.2); ctx.lineWidth = 0.6 + r() * 0.6;
    const s = Math.floor(r() * P.length * 0.4), e = Math.min(P.length, s + Math.floor(P.length * (0.3 + r() * 0.6)));
    ctx.beginPath();
    for (let i = s; i < e; i++) { const x = P[i][0] + N[i][0] * off, y = P[i][1] + N[i][1] * off; if (i > s) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.stroke();
  }
  [P[0], prog >= 1 ? P[P.length - 1] : null].forEach((p, j) => {
    if (!p) return;
    const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], w * 0.62);
    g.addColorStop(0, rgba(c, j ? 0.25 : 0.42)); g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p[0], p[1], w * 0.62, 0, 7); ctx.fill();
  });
  ctx.restore();
}

/** Marker lettering: per-glyph jitter, pale centres with darker rims, written letter by letter. */
export function mText(ctx: CanvasRenderingContext2D, str: string, x: number, y: number, font: string, col: string, seed: number, prog = 1, rot = 0) {
  if (prog <= 0) return;
  const r = rng(seed), c = hex(col);
  ctx.save(); ctx.font = font; ctx.textBaseline = 'alphabetic';
  ctx.translate(x, y); ctx.rotate(rot);
  const nChars = Math.ceil(str.length * prog);
  if (prog < 1) {
    const wsofar = ctx.measureText(str.slice(0, nChars)).width;
    tip.at = [x + Math.cos(rot) * wsofar, y + Math.sin(rot) * wsofar - 10, col];
  }
  let cx = 0;
  for (let i = 0; i < nChars; i++) {
    const ch = str[i], wch = ctx.measureText(ch).width;
    const jy = (r() - 0.5) * 3, jr = (r() - 0.5) * 0.07, a = 0.8 + r() * 0.1, js = (r() - 0.5) * 1.5;
    if (ch !== ' ') {
      ctx.save(); ctx.translate(cx + wch / 2, jy); ctx.rotate(jr);
      ctx.fillStyle = rgba(c, a); ctx.fillText(ch, -wch / 2, 0);
      ctx.strokeStyle = rgba(c, 0.7); ctx.lineWidth = 1.3; ctx.strokeText(ch, -wch / 2, 0);
      ctx.restore();
    }
    cx += wch + js;
  }
  ctx.restore();
}

/** A wobbly hand-drawn path in world space (pre-sampled once). */
export const handPath = (pts: Pt[], seed: number, amp = 1.7) => wobble(seg(pts), makeNoise(11), seed, amp);

// ---------- static layers (cached per canvas size) ----------
function layer(scale: number) {
  const c = document.createElement('canvas');
  c.width = Math.round(W * scale); c.height = Math.round(H * scale);
  const ctx = c.getContext('2d')!;
  ctx.scale(scale, scale);
  return { c, ctx };
}

/** Board surface, old-cleaner mottling and the ghost of an erased science lesson. */
export function boardLayer(scale: number, fonts: { marker: string; hand: string }): HTMLCanvasElement {
  const { c, ctx } = layer(scale);
  const nz = makeNoise(11);
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#f6f8f7'); bg.addColorStop(0.55, '#ecefee'); bg.addColorStop(1, '#dfe4e3');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const rb = rng(5);
  for (let i = 0; i < 14; i++) {
    const x = rb.range(BX0, BX1), y = rb.range(BY0, BY1), rr = rb.range(80, 260);
    const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
    g.addColorStop(0, `rgba(150,160,165,${rb.range(0.015, 0.04)})`); g.addColorStop(1, 'rgba(150,160,165,0)');
    ctx.fillStyle = g; ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  // ghost of the last lesson, wiped with a felt eraser (residue survives in streaky bands)
  const g = document.createElement('canvas'); g.width = W; g.height = H;
  const gc = g.getContext('2d')!;
  gc.strokeStyle = '#30343c'; gc.fillStyle = '#30343c'; gc.lineCap = 'round'; gc.lineJoin = 'round'; gc.lineWidth = 7;
  gc.font = `400 46px ${fonts.marker}`; gc.fillText('REVISION', 790, 104);
  gc.font = `700 32px ${fonts.hand}`;
  ['- reflection', '- acids & bases', '- V = I R'].forEach((s, i) => gc.fillText(s, 806, 160 + i * 42));
  tracePath(gc, wobble(seg([[780, 122], [1040, 118]]), nz, 40)); gc.stroke();
  gc.beginPath(); gc.arc(150, 560, 52, 0, 7); gc.stroke();
  gc.beginPath(); gc.moveTo(70, 560); gc.lineTo(330, 560); gc.stroke();
  tracePath(gc, wobble(seg([[360, 590], [420, 540], [480, 575], [560, 520]]), nz, 41)); gc.stroke();
  gc.font = `700 28px ${fonts.hand}`; gc.fillText('H2O', 380, 618);
  const m = document.createElement('canvas'); m.width = W; m.height = H;
  const mc = m.getContext('2d')!, rm = rng(77);
  mc.lineCap = 'round';
  for (let i = 0; i < 70; i++) {
    const y = rm.range(40, 640), x = rm.range(20, 1080), len = rm.range(150, 420);
    mc.strokeStyle = `rgba(0,0,0,${rm.range(0.15, 0.8)})`; mc.lineWidth = rm.range(4, 26);
    mc.beginPath(); mc.moveTo(x, y); mc.quadraticCurveTo(x + len / 2, y + rm.range(-30, 30), x + len, y + rm.range(-18, 18)); mc.stroke();
  }
  gc.globalCompositeOperation = 'destination-in'; gc.drawImage(m, 0, 0);
  ctx.save(); ctx.filter = 'blur(0.7px)'; ctx.globalAlpha = 0.11; ctx.drawImage(g, 0, 0); ctx.restore();
  const rh = rng(78);
  ctx.save(); ctx.lineCap = 'round'; ctx.filter = 'blur(6px)';
  for (let i = 0; i < 9; i++) {
    const x = rh.range(760, 1060), y = rh.range(70, 260);
    ctx.strokeStyle = `rgba(120,128,135,${rh.range(0.012, 0.028)})`; ctx.lineWidth = rh.range(30, 60);
    ctx.beginPath(); ctx.moveTo(x - 120, y); ctx.quadraticCurveTo(x, y + rh.range(-25, 25), x + 120, y + rh.range(-10, 10)); ctx.stroke();
  }
  ctx.restore();
  return c;
}

/** Aluminium frame, corner caps, tray with markers and a felt eraser (drawn over the ink). */
export function frameLayer(scale: number): HTMLCanvasElement {
  const { c, ctx } = layer(scale);
  const inner = (x: number, y: number, w: number, h: number, dir: 'v' | 'h') => {
    const g = dir === 'v' ? ctx.createLinearGradient(x, y, x, y + h) : ctx.createLinearGradient(x, y, x + w, y);
    g.addColorStop(0, 'rgba(40,45,55,0.16)'); g.addColorStop(1, 'rgba(40,45,55,0)');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  };
  inner(BX0, BY0, BX1 - BX0, 10, 'v'); inner(BX0, BY0, 8, BY1 - BY0, 'h');
  const metal = (g: CanvasGradient) => {
    g.addColorStop(0, '#f4f5f6'); g.addColorStop(0.35, '#c6cace'); g.addColorStop(0.55, '#e7e9eb'); g.addColorStop(0.8, '#a3a8ae'); g.addColorStop(1, '#7c8187');
    return g;
  };
  ctx.fillStyle = metal(ctx.createLinearGradient(0, 0, 0, BY0)); ctx.fillRect(0, 0, W, BY0);
  ctx.fillStyle = metal(ctx.createLinearGradient(0, 0, BX0, 0)); ctx.fillRect(0, 0, BX0, BY1);
  ctx.fillStyle = metal(ctx.createLinearGradient(W, 0, BX1, 0)); ctx.fillRect(BX1, 0, W - BX1, BY1);
  ctx.strokeStyle = 'rgba(70,75,82,0.6)'; ctx.lineWidth = 1.5; ctx.strokeRect(BX0 - 0.5, BY0 - 0.5, BX1 - BX0 + 1, BY1 - BY0 + 1);
  ([[0, 1], [W, -1]] as const).forEach(([x, sx]) => {
    ctx.save(); ctx.translate(x, 0); ctx.scale(sx, 1);
    const g = ctx.createLinearGradient(0, 0, 40, 40); g.addColorStop(0, '#6b6f75'); g.addColorStop(1, '#3d4045');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(42, 0); ctx.lineTo(42, 14); ctx.quadraticCurveTo(42, 42, 14, 42); ctx.lineTo(0, 42); ctx.closePath(); ctx.fill();
    ctx.restore();
  });
  const tg = ctx.createLinearGradient(0, BY1, 0, 694);
  tg.addColorStop(0, '#6f747b'); tg.addColorStop(0.4, '#9ca1a7'); tg.addColorStop(1, '#c3c7cb');
  ctx.fillStyle = tg; ctx.fillRect(0, BY1, W, 694 - BY1);
  const mk = (x: number, len: number, body: string, cap: string, rot: number) => {
    ctx.save(); ctx.translate(x, 670); ctx.rotate(rot);
    const shg = ctx.createRadialGradient(len / 2, 12, 2, len / 2, 12, len / 2);
    shg.addColorStop(0, 'rgba(0,0,0,0.35)'); shg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shg; ctx.fillRect(-10, 0, len + 20, 22);
    const bg2 = ctx.createLinearGradient(0, -11, 0, 11);
    bg2.addColorStop(0, rgba(mix(body, '#ffffff', 0.35))); bg2.addColorStop(0.35, body); bg2.addColorStop(1, rgba(mix(body, '#000000', 0.5)));
    ctx.fillStyle = bg2; ctx.beginPath(); ctx.roundRect(0, -11, len * 0.72, 22, 8); ctx.fill();
    const cg = ctx.createLinearGradient(0, -12, 0, 12);
    cg.addColorStop(0, rgba(mix(cap, '#ffffff', 0.4))); cg.addColorStop(0.35, cap); cg.addColorStop(1, rgba(mix(cap, '#000000', 0.5)));
    ctx.fillStyle = cg; ctx.beginPath(); ctx.roundRect(len * 0.7, -12, len * 0.3, 24, 9); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillRect(len * 0.18, -5, len * 0.3, 7);
    ctx.fillStyle = cap; ctx.fillRect(len * 0.21, -3, len * 0.12, 3);
    ctx.restore();
  };
  mk(420, 140, '#e9eaec', '#1f4fc2', -0.02);
  mk(590, 140, '#e9eaec', '#d4262f', 0.015);
  mk(740, 140, '#e9eaec', '#16884a', -0.01);
  ctx.save(); ctx.translate(160, 664);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(4, 10, 150, 18);
  const eg = ctx.createLinearGradient(0, -14, 0, 14); eg.addColorStop(0, '#5b6470'); eg.addColorStop(1, '#2c323a');
  ctx.fillStyle = eg; ctx.beginPath(); ctx.roundRect(0, -14, 150, 26, 5); ctx.fill();
  ctx.fillStyle = '#3e3e3e'; ctx.fillRect(4, 10, 142, 6);
  ctx.restore();
  const lg = ctx.createLinearGradient(0, 692, 0, H);
  lg.addColorStop(0, '#f0f2f3'); lg.addColorStop(0.3, '#cfd3d7'); lg.addColorStop(0.75, '#a2a7ad'); lg.addColorStop(1, '#73787e');
  ctx.fillStyle = lg; ctx.fillRect(0, 692, W, H - 692);
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(0, 692, W, 1.5);
  return c;
}

/** Three fine-grain tiles, cycled about 12 times a second (cheaper than per-frame pixel noise). */
export function grainTiles(scale: number): HTMLCanvasElement[] {
  return [9, 10, 11].map((seed) => {
    const c = document.createElement('canvas');
    c.width = Math.round(W * scale); c.height = Math.round(H * scale);
    const ctx = c.getContext('2d')!, img = ctx.createImageData(c.width, c.height), d = img.data, r = rng(seed);
    for (let i = 0; i < d.length; i += 4) {
      const v = r();
      if (v < 0.5) { const s = v < 0.25 ? 0 : 255; d[i] = d[i + 1] = d[i + 2] = s; d[i + 3] = 6 + ((r() * 8) | 0); }
    }
    ctx.putImageData(img, 0, 0);
    return c;
  });
}

// ---------- per-frame passes ----------
/** Gloss sheen and ceiling-light reflections (over the ink), drifting slightly with t. */
export function sheen(ctx: CanvasRenderingContext2D, t: number) {
  ctx.save();
  const sh = ctx.createLinearGradient(200 + t * 6, -60, 720 + t * 6, 760);
  sh.addColorStop(0.0, 'rgba(255,255,255,0)');
  sh.addColorStop(0.36, 'rgba(255,255,255,0)');
  sh.addColorStop(0.43, 'rgba(255,255,255,0.22)');
  sh.addColorStop(0.47, 'rgba(255,255,255,0.1)');
  sh.addColorStop(0.5, 'rgba(255,255,255,0.26)');
  sh.addColorStop(0.58, 'rgba(255,255,255,0)');
  sh.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sh; ctx.fillRect(0, 0, W, H);
  ([[330, 66, 240, 24], [820, 62, 210, 20]] as const).forEach(([x, y, rx, ry]) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(0.5, 'rgba(255,255,255,0.16)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, 7); ctx.fill(); ctx.restore();
  });
  const fo = ctx.createLinearGradient(0, BY1 - 200, 0, BY1);
  fo.addColorStop(0, 'rgba(60,70,80,0)'); fo.addColorStop(1, 'rgba(60,70,80,0.07)');
  ctx.fillStyle = fo; ctx.fillRect(0, BY1 - 200, W, 200);
  ctx.restore();
}

/** The marker in hand at the tip while something is being written. */
export function markerInHand(ctx: CanvasRenderingContext2D, at: [number, number, string]) {
  const [tx, ty, col] = at, ang = 0.95, len = 200;
  ctx.save();
  ctx.save(); ctx.filter = 'blur(8px)'; ctx.fillStyle = 'rgba(40,50,60,0.25)';
  ctx.translate(tx + 14, ty + 18); ctx.rotate(ang); ctx.beginPath(); ctx.roundRect(8, -13, len, 26, 12); ctx.fill(); ctx.restore();
  ctx.translate(tx, ty); ctx.rotate(ang);
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-2, -3); ctx.lineTo(16, -6); ctx.lineTo(16, 6); ctx.lineTo(-2, 2); ctx.closePath(); ctx.fill();
  const g = ctx.createLinearGradient(0, -13, 0, 13);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, '#e4e6e8'); g.addColorStop(1, '#9ea3a8');
  ctx.fillStyle = '#c9ccd0'; ctx.beginPath(); ctx.roundRect(14, -9, 20, 18, 4); ctx.fill();
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(32, -13, len - 32, 26, 10); ctx.fill();
  ctx.fillStyle = col; ctx.fillRect(len - 48, -13, 36, 26);
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(40, -8, len - 92, 4);
  ctx.fillStyle = rgba(col, 0.85); ctx.fillRect(64, -2, 54, 5);
  ctx.restore();
}
