// Scene 3 (49-97 s): nutrition. Through the Nutrition ring into a daylight forest (the style's one change of ground):
// food for energy, growth and repair; a rabbit hops in (not all organisms feed the same way). Push to a leaf: sunlight,
// carbon dioxide (from the air, through stomata) and water (from the roots); dive into a leaf window drawn after NCERT
// Fig. 5.1 (upper epidermis, palisade cells full of chloroplasts, spongy cells, lower epidermis with guard cells):
// glucose is made, oxygen leaves. The NCERT equation (Class 10, Ch 5, p. 82) + "Autotrophic nutrition". Back out: the
// rabbit eats ("Heterotrophic nutrition"). Back through the ring to the body: digestion begins in the mouth, continues in
// the stomach, is completed in the small intestine, where nutrients are absorbed (NCERT p. 86).
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Bindu, BinduPose } from './Bindu';
import { blobPathF, ShadedCircle, ShadedEllipse, ShadedPath, ShadedRect, Stars } from './flat';
import { Instrument, Label, Stop, WipeText } from './Hud';
import { Body, BodyLife, Cam, LOG, levelTf, makeCam } from './Scene1';
import { B2, Icon, NewOrgans, PROCS, R_IN, Scene2Art, SCENE2_END } from './Scene2';
import { backE, blink, C, clamp, eio, eo, ei, FONT, FPS, kf, lerp, lineEnd, rng, S0, seg, smooth, spr, wob, wordAt } from './theme';

export const S3_FROM = SCENE2_END;
const T = {
  energy: wordAt(8, 'energy'), not: wordAt(8, 'not'), way: wordAt(8, 'way'),
  green: wordAt(9, 'green'), photosynthesis: wordAt(9, 'photosynthesis'), sunlight: wordAt(9, 'sunlight'), carbon: wordAt(9, 'carbon'),
  water: wordAt(9, 'water'), chlorophyll: wordAt(9, 'chlorophyll'), glucose: wordAt(9, 'glucose'), oxygen: wordAt(9, 'oxygen'),
  autotrophic: wordAt(10, 'autotrophic'),
  animals: wordAt(11, 'animals'), depend: wordAt(11, 'depend'), heterotrophic: wordAt(11, 'heterotrophic'),
  humans: wordAt(12, 'humans'), mouth: wordAt(12, 'mouth'), stomach: wordAt(12, 'stomach'), completed: wordAt(12, 'completed'),
  intestine: wordAt(12, 'intestine'), nutrients: wordAt(12, 'nutrients'), absorbed: wordAt(12, 'absorbed'),
};
export const SCENE3_END = lineEnd(12) + 2.1;

// ---------- the two ring transitions ----------
const NUT = PROCS[0];                        // the Nutrition icon: the ring we go through
const DIVE = [S3_FROM + 0.1, S3_FROM + 1.5] as const;
const BACK = [lineEnd(11) + 0.25, lineEnd(11) + 1.45] as const;   // back out through the ring to the body
const ZMAX = 14;
/** 0 = scene 2 picture, 1 = the plant world fills the frame. */
const ringK = (t: number) => (t < BACK[0] ? eio(seg(t, DIVE[0], DIVE[1])) : 1 - eio(seg(t, BACK[0], BACK[1])));

// ---------- plant world (metres, y down, ground at y = 0) ----------
const SKY = C.blue, SKY1 = '#6189FE', SKY2 = '#7698FE';   // one and two steps lighter than the sky, for the sun's rings
const PLANT_X = -0.2;
const HERO = { base: [PLANT_X + 0.006, -0.4] as [number, number], ang: -22 };
const LEAF_C: [number, number] = [HERO.base[0] + 0.062 * Math.cos((HERO.ang * Math.PI) / 180), HERO.base[1] + 0.062 * Math.sin((HERO.ang * Math.PI) / 180)];
const SITE_MM: [number, number] = [6, -5];
const SITE: [number, number] = (() => {
  const a = (HERO.ang * Math.PI) / 180, [x, y] = SITE_MM;
  return [LEAF_C[0] + (x * Math.cos(a) - y * Math.sin(a)) * 1e-3, LEAF_C[1] + (x * Math.sin(a) + y * Math.cos(a)) * 1e-3];
})();
const WIN_UM = 300;
const WIDE_C: [number, number] = [0.05, -0.42];
const LOGW = Math.log10(2.6), LOGLEAF = Math.log10(0.3), LOGCELL = Math.log10(750e-6);
const PUSH = [T.green + 0.05, T.green + 1.9] as const;
const INTO = [T.chlorophyll - 0.15, T.chlorophyll + 1.35] as const;
const OUT = [T.animals + 0.05, T.animals + 1.9] as const;
const plantLogf = (t: number) => kf(t, [[S3_FROM, LOGW], [PUSH[0], LOGW - 0.015], [PUSH[1], LOGLEAF], [INTO[0], LOGLEAF - 0.03], [INTO[1], LOGCELL], [OUT[0], LOGCELL - 0.01], [OUT[1], LOGW], [SCENE3_END, LOGW - 0.02]]);
const plantCam = (t: number) => {
  const logf = plantLogf(t);
  const w1 = smooth((LOGW - logf) / (LOGW - LOGLEAF));
  const w2 = smooth((Math.log10(0.08) - logf) / (Math.log10(0.08) - Math.log10(0.004)));
  const a = [lerp(WIDE_C[0], LEAF_C[0], w1), lerp(WIDE_C[1], LEAF_C[1], w1)];
  return makeCam(logf, [lerp(a[0], SITE[0], w2), lerp(a[1], SITE[1], w2)]);
};

const LEAF_D = blobPathF([[-60, 0], [-44, -16], [-12, -27], [24, -22], [50, -9], [62, 0], [50, 9], [24, 22], [-12, 27], [-44, 16]]);
const Leaf: React.FC<{ base: [number, number]; ang: number; len: number; id: string; sway?: number; pxPerM: number }> = ({ base, ang, len, id, sway = 0, pxPerM }) => {
  const vw = clamp(2.2e-3 * (len / 0.124) * pxPerM, 1.2, 10);
  const a = ang + sway, s = len / 0.124;
  return (
    <g transform={`translate(${base[0]},${base[1]}) rotate(${a}) scale(${(s * 1e-3).toFixed(6)}) translate(62,0)`}>
      <ShadedPath id={id} d={LEAF_D} base={C.mint} shade={C.mintD} dx={0} dy={5} />
      <path d="M-58,0 L56,0 M-30,0 L-14,-16 M-30,0 L-14,16 M0,0 L16,-15 M0,0 L16,15 M26,0 L38,-10 M26,0 L38,10" fill="none" stroke={C.mintD} strokeWidth={vw} vectorEffect="non-scaling-stroke" strokeLinecap="round" />
    </g>
  );
};
const LEAVES: { y: number; side: number; len: number }[] = [
  { y: -0.14, side: -1, len: 0.11 }, { y: -0.22, side: 1, len: 0.12 }, { y: -0.31, side: -1, len: 0.125 }, { y: -0.49, side: -1, len: 0.11 }, { y: -0.57, side: 1, len: 0.09 },
];
const TREES = (() => {
  const R = rng(41), out: { x: number; h: number; kind: number }[] = [];
  for (let x = -1.45; x < 1.6; x += 0.16 + R() * 0.14) if (Math.abs(x - PLANT_X) > 0.12) out.push({ x, h: 0.32 + R() * 0.36, kind: R() < 0.5 ? 0 : 1 });
  return out;
})();
const CLOUDS: [number, number, number][] = [[-0.45, -0.98, 0.09], [0.62, -1.02, 0.07], [1.15, -0.88, 0.06]];
const SUN: [number, number] = [-0.95, -0.98];

/** Rabbit (mm, ground at y = 0, facing left), ~0.26 m with ears. */
const Rabbit: React.FC<{ chew: number; ear: number }> = ({ chew, ear }) => (
  <g>
    <ellipse cx={6} cy={-4} rx={70} ry={8} fill={C.mintD} />
    <g transform={`rotate(${ear} -70 -128)`}>
      <line x1={-82} y1={-128} x2={-98} y2={-232} stroke={C.creamD} strokeWidth={26} strokeLinecap="round" />
      <line x1={-82} y1={-134} x2={-95} y2={-220} stroke={C.coral} strokeWidth={9} strokeLinecap="round" />
    </g>
    <g transform={`rotate(${ear * 0.6} -60 -128)`}>
      <line x1={-62} y1={-128} x2={-56} y2={-236} stroke={C.creamD} strokeWidth={26} strokeLinecap="round" />
      <line x1={-64} y1={-128} x2={-60} y2={-232} stroke={C.cream} strokeWidth={20} strokeLinecap="round" />
      <line x1={-62} y1={-136} x2={-58} y2={-222} stroke={C.coral} strokeWidth={8} strokeLinecap="round" />
    </g>
    <ShadedEllipse cx={8} cy={-58} rx={74} ry={54} base={C.cream} shade={C.creamD} />
    <ShadedCircle cx={86} cy={-74} r={20} base={C.cream} shade={C.creamD} />
    <ellipse cx={40} cy={-8} rx={30} ry={10} fill={C.creamD} />
    <g transform={`translate(0,${chew * 4})`}>
      <ShadedCircle cx={-70} cy={-102} r={42} base={C.cream} shade={C.creamD} />
      <circle cx={-84} cy={-110} r={7} fill={C.night} />
      <circle cx={-86} cy={-112} r={2.2} fill={C.cream} />
      <ellipse cx={-110} cy={-96} rx={7} ry={5} fill={C.coral} />
      <ellipse cx={-62} cy={-88} rx={9} ry={5} fill={C.coral} />
    </g>
  </g>
);
const RABBIT_X = 0.56, CLOVER_X = 0.4;
const rabbitAt = (t: number) => {
  // hops in from the right on "not all", three hops; then nibbles the clover after "depend"
  const hops = [T.not - 0.1, T.not + 0.45, T.not + 1.0];
  const xs = [1.7, 1.25, 0.86, RABBIT_X];
  let x = xs[0], y = 0;
  hops.forEach((h, i) => {
    const p = seg(t, h, h + 0.42);
    if (t >= h) x = lerp(xs[i], xs[i + 1], eio(p));
    if (p > 0 && p < 1) y = -0.07 * Math.sin(Math.PI * p);
  });
  const eat = t > T.depend - 0.2 ? 1 : 0;
  const chew = eat * Math.max(0, Math.sin((t - T.depend) * 2 * Math.PI * 3.2));
  return { x: x - 0.05 * eio(seg(t, T.depend - 0.4, T.depend)), y, chew, ear: 4 * Math.sin(t * 2.3) + 8 * wob(t, T.not + 1.42, 14, 5) };
};

const PlantWorld: React.FC<{ t: number; cam: Cam }> = ({ t, cam }) => {
  const sway = (ph: number) => 2.2 * Math.sin(t * 2 * Math.PI * 0.35 + ph);
  const rb = rabbitAt(t);
  const bites = Math.floor(clamp((t - T.depend) / 0.9, 0, 3));
  const wide = cam.logf > -1.4;
  return (
    <g>
      <rect x={-2000} y={-2000} width={6000} height={6000} fill={SKY} />
      <g transform={levelTf(cam, [0, 0], 1)}>
        {wide && (
          <g>
            <circle cx={SUN[0]} cy={SUN[1]} r={0.2} fill={SKY1} />
            <circle cx={SUN[0]} cy={SUN[1]} r={0.145} fill={SKY2} />
            <ShadedCircle cx={SUN[0]} cy={SUN[1]} r={0.085} base={C.sun} shade={C.sunD} k={0.12} />
            {CLOUDS.map(([x, y, r], i) => (
              <g key={i}>
                <ShadedEllipse cx={x} cy={y} rx={r * 1.6} ry={r * 0.6} base={C.cream} shade={C.creamD} k={0.2} />
                <ShadedCircle cx={x - r * 0.35} cy={y - r * 0.35} r={r * 0.6} base={C.cream} shade={C.creamD} k={0.15} />
              </g>
            ))}
            <ellipse cx={-0.9} cy={0.02} rx={1.1} ry={0.26} fill={C.mintD} />
            <ellipse cx={0.9} cy={0.03} rx={1.2} ry={0.22} fill={C.mintD} />
            {TREES.map((tr, i) => tr.kind === 0 ? (
              <g key={i}>
                <rect x={tr.x - 0.014} y={-tr.h * 0.4} width={0.028} height={tr.h * 0.4} fill={C.creamD} />
                <ShadedCircle cx={tr.x} cy={-tr.h * 0.62} r={tr.h * 0.3} base={C.mint} shade={C.mintD} k={0.16} />
              </g>
            ) : (
              <g key={i}>
                <rect x={tr.x - 0.012} y={-tr.h * 0.25} width={0.024} height={tr.h * 0.25} fill={C.creamD} />
                <path d={`M${tr.x},${-tr.h} L${tr.x + tr.h * 0.24},${-tr.h * 0.22} L${tr.x - tr.h * 0.24},${-tr.h * 0.22} Z`} fill={C.mintD} />
                <path d={`M${tr.x},${-tr.h} L${tr.x + tr.h * 0.12},${-tr.h * 0.22} L${tr.x - tr.h * 0.24},${-tr.h * 0.22} Z`} fill={C.mint} />
              </g>
            ))}
          </g>
        )}
        {/* ground: grass, then the soil in cut-away with the roots */}
        <rect x={-6} y={0} width={12} height={6} fill={C.n2} />
        <rect x={-3} y={-0.004} width={6} height={0.026} fill={C.mint} />
        <path d={`M${PLANT_X},0 L${PLANT_X},0.16 M${PLANT_X},0.04 L${PLANT_X - 0.07},0.12 M${PLANT_X},0.07 L${PLANT_X + 0.08},0.14 M${PLANT_X - 0.035},0.08 L${PLANT_X - 0.06},0.17 M${PLANT_X + 0.04},0.1 L${PLANT_X + 0.03},0.18`} fill="none" stroke={C.creamD} strokeWidth={3} vectorEffect="non-scaling-stroke" strokeLinecap="round" />
        {/* the plant */}
        <path d={`M${PLANT_X},0 L${PLANT_X},-0.64`} fill="none" stroke={C.mintD} strokeWidth={0.016} strokeLinecap="round" />
        {LEAVES.map((l, i) => <Leaf key={i} id={`lf${i}`} base={[PLANT_X + l.side * 0.006, l.y]} ang={l.side < 0 ? 180 + 22 : -22} len={l.len} sway={sway(i)} pxPerM={cam.k} />)}
        <Leaf id="hero" base={HERO.base} ang={HERO.ang} len={0.124} pxPerM={cam.k} />
        {/* the clover the rabbit eats: three leaves, bitten one by one */}
        <path d={`M${CLOVER_X},0 L${CLOVER_X},-0.07`} stroke={C.mintD} strokeWidth={0.008} strokeLinecap="round" />
        {[[-0.03, -0.08], [0.0, -0.1], [0.03, -0.08]].map(([dx, dy], i) => i < 3 - bites && <ShadedCircle key={i} cx={CLOVER_X + dx} cy={dy} r={0.026} base={C.mint} shade={C.mintD} k={0.16} />)}
        <g transform={`translate(${rb.x},${rb.y}) scale(0.00092)`}>
          <Rabbit chew={rb.chew} ear={rb.ear} />
        </g>
      </g>
    </g>
  );
};

// ---------- leaf cross-section (µm, after NCERT Fig. 5.1) ----------
const PALISADE = Array.from({ length: 16 }, (_, i) => -300 + 20 + i * 38);
const SPONGY = (() => { const R = rng(17), out: [number, number, number][] = []; for (let x = -290; x < 300; x += 46 + R() * 10) out.push([x, 30 + R() * 30, 17 + R() * 6]); return out; })();
const STOMA_X = 30;
const CrossSection: React.FC<{ t: number; cam: Cam }> = ({ t, cam }) => {
  const px = cam.k * 1e-6;
  if (px * 30 < 3) return null;
  const glu = (i: number) => spr(t, T.glucose + 0.05 + (i % 7) * 0.08, 14, 7);
  const rays = eo(seg(t, INTO[1] - 0.6, INTO[1]));
  return (
    <g transform={levelTf(cam, SITE, 1e-6)}>
      <clipPath id="leafWin"><circle r={WIN_UM} /></clipPath>
      <g clipPath="url(#leafWin)">
        <circle r={WIN_UM} fill={SKY} />
        {/* sunlight from above */}
        {rays > 0 && [-200, -110, -20, 70, 160, 250].map((x, i) => {
          const y0 = -300, y1 = -125, off = ((t * 120 + i * 17) % 40);
          return <line key={i} x1={x - 60} y1={y0} x2={x - 60 + (y1 - y0) * 0.33 * rays} y2={y0 + (y1 - y0) * rays} stroke={C.sun} strokeWidth={4} strokeDasharray="14 10" strokeDashoffset={-off} strokeLinecap="round" />;
        })}
        {/* upper epidermis + cuticle */}
        <rect x={-320} y={-132} width={640} height={6} fill={C.creamD} />
        {Array.from({ length: 12 }, (_, i) => <ShadedRect key={i} x={-310 + i * 54} y={-125} w={50} h={22} rx={8} base={C.cream} shade={C.creamD} />)}
        {/* palisade cells with chloroplasts */}
        {PALISADE.map((x, i) => (
          <g key={i}>
            <ShadedRect x={x} y={-98} w={32} h={96} rx={12} base={C.cream} shade={C.creamD} d={4} />
            {Array.from({ length: 6 }, (_, j) => (
              <g key={j}>
                <ellipse cx={x + 7} cy={-86 + j * 15} rx={4.2} ry={6} fill={C.mintD} />
                <ellipse cx={x + 23} cy={-80 + j * 15} rx={4.2} ry={6} fill={C.mint} />
              </g>
            ))}
            {glu(i) > 0 && <path d={hexPath(x + 15, -50 + (i % 3) * 14, 6 * glu(i))} fill={C.sun} />}
          </g>
        ))}
        {/* spongy cells with air spaces */}
        {SPONGY.map(([x, y, r], i) => (
          <g key={i}>
            <ShadedCircle cx={x} cy={y} r={r} base={C.cream} shade={C.creamD} />
            <ellipse cx={x - r * 0.3} cy={y} rx={3.6} ry={5} fill={C.mintD} />
            <ellipse cx={x + r * 0.35} cy={y - r * 0.2} rx={3.6} ry={5} fill={C.mint} />
          </g>
        ))}
        {/* lower epidermis with a stoma (two guard cells round a pore) */}
        {Array.from({ length: 12 }, (_, i) => {
          const x = -310 + i * 54;
          return Math.abs(x + 25 - STOMA_X) < 40 ? null : <ShadedRect key={i} x={x} y={100} w={50} h={20} rx={8} base={C.cream} shade={C.creamD} />;
        })}
        <ShadedEllipse cx={STOMA_X - 13} cy={110} rx={11} ry={13} base={C.mint} shade={C.mintD} />
        <ShadedEllipse cx={STOMA_X + 13} cy={110} rx={11} ry={13} base={C.mint} shade={C.mintD} />
        <Gases t={t} />
      </g>
    </g>
  );
};
function hexPath(x: number, y: number, r: number) {
  let d = '';
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + Math.PI / 6; d += `${i ? 'L' : 'M'}${(x + Math.cos(a) * r).toFixed(2)},${(y + Math.sin(a) * r).toFixed(2)}`; }
  return d + 'Z';
}
/** CO2 drifts in through the stoma; oxygen bubbles out after "oxygen". */
const Gases: React.FC<{ t: number }> = ({ t }) => {
  const out: React.ReactNode[] = [];
  for (let i = 0; i < 6; i++) {
    const ph = ((t * 0.32 + i / 6) % 1 + 1) % 1;
    const p = ph < 0.5 ? [STOMA_X - 80 + i * 26 + ph * 2 * (80 - i * 26), 240 - ph * 2 * 130] : [STOMA_X + (ph - 0.5) * 2 * (i * 30 - 75), 110 - (ph - 0.5) * 2 * 70];
    out.push(<circle key={`c${i}`} cx={p[0]} cy={p[1]} r={6} fill={C.mist} />);
  }
  if (t > T.oxygen) for (let i = 0; i < 5; i++) {
    const ph = (((t - T.oxygen) * 0.45 + i / 5) % 1 + 1) % 1;
    const k = backE(seg(t, T.oxygen + i * 0.1, T.oxygen + i * 0.1 + 0.2), 2);
    out.push(<circle key={`o${i}`} cx={STOMA_X + (i - 2) * 18 * ph} cy={118 + ph * 160} r={7 * k} fill="none" stroke={C.cream} strokeWidth={3} />);
  }
  return <g>{out}</g>;
};

/** Plant-world dots in screen space: water up the stem, CO2 drifting to the leaf, sunrays on the leaf. */
const LeafFlows: React.FC<{ t: number; cam: Cam }> = ({ t, cam }) => {
  if (cam.logf < -1.5 || cam.logf > -0.2) return null;
  const out: React.ReactNode[] = [];
  const sunK = eo(seg(t, T.sunlight - 0.1, T.sunlight + 0.4)) * (1 - ei(seg(t, INTO[0] + 0.4, INTO[0] + 0.8)));
  const [lx, ly] = cam.at(LEAF_C);
  if (sunK > 0) for (let i = 0; i < 5; i++) {
    const ex = lx - 110 + i * 55, ey = ly - 30 + i * 12, sx = ex - 520, sy = ey - 700;
    const off = (t * 160 + i * 31) % 48;
    out.push(<line key={`r${i}`} x1={sx} y1={sy} x2={lerp(sx, ex, sunK)} y2={lerp(sy, ey, sunK)} stroke={C.sun} strokeWidth={5} strokeDasharray="22 16" strokeDashoffset={-off} strokeLinecap="round" />);
  }
  const co2 = eo(seg(t, T.carbon - 0.1, T.carbon + 0.3)) * (1 - ei(seg(t, INTO[0] + 0.4, INTO[0] + 0.8)));
  if (co2 > 0) for (let i = 0; i < 7; i++) {
    const ph = ((t * 0.28 + i / 7) % 1 + 1) % 1;
    const sx = lx + 520 - i * 20, sy = ly + 260 + (i % 3) * 40;
    const x = lerp(sx, lx + 10, ph), y = lerp(sy, ly + 18, ph);
    out.push(<circle key={`c${i}`} cx={x} cy={y} r={9 * co2 * Math.min(1, (1 - ph) * 6)} fill={C.mist} />);
  }
  const wk = eo(seg(t, T.water - 0.1, T.water + 0.3)) * (1 - ei(seg(t, INTO[0] + 0.4, INTO[0] + 0.8)));
  if (wk > 0) {
    const path: [number, number][] = [[PLANT_X, 0.0], [PLANT_X, -0.2], [PLANT_X, -0.395], HERO.base, LEAF_C, [LEAF_C[0] + 0.04, LEAF_C[1] - 0.015]];
    for (let i = 0; i < 8; i++) {
      const s = ((t * 0.3 + i / 8) % 1 + 1) % 1;
      const seg_ = s * (path.length - 1), j = Math.floor(seg_), f = seg_ - j;
      const p: [number, number] = [lerp(path[j][0], path[j + 1][0], f), lerp(path[j][1], path[j + 1][1], f)];
      const [x, y] = cam.at(p);
      out.push(<circle key={`w${i}`} cx={x} cy={y} r={8 * wk} fill={C.blueD} />);
      out.push(<circle key={`w2${i}`} cx={x - 2} cy={y - 2} r={5.5 * wk} fill={C.cream} />);
    }
  }
  return <g>{out}</g>;
};

/** The leaf window's rim: locks just before the dive, then leaves as we land inside. */
const LeafRing: React.FC<{ t: number; cam: Cam }> = ({ t, cam }) => {
  const lock = spr(t, INTO[0] - 0.25, 15, 7);
  const out = 1 - ei(seg(t, OUT[0] + 0.6, OUT[0] + 1.0));
  if (lock <= 0 || out <= 0) return null;
  const [x, y] = cam.at(SITE);
  const r = Math.max(WIN_UM * 1e-6 * cam.k, 16) * (1 + 0.12 * (1 - lock)) * out;
  return (
    <g>
      <circle cx={x} cy={y} r={r + 9} fill="none" stroke={C.sun} strokeWidth={2.5} strokeDasharray="10 9" />
      <circle cx={x} cy={y} r={r} fill="none" stroke={C.sun} strokeWidth={5} />
    </g>
  );
};

// ---------- the equation card (NCERT Class 10 Science, Ch 5, p. 82) ----------
const EQ_IN = T.glucose + 0.9, EQ_OUT = T.animals - 0.2;
const Sub: React.FC<{ s: string }> = ({ s }) => <tspan fontSize={32} baselineShift={-12}>{s}</tspan>;
const EquationCard: React.FC<{ t: number }> = ({ t }) => {
  const k = eo(seg(t, EQ_IN, EQ_IN + 0.5)) * (1 - ei(seg(t, EQ_OUT, EQ_OUT + 0.4)));
  if (k <= 0) return null;
  const rise = spr(t, EQ_IN + 0.25, 15, 7.5) * (1 - eo(seg(t, EQ_OUT, EQ_OUT + 0.35)));
  const x0 = 200, w = 1520, y0 = 90;
  return (
    <g>
      <clipPath id="eqclip"><rect x={x0} y={y0} width={w * k} height={330} /></clipPath>
      <g clipPath="url(#eqclip)">
        <rect x={x0} y={y0} width={w} height={330} rx={18} fill={C.night} />
        <rect x={x0 + 28} y={y0 + 30} width={6} height={44} rx={3} fill={C.sun} />
        <WipeText t={t} tIn={T.autotrophic - 0.05} tOut={EQ_OUT} x={x0 + 52} y={y0 + 62} text="AUTOTROPHIC NUTRITION" size={26} color={C.sun} weight={600} spacing={4} caps />
        <WipeText t={t} tIn={T.autotrophic + 0.5} tOut={EQ_OUT} x={x0 + 52 + 470} y={y0 + 62} text="Plants make their own food." size={34} color={C.cream} />
        <clipPath id="eqrise"><rect x={x0} y={y0 + 110} width={w} height={170} /></clipPath>
        <g clipPath="url(#eqrise)" transform={`translate(0,${(1 - rise) * 170})`}>
          <text x={x0 + 60} y={y0 + 210} fontFamily={FONT} fontWeight={600} fontSize={56} fill={C.cream}>
            6CO<Sub s="2" /> + 12H<Sub s="2" />O
          </text>
          <line x1={x0 + 480} y1={y0 + 192} x2={x0 + 730} y2={y0 + 192} stroke={C.sun} strokeWidth={5} strokeLinecap="round" />
          <path d={`M${x0 + 720},${y0 + 180} L${x0 + 742},${y0 + 192} L${x0 + 720},${y0 + 204} Z`} fill={C.sun} />
          <text x={x0 + 608} y={y0 + 170} textAnchor="middle" fontFamily={FONT} fontWeight={500} fontSize={28} fill={C.mint}>Chlorophyll</text>
          <text x={x0 + 608} y={y0 + 232} textAnchor="middle" fontFamily={FONT} fontWeight={500} fontSize={28} fill={C.sun}>Sunlight</text>
          <text x={x0 + 772} y={y0 + 210} fontFamily={FONT} fontWeight={600} fontSize={56} fill={C.cream}>
            C<Sub s="6" />H<Sub s="12" />O<Sub s="6" /> + 6O<Sub s="2" /> + 6H<Sub s="2" />O
          </text>
          <text x={x0 + 872} y={y0 + 262} textAnchor="middle" fontFamily={FONT} fontWeight={500} fontSize={26} fill={C.mist}>(glucose)</text>
        </g>
        <text x={x0 + w - 40} y={y0 + 310} textAnchor="end" fontFamily={FONT} fontWeight={600} fontSize={17} letterSpacing={3} fill={C.mist}>NCERT CLASS 10 SCIENCE · CHAPTER 5 · PAGE 82</text>
      </g>
    </g>
  );
};

// ---------- digestion in the body ----------
const HUMAN_LOG0 = LOG.body - 0.032, HUMAN_LOG1 = Math.log10(1.5);
const PUSH_H = [BACK[1] + 0.05, BACK[1] + 1.6] as const;
const humanCam = (t: number) => {
  const k = eio(seg(t, PUSH_H[0], PUSH_H[1]));
  return makeCam(lerp(HUMAN_LOG0, HUMAN_LOG1, k) - 0.015 * seg(t, PUSH_H[1], SCENE3_END), [lerp(0, 0.24, k), lerp(0.07, -0.36, k)]);
};
const GUT_IN: [number, number][] = [[0, -0.69], [-0.012, -0.64], [-0.016, -0.5], [-0.01, -0.36], [0.01, -0.28], [0.03, -0.25], [0.05, -0.235]];
const COIL: [number, number][] = (() => {
  const pts: [number, number][] = [[0.085, -0.215], [0.085, -0.17]];
  const rows = [-0.155, -0.125, -0.095, -0.065, -0.035];
  rows.forEach((y, i) => { const a = i % 2 ? -0.085 : 0.085, b = -a; pts.push([a, y], [b, y]); if (i < rows.length - 1) pts.push([b, (y + rows[i + 1]) / 2]); });
  return pts;
})();
const polyAt = (p: [number, number][], s: number): [number, number] => {
  const L = p.slice(1).map((q, i) => Math.hypot(q[0] - p[i][0], q[1] - p[i][1])), tot = L.reduce((a, b) => a + b, 0);
  let d = clamp(s) * tot;
  for (let i = 0; i < L.length; i++) { if (d <= L[i]) return [lerp(p[i][0], p[i + 1][0], d / L[i]), lerp(p[i][1], p[i + 1][1], d / L[i])]; d -= L[i]; }
  return p[p.length - 1];
};
const smoothPoly = (p: [number, number][]) => p.map((q, i) => `${i ? 'L' : 'M'}${q[0]},${q[1]}`).join(' ');
const Gullet: React.FC = () => (
  <g>
    <path d={smoothPoly(GUT_IN.slice(0, 5))} fill="none" stroke={C.creamD} strokeWidth={0.02} strokeLinecap="round" strokeLinejoin="round" />
    <path d={smoothPoly(GUT_IN.slice(0, 5))} fill="none" stroke={C.cream} strokeWidth={0.012} strokeLinecap="round" strokeLinejoin="round" transform="translate(-0.002,-0.002)" />
  </g>
);
const Intestine: React.FC<{ t: number }> = ({ t }) => {
  const k = spr(t, PUSH_H[1] - 0.6, 12, 6.5);
  if (k <= 0) return null;
  return (
    <g>
      <path d={smoothPoly(COIL)} fill="none" stroke={C.creamD} strokeWidth={0.024 * k} strokeLinecap="round" strokeLinejoin="round" />
      <path d={smoothPoly(COIL)} fill="none" stroke={C.cream} strokeWidth={0.016 * k} strokeLinecap="round" strokeLinejoin="round" transform="translate(-0.002,-0.002)" />
    </g>
  );
};
const MOUTH: [number, number] = [0, -0.69];
const Digestion: React.FC<{ t: number; cam: Cam }> = ({ t, cam }) => {
  const out: React.ReactNode[] = [];
  // the food: a sun dot from the mouth, down the food pipe to the stomach (churns), then along the small intestine
  const born = spr(t, T.mouth - 0.1, 14, 7);
  if (born > 0) {
    let p: [number, number];
    if (t < T.stomach - 0.55) p = MOUTH;
    else if (t < T.stomach + 0.1) p = polyAt(GUT_IN, eio(seg(t, T.stomach - 0.55, T.stomach + 0.1)));
    else if (t < T.completed) { const a = (t - T.stomach) * 7; p = [0.045 + 0.01 * Math.cos(a), -0.235 + 0.006 * Math.sin(a)]; }
    else p = polyAt(COIL, eio(seg(t, T.completed, T.intestine + 0.9)));
    const shrink = 1 - 0.55 * seg(t, T.stomach, T.intestine + 0.9);
    const [x, y] = cam.at(p);
    out.push(<circle key="food" cx={x} cy={y} r={13 * born * shrink + 4} fill={C.sunD} />);
    out.push(<circle key="food2" cx={x - 2} cy={y - 2} r={(13 * born * shrink + 4) * 0.78} fill={C.sun} />);
  }
  // nutrients absorbed: mint dots leave the intestine walls into the blood
  if (t > T.nutrients) {
    const R = rng(77);
    for (let i = 0; i < 22; i++) {
      const s = R(), base = polyAt(COIL, s), ang = R() * Math.PI * 2;
      const ph = (((t - T.nutrients) * 0.6 + R()) % 1 + 1) % 1;
      const k = backE(seg(t, T.nutrients + i * 0.04, T.nutrients + i * 0.04 + 0.2), 2);
      const p: [number, number] = [base[0] + Math.cos(ang) * 0.035 * ph, base[1] + Math.sin(ang) * 0.035 * ph];
      const [x, y] = cam.at(p);
      out.push(<circle key={`n${i}`} cx={x} cy={y} r={7 * k * (1 - ph * 0.6)} fill={C.mint} />);
    }
  }
  return <g>{out}</g>;
};

const STOPS3: Stop[] = [
  { at: LOGCELL, color: C.mint, label: 'leaf cells' },
  { at: LOGLEAF, color: C.mint, label: 'leaf' },
  { at: LOGW, color: C.mint, label: 'plant' },
];

export const Scene3: React.FC = () => {
  const t = useCurrentFrame() / FPS + S3_FROM;
  const rk = ringK(t);
  const inHuman = t >= BACK[0];
  const pc = plantCam(t);
  const hc = humanCam(t);
  // the ring travels between the Nutrition icon and the middle of the screen
  const ringC: [number, number] = [lerp(NUT.cx, S0[0], rk), lerp(NUT.cy, S0[1], rk)];
  const z = Math.exp(Math.log(ZMAX) * rk);
  const ringR = R_IN * z;
  const s_in = z / ZMAX;
  const plantTf = `translate(${ringC[0]},${ringC[1]}) scale(${s_in.toFixed(5)}) translate(${-S0[0]},${-S0[1]})`;
  const outerTf = `translate(${ringC[0]},${ringC[1]}) scale(${z.toFixed(5)}) translate(${-NUT.cx},${-NUT.cy})`;
  const showOuter = rk < 0.999;
  // the leaf leader anchors (screen, plant world)
  const leafA = pc.at([LEAF_C[0] + 0.03, LEAF_C[1] - 0.012]);
  const stemA = pc.at([PLANT_X + 0.004, -0.36]);
  const rb = rabbitAt(t);
  const rabbitA = pc.at([rb.x - 0.02, -0.17]);
  const plantA = pc.at([PLANT_X + 0.04, -0.5]);
  const siteA = pc.at([SITE[0] + 90e-6, SITE[1] - 60e-6]);
  // human frame anchors
  const zoomH = hc.k / makeCam(HUMAN_LOG0, [0, 0.07]).k;
  const torso = hc.at([0.24, -0.36]);
  const flyTf = `translate(${torso[0]},${torso[1]}) scale(${zoomH.toFixed(4)}) translate(${-torso[0]},${-torso[1]})`;
  const aimNut = (Math.atan2(NUT.cy - (B2.y - 80), (NUT.cx - B2.x) * -1) * 180) / Math.PI;
  const bP: BinduPose = { flip: -1, mag: 1, magRot: aimNut, look: [0.6, -0.3], wave: t * 2.2, smile: 0.4, lid: Math.max(blink(t, BACK[1] + 0.3), blink(t, T.stomach + 0.4)), rot: 3 * Math.sin(t * 1.1) };
  const mouthA = hc.at([0.01, -0.69]), stomachA = hc.at([0.07, -0.25]), coilA = hc.at([0.09, -0.1]);
  return (
    <AbsoluteFill style={{ background: C.night }}>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080">
        {/* the human side: scene 2's picture on the way in; the body + digestion on the way back */}
        {showOuter && !inHuman && <g transform={outerTf}><Scene2Art t={t} hud={false} /></g>}
        {showOuter && inHuman && (
          <g>
            <Stars seed={3} n={150} zoom={Math.pow(10, -(hc.logf - LOG.cell) * 0.03)} />
            <Body t={t} cam={hc} under={<Gullet />} />
            <NewOrgans t={t} cam={hc} />
            <g transform={levelTf(hc, [0, 0], 1)}><Intestine t={t} /></g>
            <BodyLife t={t} cam={hc} />
            <Digestion t={t} cam={hc} />
            <g transform={flyTf}>
              {PROCS.map((p) => <Icon key={p.key} p={p} t={t} />)}
              <Bindu x={B2.x} y={B2.y + 5 * Math.sin(t * 2 * Math.PI * 0.45)} s={B2.s} P={bP} />
            </g>
            <Label t={t} tIn={T.mouth - 0.15} tOut={T.stomach - 0.3} ax={mouthA[0]} ay={mouthA[1]} lx={1080} ly={260} tag="MOUTH" line="digestion begins" tagColor={C.sun} />
            <Label t={t} tIn={T.stomach - 0.1} tOut={T.completed - 0.15} ax={stomachA[0]} ay={stomachA[1]} lx={1080} ly={420} tag="STOMACH" line="digestion continues" tagColor={C.sun} />
            <Label t={t} tIn={T.completed} tOut={T.nutrients - 0.15} ax={coilA[0]} ay={coilA[1]} lx={1080} ly={600} tag="SMALL INTESTINE" line="digestion is completed" tagColor={C.sun} />
            <Label t={t} tIn={T.nutrients} tOut={SCENE3_END + 1} ax={coilA[0]} ay={coilA[1]} lx={1080} ly={600} tag="SMALL INTESTINE" line="nutrients are absorbed into the blood" tagColor={C.mint} />
          </g>
        )}
        {/* the ring and the plant world inside it */}
        {rk > 0.001 && (
          <g>
            <clipPath id="nutRing"><circle cx={ringC[0]} cy={ringC[1]} r={ringR} /></clipPath>
            <g clipPath="url(#nutRing)">
              <g transform={plantTf}>
                <PlantWorld t={t} cam={pc} />
                <CrossSection t={t} cam={pc} />
                <LeafRing t={t} cam={pc} />
                <LeafFlows t={t} cam={pc} />
              </g>
            </g>
            {showOuter && <circle cx={ringC[0]} cy={ringC[1]} r={ringR} fill="none" stroke={C.sun} strokeWidth={5} />}
          </g>
        )}
        {/* plant-world labels (screen space, full frame only) */}
        {rk >= 0.999 && (
          <g>
            <Label t={t} tIn={T.energy - 0.3} tOut={T.not - 0.3} ax={plantA[0]} ay={plantA[1]} lx={620} ly={210} tag="EVERY ORGANISM NEEDS FOOD" line="for energy, growth and repair" />
            <Label t={t} tIn={T.photosynthesis - 0.1} tOut={T.sunlight - 0.25} ax={leafA[0]} ay={leafA[1]} lx={1180} ly={250} tag="PHOTOSYNTHESIS" line="green plants make their own food" tagColor={C.mint} />
            <Label t={t} tIn={T.carbon} tOut={T.water - 0.15} ax={leafA[0]} ay={leafA[1] + 30} lx={1180} ly={250} tag="CARBON DIOXIDE" line="from the air, through tiny pores" tagColor={C.mist} />
            <Label t={t} tIn={T.water} tOut={INTO[0] - 0.05} ax={stemA[0]} ay={stemA[1]} lx={1180} ly={250} tag="WATER" line="from the roots" tagColor={C.cream} />
            <Label t={t} tIn={INTO[1] - 0.25} tOut={T.glucose - 0.1} ax={siteA[0]} ay={siteA[1]} lx={1240} ly={170} tag="CHLOROPLASTS" line="hold the green chlorophyll" tagColor={C.mint} />
            <Label t={t} tIn={T.glucose} tOut={EQ_IN - 0.2} ax={siteA[0]} ay={siteA[1]} lx={1240} ly={170} tag="GLUCOSE IS MADE" line="and oxygen is released" tagColor={C.sun} />
            <Label t={t} tIn={T.heterotrophic - 0.1} tOut={BACK[0] - 0.1} ax={rabbitA[0]} ay={rabbitA[1]} lx={1050} ly={210} tag="HETEROTROPHIC NUTRITION" line="depend on other organisms for food" tagColor={C.coral} />
            <EquationCard t={t} />
            <Instrument logf={pc.logf} stops={STOPS3} show={1} />
          </g>
        )}
        {inHuman && rk < 0.001 && <Instrument logf={hc.logf} stops={STOPS3.slice(0, 0).concat([{ at: HUMAN_LOG1, color: C.coral, label: 'torso' }, { at: LOG.body, color: C.blue, label: 'body' }])} show={1} />}
      </svg>
    </AbsoluteFill>
  );
};

export const SFX3: [number, string, number][] = [
  [DIVE[0], 'life-whoosh', 0.24],
  [T.not - 0.1, 'life-pop', 0.16], [T.not + 0.45, 'life-pop', 0.14], [T.not + 1.0, 'life-pop', 0.14],
  [PUSH[0], 'life-whoosh', 0.2],
  [T.sunlight - 0.05, 'life-chime', 0.16],
  [T.carbon, 'life-blip', 0.1], [T.water, 'life-blip', 0.1],
  [INTO[0] - 0.25, 'life-lock', 0.26], [INTO[0], 'life-whoosh', 0.22],
  [T.glucose + 0.05, 'life-sparkle', 0.16], [T.oxygen, 'life-blip', 0.1],
  [EQ_IN + 0.25, 'life-pluck', 0.24],
  [OUT[0], 'life-whoosh', 0.22],
  [T.depend, 'life-blip', 0.08], [T.depend + 0.9, 'life-blip', 0.08], [T.depend + 1.8, 'life-blip', 0.08],
  [T.heterotrophic - 0.1, 'life-chime', 0.16],
  [BACK[0], 'life-whoosh', 0.22], [PUSH_H[0], 'life-whoosh', 0.18],
  [T.mouth - 0.1, 'life-pop', 0.24], [T.stomach, 'life-blip', 0.12], [T.completed, 'life-blip', 0.12],
  [T.nutrients, 'life-sparkle', 0.18],
];
