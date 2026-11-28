// Scene 1 (0-26 s): the mystery of life. One continuous pull back in log space:
//   a glowing dot -> a heart muscle cell (about 0.1 mm) -> heart muscle tissue (the cells beat together) -> the heart
//   -> the whole body (heart beating, lungs breathing, cells busy, brain active) -> title LIFE PROCESSES, and Bindu (guide).
// Every level is drawn in its own units (µm, mm, m) inside one world frame (the body, in metres), through one camera:
//   screen = (p - C) * k + S0, k = 1920 / field of view. Levels too small to see are skipped; a too-small window
//   becomes a marker ring (the style's "readable scale" rule).
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Bindu } from './Bindu';
import { blobPath, blobPathF, Halo, ShadedCircle, ShadedEllipse, ShadedPath, ShadedRect, sparklePath, Stars } from './flat';
import { Instrument, Label, RiseText, Stop, WipeText, wipeK } from './Hud';
import { beat, blink, C, clamp, ebump, ei, eio, eo, FPS, kf, lerp, rng, S0, seg, smooth, spr, W, wob, wordAt } from './theme';

// ---------- words that drive the picture (video seconds) ----------
const T = {
  wondered: wordAt(0, 'wondered'),
  alive: wordAt(0, 'alive'),
  sleeping: wordAt(1, 'sleeping'),
  working: wordAt(1, 'working'),
  heart: wordAt(2, 'heart'),
  blood: wordAt(2, 'blood'),
  lungs: wordAt(2, 'lungs'),
  gases: wordAt(2, 'gases'),
  millions: wordAt(2, 'millions'),
  how: wordAt(3, 'how'),
  happen: wordAt(3, 'happen'),
  answer: wordAt(4, 'answer'),
  life: wordAt(4, 'life'),
  processes: wordAt(4, 'processes'),
};
export const SCENE1_END = 27.0;
const TITLE_OUT = SCENE1_END - 0.55;   // the title leaves before scene 2 brings the body back to the middle

// ---------- the world (metres, y down, origin = middle of the body) ----------
export const HEART_POS: [number, number] = [0.035, -0.36];
const SITE_MM: [number, number] = [-10, 4];   // where the tissue window sits on the heart wall (heart units: mm)
const SITE: [number, number] = [HEART_POS[0] + SITE_MM[0] * 1e-3, HEART_POS[1] + SITE_MM[1] * 1e-3];
const WINDOW_UM = 600;                         // radius of the tissue window (µm)

// ---------- camera ----------
export const LOG = {
  cell: Math.log10(166e-6), tissue: Math.log10(1.75e-3), heart: Math.log10(0.25), body: Math.log10(4.2),
};
const PULL = { a: [5.45, 7.9], b: [8.6, 10.25], c: [11.0, 12.7] } as const;
export const logfAt = (t: number) => kf(t, [
  [0, LOG.cell + 0.012], [PULL.a[0], LOG.cell - 0.004],
  [PULL.a[1], LOG.tissue], [PULL.b[0], LOG.tissue - 0.01],
  [PULL.b[1], LOG.heart], [PULL.c[0], LOG.heart - 0.012],
  [PULL.c[1], LOG.body], [17.6, LOG.body - 0.02], [20.0, LOG.body], [SCENE1_END, LOG.body - 0.012],
]);
const SHIFT = (t: number) => 1.12 * eio(seg(t, 16.9, 18.7));   // the body slides to the left third for the title
export function makeCam(logf: number, c: [number, number]) {
  const k = W / Math.pow(10, logf);
  return { logf, k, c, at: (p: [number, number]): [number, number] => [(p[0] - c[0]) * k + S0[0], (p[1] - c[1]) * k + S0[1]] };
}
export function camAt(t: number) {
  const logf = logfAt(t);
  const w1 = smooth((logf - Math.log10(0.06)) / (Math.log10(0.25) - Math.log10(0.06)));
  const w2 = smooth((logf - Math.log10(0.5)) / (LOG.body - Math.log10(0.5)));
  const a = [lerp(SITE[0], HEART_POS[0], w1), lerp(SITE[1], HEART_POS[1], w1)];
  return makeCam(logf, [lerp(a[0], 0, w2) + SHIFT(t), lerp(a[1], 0.07, w2)]);
}
export type Cam = ReturnType<typeof makeCam>;
/** SVG transform that draws a level whose local unit is `unit` metres, with its origin at world point `o`. */
export const levelTf = (cam: Cam, o: [number, number], unit: number) => {
  const [x, y] = cam.at(o);
  return `translate(${x.toFixed(2)},${y.toFixed(2)}) scale(${(cam.k * unit).toPrecision(6)})`;
};

// ---------- heart muscle tissue (µm, origin = the hero cell) ----------
type Cell = { x: number; y: number; len: number; wid: number; pop: number; hero?: boolean };
const TISSUE: Cell[] = (() => {
  const R = rng(5), out: Cell[] = [];
  for (let j = -22; j <= 22; j++) {
    const y0 = j * 30;
    const push = (cx: number, len: number) => {
      const wid = 20 + R() * 5, y = y0 + (j === 0 ? 0 : (R() - 0.5) * 4);
      const d = Math.hypot(cx, y);
      if (d > WINDOW_UM - 25) return;
      out.push({ x: cx, y, len, wid: j === 0 && cx === 0 ? 24 : wid, pop: PULL.a[0] - 0.1 + (d / WINDOW_UM) * 2.0 + R() * 0.12, hero: j === 0 && cx === 0 });
    };
    if (j === 0) {
      push(0, 104);
      for (let x = 58; x < 640;) { const L = 95 + R() * 35; push(x + L / 2, L); x += L + 6; }
      for (let x = -58; x > -640;) { const L = 95 + R() * 35; push(x - L / 2, L); x -= L + 6; }
    } else {
      for (let x = -640 + R() * 110; x < 640;) { const L = 95 + R() * 35; push(x + L / 2, L); x += L + 6; }
    }
  }
  return out;
})();
const MITO: [number, number][] = [[-30, -5.5], [-19, 5.5], [-36, 5], [22, -5.5], [32, 5], [17, 6]];

const CellShape: React.FC<{ c: Cell; t: number; pxPerUm: number }> = ({ c, t, pxPerUm }) => {
  const grow = c.hero ? spr(t, T.wondered + 0.12, 13, 6.5) : spr(t, c.pop, 15, 7);
  if (grow <= 0.001) return null;
  const b = t > T.alive ? beat(t - T.alive) : 0;
  const sx = grow * (1 - 0.06 * b), sy = grow * (1 + 0.03 * b);
  const { len, wid } = c;
  const detail = pxPerUm > 2.2;
  const nucK = c.hero ? spr(t, T.wondered - 0.04, 14, 7) : 1;
  const stri = c.hero ? eio(seg(t, T.wondered + 0.5, T.wondered + 1.2)) : 1;
  return (
    <g transform={`translate(${c.x},${c.y}) scale(${sx.toFixed(4)},${sy.toFixed(4)})`}>
      <ShadedRect x={-len / 2} y={-wid / 2} w={len} h={wid} rx={wid / 2} base={C.mint} shade={C.mintD} d={wid * 0.17} />
      {detail && Array.from({ length: Math.floor((len - 14) / 5) }, (_, i) => {
        const x = -len / 2 + 9 + i * 5;
        if (Math.abs(x) < 10 || (x + len / 2) / len > stri) return null;
        const h = wid / 2 - 3.2 - (Math.abs(x) > len / 2 - 14 ? 2.5 : 0);
        return <line key={i} x1={x} y1={-h} x2={x} y2={h} stroke={C.mintD} strokeWidth={0.9} strokeLinecap="round" />;
      })}
      {c.hero && detail && MITO.map(([mx, my], i) => {
        const p = spr(t, T.wondered + 0.65 + i * 0.13, 16, 7);
        return p > 0 ? <ShadedEllipse key={i} cx={mx} cy={my} rx={3.0 * p} ry={1.5 * p} base={C.coral} shade={C.coralD} /> : null;
      })}
      {pxPerUm > 0.5 && nucK > 0 && <ShadedEllipse cx={0} cy={0} rx={7 * nucK} ry={4.6 * nucK} base={C.blue} shade={C.blueD} />}
      {detail && nucK > 0.5 && <circle cx={-1.2} cy={-0.6} r={1.3 * nucK} fill={C.blueD} />}
    </g>
  );
};

const Tissue: React.FC<{ t: number; cam: Cam }> = ({ t, cam }) => {
  const pxPerUm = cam.k * 1e-6;
  if (pxPerUm * 100 < 2.5) return null;   // a cell would be under 2.5 px: skip the cells
  const [ox, oy] = cam.at(SITE);
  // the opening dot: a sun dot with two hard rings that becomes the nucleus
  const dotK = 1 - eio(seg(t, T.wondered, T.wondered + 0.35));
  const haloK = 1 - eio(seg(t, T.wondered - 0.1, T.wondered + 0.4));
  const breathe = 1 + 0.08 * Math.sin(t * 2 * Math.PI * 0.5);
  return (
    <g transform={levelTf(cam, SITE, 1e-6)}>
      <clipPath id="tissueWin">
        <circle cx={0} cy={0} r={WINDOW_UM} />
      </clipPath>
      <g clipPath="url(#tissueWin)">
        <circle cx={0} cy={0} r={WINDOW_UM} fill={C.night} />
        {haloK > 0 && <Halo x={0} y={0} r1={2.4 * haloK * breathe} r2={4.2 * haloK * breathe} />}
        {TISSUE.map((c, i) => {
          const sx = ox + c.x * pxPerUm, sy = oy + c.y * pxPerUm, m = c.len * pxPerUm;
          if (sx < -m || sx > W + m || sy < -m || sy > 1080 + m) return null;
          return <CellShape key={i} c={c} t={t} pxPerUm={pxPerUm} />;
        })}
        {dotK > 0 && <ShadedCircle cx={0} cy={0} r={1.05 * dotK} base={C.sun} shade={C.sunD} k={0.16} />}
      </g>
    </g>
  );
};

// ---------- the heart (mm, origin = its middle) ----------
const HEART_PTS: [number, number][] = [[-42, -24], [-30, -42], [-6, -46], [18, -40], [38, -26], [48, -2], [46, 24], [34, 46], [16, 58], [0, 50], [-22, 34], [-40, 10], [-46, -8]];
const HEART_D = blobPathF(HEART_PTS);
const Heart: React.FC<{ t: number }> = ({ t }) => {
  const b = beat(t - T.alive);
  const s = 1 - 0.045 * b;
  return (
    <g transform={`translate(${SITE_MM[0]},${SITE_MM[1]}) scale(${s.toFixed(4)}) translate(${-SITE_MM[0]},${-SITE_MM[1]})`}>
      {/* vessels behind: vena cava (blue), aorta (red arch), pulmonary artery (blue) */}
      <rect x={-41} y={-76} width={14} height={46} rx={6} fill={C.blueD} />
      <path d="M-6,-38 C-8,-66 -2,-78 14,-78 C28,-78 34,-66 32,-52" fill="none" stroke={C.coralD} strokeWidth={14} strokeLinecap="round" />
      <path d="M12,-40 L26,-64" fill="none" stroke={C.blue} strokeWidth={11} strokeLinecap="round" />
      <ShadedPath id="heartShade" d={HEART_D} base={C.coral} shade={C.coralD} dx={6} dy={6} />
      <path d="M2,-30 C10,-6 6,20 14,50" fill="none" stroke={C.coralD} strokeWidth={2.6} strokeLinecap="round" />
    </g>
  );
};

// ---------- the body (m) ----------
const TORSO = blobPath([[-0.2, -0.6], [0, -0.63], [0.2, -0.6], [0.2, -0.4], [0.16, -0.15], [0.18, 0.06], [0, 0.1], [-0.18, 0.06], [-0.16, -0.15], [-0.2, -0.4]].map(([x, y]) => [x * 1000, y * 1000] as [number, number]));
const LIMBS: [[number, number], [number, number], number][] = [
  [[-0.215, -0.55], [-0.275, 0.02], 0.085], [[0.215, -0.55], [0.275, 0.02], 0.085],
  [[-0.09, 0.04], [-0.105, 0.82], 0.115], [[0.09, 0.04], [0.105, 0.82], 0.115],
];
const ARTERIES: [number, number][][] = [
  [[0.03, -0.42], [0.012, -0.55], [0, -0.63], [0, -0.7]],
  [[0.02, -0.42], [-0.12, -0.5], [-0.205, -0.52], [-0.24, -0.3], [-0.27, -0.02]],
  [[0.05, -0.42], [0.14, -0.5], [0.205, -0.52], [0.24, -0.3], [0.27, -0.02]],
  [[0.03, -0.31], [0.0, -0.12], [-0.06, 0.05], [-0.095, 0.42], [-0.105, 0.8]],
  [[0.04, -0.31], [0.03, -0.12], [0.06, 0.05], [0.095, 0.42], [0.105, 0.8]],
];
const polyLen = (p: [number, number][]) => p.slice(1).reduce((a, q, i) => a + Math.hypot(q[0] - p[i][0], q[1] - p[i][1]), 0);
const pointOn = (p: [number, number][], s: number): [number, number] => {
  let d = clamp(s) * polyLen(p);
  for (let i = 1; i < p.length; i++) {
    const L = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
    if (d <= L) return [lerp(p[i - 1][0], p[i][0], d / L), lerp(p[i - 1][1], p[i][1], d / L)];
    d -= L;
  }
  return p[p.length - 1];
};
const SPARKS: { p: [number, number]; at: number; r: number; col: string; ph: number }[] = (() => {
  const R = rng(21), out: { p: [number, number]; at: number; r: number; col: string; ph: number }[] = [];
  const parts: [[number, number], [number, number], number][] = [...LIMBS, [[0, -0.55], [0, 0.0], 0.3]];
  for (let i = 0; i < 46; i++) {
    const [a, b, w] = parts[Math.floor(R() * parts.length * 0.999)];
    const s = R(), q: [number, number] = [lerp(a[0], b[0], s) + (R() - 0.5) * w * 0.7, lerp(a[1], b[1], s) + (R() - 0.5) * 0.03];
    out.push({ p: q, at: Math.hypot(q[0] - HEART_POS[0], q[1] - HEART_POS[1]) * 1.6 + R() * 0.25, r: 6 + R() * 5, col: R() < 0.5 ? C.cream : C.mint, ph: R() * 6.28 });
  }
  return out;
})();
const BRAIN_SPARKS: [number, number][] = [[-0.045, -0.79], [0.03, -0.8], [-0.015, -0.755], [0.05, -0.75], [-0.055, -0.745]];

const breathAt = (t: number) => (t < T.lungs ? 0 : 0.5 - 0.5 * Math.cos((2 * Math.PI * (t - T.lungs)) / 4));

/** `under`: extra parts in body metres, drawn under the lungs and heart (e.g. the food pipe). */
export const Body: React.FC<{ t: number; cam: Cam; under?: React.ReactNode }> = ({ t, cam, under }) => {
  const br = breathAt(t);
  const lung = (cx: number, rx: number, ry: number, id: string) => {
    const s = 1 + 0.07 * br;
    return (
      <g key={id} transform={`translate(${cx},-0.39) scale(${s.toFixed(4)}) translate(${-cx},0.39)`}>
        <ShadedEllipse cx={cx} cy={-0.39} rx={rx} ry={ry} base={C.mint} shade={C.mintD} k={0.14} />
        <path d={`M0,-0.5 Q${cx * 0.4},-0.47 ${cx * 0.75},-0.4`} fill="none" stroke={C.mintD} strokeWidth={3} vectorEffect="non-scaling-stroke" strokeLinecap="round" />
      </g>
    );
  };
  const showFine = cam.logf > -0.35;
  return (
    <g transform={levelTf(cam, [0, 0], 1)}>
      {/* silhouette */}
      {LIMBS.map(([a, b, w], i) => (
        <g key={i}>
          <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={C.blueD} strokeWidth={w} strokeLinecap="round" />
          <line x1={a[0] - w * 0.08} y1={a[1] - w * 0.06} x2={b[0] - w * 0.08} y2={b[1] - w * 0.1} stroke={C.blue} strokeWidth={w * 0.8} strokeLinecap="round" />
        </g>
      ))}
      <g transform="scale(0.001)">
        <ShadedPath id="torso" d={TORSO} base={C.blue} shade={C.blueD} dx={16} dy={14} />
      </g>
      <rect x={-0.05} y={-0.7} width={0.1} height={0.12} rx={0.03} fill={C.blueD} />
      <rect x={-0.05} y={-0.7} width={0.088} height={0.11} rx={0.03} fill={C.blue} />
      <ShadedCircle cx={0} cy={-0.755} r={0.115} base={C.blue} shade={C.blueD} k={0.12} />
      {/* brain */}
      <ShadedEllipse cx={0} cy={-0.77} rx={0.082} ry={0.06} base={C.cream} shade={C.creamD} k={0.16} />
      {['M-0.05,-0.8 Q-0.03,-0.77 -0.045,-0.745', 'M0.0,-0.82 Q0.02,-0.79 0.0,-0.76', 'M0.045,-0.8 Q0.03,-0.775 0.05,-0.75'].map((d, i) => (
        <path key={i} d={d} fill="none" stroke={C.creamD} strokeWidth={3} vectorEffect="non-scaling-stroke" strokeLinecap="round" />
      ))}
      {under}
      {/* windpipe + lungs */}
      <line x1={0} y1={-0.62} x2={0} y2={-0.5} stroke={C.creamD} strokeWidth={0.024} strokeLinecap="round" />
      {lung(-0.088, 0.072, 0.125, 'lr')}
      {lung(0.092, 0.064, 0.112, 'll')}
      {/* blood vessels from the heart */}
      {showFine && ARTERIES.map((p, i) => (
        <polyline key={i} points={p.map((q) => q.join(',')).join(' ')} fill="none" stroke={C.coralD} strokeWidth={3.5} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {/* the heart (mm inside) */}
      <g transform={`translate(${HEART_POS[0]},${HEART_POS[1]}) scale(0.001)`}>
        <Heart t={t} />
      </g>
    </g>
  );
};

/** Things on the body drawn in screen space at a readable size: blood, air, busy cells, brain activity. */
export const BodyLife: React.FC<{ t: number; cam: Cam }> = ({ t, cam }) => {
  if (cam.logf < -0.95) return null;
  const out: React.ReactNode[] = [];
  // blood: coral dots travel out along the arteries after "blood"
  const bk = spr(t, T.blood, 12, 6);
  if (bk > 0) ARTERIES.forEach((p, i) => {
    for (let j = 0; j < 4; j++) {
      const s = (((t - T.blood) * 0.32 + j / 4 + i * 0.13) % 1 + 1) % 1;
      const [x, y] = cam.at(pointOn(p, s));
      const r = 5.5 * bk * Math.min(1, s * 8, (1 - s) * 8);
      if (r > 0.3) out.push(<circle key={`b${i}-${j}`} cx={x} cy={y} r={r} fill={C.coral} />);
    }
  });
  // air: cream dots go down the windpipe on each breath in
  if (t > T.lungs) {
    const ph = (((t - T.lungs) / 4) % 1 + 1) % 1;
    for (let j = 0; j < 3; j++) {
      const s = clamp(ph * 2 - j * 0.18);
      if (s <= 0 || s >= 1 || ph > 0.5) continue;
      const side = j % 2 ? 1 : -1;
      const p = pointOn([[0, -0.66], [0, -0.5], [side * 0.07, -0.42]], s);
      const [x, y] = cam.at(p);
      out.push(<circle key={`a${j}`} cx={x} cy={y} r={5} fill={C.cream} />);
    }
  }
  // busy cells: sparkles spread from the heart on "millions of cells", then breathe slowly
  SPARKS.forEach((s, i) => {
    const k = spr(t, T.millions + s.at, 14, 7);
    if (k <= 0) return;
    const [x, y] = cam.at(s.p);
    const r = s.r * k * (1 + 0.16 * Math.sin(2 * Math.PI * 0.3 * t + s.ph));
    out.push(<path key={`s${i}`} d={sparklePath(x, y, r)} fill={s.col} />);
  });
  // brain activity: sun sparkles light one after another
  BRAIN_SPARKS.forEach((p, i) => {
    const k = spr(t, T.millions + 0.9 + i * 0.35, 14, 7);
    if (k <= 0) return;
    const [x, y] = cam.at(p);
    const r = 8 * k * (1 + 0.16 * Math.sin(2 * Math.PI * 0.3 * t + i));
    out.push(<path key={`n${i}`} d={sparklePath(x, y, r)} fill={C.sun} />);
  });
  return <g>{out}</g>;
};

/** The tissue window's rim: locks with a spring once the window edge is in view, becomes a marker, then leaves. */
const WindowRing: React.FC<{ t: number; cam: Cam }> = ({ t, cam }) => {
  const lock = spr(t, PULL.a[1] - 0.05, 15, 7);
  const out = 1 - ei(seg(t, PULL.c[0] - 0.1, PULL.c[0] + 0.35));
  if (lock <= 0 || out <= 0) return null;
  const [x, y] = cam.at(SITE);
  const r = Math.max(WINDOW_UM * 1e-6 * cam.k, 13) * (1 + 0.1 * (1 - lock)) * out;
  return (
    <g>
      <circle cx={x} cy={y} r={r + 9} fill="none" stroke={C.sun} strokeWidth={2.5} strokeDasharray="10 9" />
      <circle cx={x} cy={y} r={r} fill="none" stroke={C.sun} strokeWidth={5} />
    </g>
  );
};

export const STOPS: Stop[] = [
  { at: LOG.cell, color: C.mint, label: 'cell' },
  { at: LOG.tissue, color: C.mint, label: 'tissue' },
  { at: LOG.heart, color: C.coral, label: 'heart' },
  { at: LOG.body, color: C.blue, label: 'body' },
];

// ---------- Bindu's entrance (screen space) ----------
export const BINDU_AT = { x: 830, y: 880, s: 210 };
export function binduPose(t: number) {
  const t0 = T.happen - 0.35;
  const up = spr(t, t0, 11, 6.5);
  const rise = seg(t, t0, t0 + 0.35);
  const land = wob(t, t0 + 0.32, 18, 7);
  const nod = wob(t, T.processes + 0.05, 20, 8) + wob(t, T.life + 0.05, 20, 8);
  return {
    x: BINDU_AT.x + 3 * Math.sin(t * 2 * Math.PI * 0.3),
    y: BINDU_AT.y + (1 - up) * 460 + 5 * Math.sin(t * 2 * Math.PI * 0.45 + 0.5),
    s: BINDU_AT.s,
    P: {
      sq: (rise > 0 && rise < 1 ? -0.12 * Math.sin(Math.PI * rise) : 0) + 0.1 * Math.max(0, land) + 0.03 * nod,
      rot: kf(t, [[t0, 0], [t0 + 0.5, 0], [t0 + 0.85, -9], [T.answer, -9], [T.answer + 0.4, 6]]) + 3 * nod,
      look: [kf(t, [[t0, -0.6], [T.answer, -0.8], [T.answer + 0.35, 1]]), kf(t, [[t0, -0.2], [T.answer, -0.4], [T.answer + 0.35, -0.6]])] as [number, number],
      wide: ebump(t, t0 + 0.45, t0 + 0.6, T.answer - 0.3, T.answer),
      smile: eio(seg(t, T.life - 0.1, T.life + 0.2)),
      lid: Math.max(blink(t, T.how + 0.9), blink(t, T.processes + 1.6), blink(t, SCENE1_END - 1.2)),
      wave: t * 2.2,
      mag: spr(t, T.answer + 0.5, 13, 6.5),
      magRot: -48 + 6 * Math.sin(t * 1.3),
    },
  };
}

export const Scene1: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const cam = camAt(t);
  const starZoom = Math.pow(10, -(cam.logf - LOG.cell) * 0.03);
  const heartAnchor = cam.at([HEART_POS[0] + 0.035, HEART_POS[1] - 0.03]);
  const lungAnchor = cam.at([0.115, -0.42]);
  const hero = cam.at([SITE[0] + 34e-6, SITE[1] - 11e-6]);
  const winEdge = cam.at([SITE[0] + WINDOW_UM * 0.82e-6, SITE[1] - WINDOW_UM * 0.57e-6]);
  const b = binduPose(t);
  return (
    <AbsoluteFill style={{ background: C.night }}>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080">
        <Stars seed={3} n={150} zoom={starZoom} />
        {cam.logf > -1.7 && <Body t={t} cam={cam} />}
        {cam.logf > -3.05 && cam.logf <= -1.7 && (
          <g transform={levelTf(cam, HEART_POS, 1e-3)}>
            <Heart t={t} />
          </g>
        )}
        <Tissue t={t} cam={cam} />
        <WindowRing t={t} cam={cam} />
        <BodyLife t={t} cam={cam} />

        <Label t={t} tIn={T.alive + 0.45} tOut={PULL.a[0] - 0.2} ax={hero[0]} ay={hero[1]} lx={1400} ly={250} tag="A HEART MUSCLE CELL" line="about 0.1 mm long" />
        <Label t={t} tIn={PULL.a[1] - 0.25} tOut={PULL.b[0] + 0.1} ax={winEdge[0]} ay={winEdge[1]} lx={1010} ly={120} tag="HEART MUSCLE" line="its cells beat together" />
        <Label t={t} tIn={PULL.b[1] - 0.35} tOut={PULL.c[0] + 0.1} ax={heartAnchor[0]} ay={heartAnchor[1]} lx={1330} ly={250} tag="HEART" line="pumps blood" tagColor={C.coral} />
        <Label t={t} tIn={PULL.c[1] - 0.3} tOut={T.millions + 1.3} ax={lungAnchor[0]} ay={lungAnchor[1]} lx={1250} ly={330} tag="LUNGS" line="exchange gases" tagColor={C.mint} />

        {/* title */}
        <WipeText t={t} tIn={T.answer} tOut={TITLE_OUT} x={940} y={330} text="CBSE CLASS 10 · SCIENCE · CHAPTER 5" size={20} color={C.mist} weight={600} spacing={4} caps />
        <RiseText t={t} tIn={T.life - 0.05} tOut={TITLE_OUT} x={934} y={470} size={136} text="LIFE" />
        <RiseText t={t} tIn={T.processes - 0.05} tOut={TITLE_OUT + 0.08} x={934} y={610} size={136} text="PROCESSES" />
        <rect x={940} y={648} width={150 * eo(seg(t, T.processes + 0.4, T.processes + 0.9)) * (1 - eio(seg(t, TITLE_OUT, TITLE_OUT + 0.3)))} height={6} rx={3} fill={C.sun} />
        <WipeText t={t} tIn={T.processes + 0.75} tOut={TITLE_OUT - 0.1} x={940} y={720} text="The essential activities that maintain life." size={40} color={C.cream} />

        <Bindu x={b.x} y={b.y} s={b.s} P={b.P} />

        {/* first frame is never empty: the chapter tag, top left */}
        <g>
          <rect x={56} y={48} width={478 * wipeK(t, -1, T.answer - 0.6, 0.6)} height={46} rx={10} fill={C.night} />
          <WipeText t={t} tIn={-1} tOut={T.answer - 0.6} x={84} y={80} text="CLASS 10 SCIENCE · LIFE PROCESSES" size={18} color={C.mist} weight={600} spacing={3} caps />
        </g>
        <Instrument logf={cam.logf} stops={STOPS} show={eo(seg(t, 0.2, 0.8))} />
      </svg>
    </AbsoluteFill>
  );
};

// ---------- sound cues for scene 1: [video seconds, sfx file (public/sfx), volume] ----------
const HEARTBEATS: [number, string, number][] = [];
for (let k = 0; ; k++) {
  const tb = T.alive + (k + 0.08) / 1.2 - 0.03;
  if (tb > PULL.c[1] + 0.6) break;
  const v = tb < PULL.b[1] ? 0.32 : 0.32 * (1 - seg(tb, PULL.c[0], PULL.c[1] + 0.6));
  HEARTBEATS.push([tb, 'life-heartbeat', v]);
}
export const SFX1: [number, string, number][] = [
  [0.25, 'life-chime', 0.22],
  [T.wondered + 0.05, 'life-pop', 0.3],
  ...MITO.map((_, i) => [T.wondered + 0.65 + i * 0.13, 'life-blip', 0.12] as [number, string, number]),
  ...HEARTBEATS,
  [PULL.a[0] + 0.1, 'life-whoosh', 0.22],
  [PULL.a[1] - 0.05, 'life-lock', 0.3],
  [PULL.b[0], 'life-whoosh', 0.22],
  [PULL.c[0], 'life-whoosh', 0.22],
  [T.lungs + 0.1, 'life-breath', 0.22],
  [T.lungs + 4.1, 'life-breath', 0.16],
  [T.millions + 0.1, 'life-sparkle', 0.2],
  [T.millions + 0.9, 'life-sparkle', 0.14],
  [T.happen - 0.32, 'life-pop', 0.3],
  [T.answer + 0.5, 'life-chime', 0.18],
  [T.life - 0.05, 'life-pluck', 0.28],
  [T.processes - 0.05, 'life-pluck', 0.28],
  [T.processes + 0.75, 'life-blip', 0.1],
];
