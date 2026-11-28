// Bindu, the app's study companion (a little conical flask with a face and a leaf, frontend/src/components/mascot/Bindu.tsx),
// redrawn for the Scale Zoom style: flat solid shapes with one shade step, no outlines. Bindu is the film's guide;
// the magnifier in Bindu's hand is the camera's lens (the style's guide "whose eye or tool is the lens").
// Every pose value is a number so poses blend with easing (never switch in an if).
import React, { useId } from 'react';
import { C, clamp, lerp } from './theme';

export type BinduPose = {
  rot?: number;          // degrees, about the base
  sq?: number;           // squash: > 0 wider and shorter, < 0 taller
  look?: [number, number]; // eye direction -1..1
  lid?: number;          // 0..1 blink
  smile?: number;        // 0..1 (eyes bend into arches, mouth widens)
  wide?: number;         // 0..1 surprise (eyes open wider)
  wave?: number;         // liquid slosh phase (any number)
  mag?: number;          // 0..1 magnifier arm out
  magRot?: number;       // degrees, arm angle in Bindu's own frame (0 = to the right, -90 = up)
  flip?: number;         // 1 = magnifier on the right, -1 = mirrored (magnifier on the left); in between = turning
};

/** Screen position of the magnifier lens (the camera's lens: sight lines start here). */
export function binduLens(x: number, y: number, s: number, P: BinduPose = {}): [number, number] {
  const k = s / 138, q = P.sq || 0, kx = (1 + q) * (P.flip ?? 1), ky = 1 - q * 0.85;
  const mag = Math.max(0, Math.min(1, P.mag || 0)), ma = ((P.magRot ?? -20) * Math.PI) / 180;
  const mx = 96 + Math.cos(ma) * 34 * mag, my = 92 + Math.sin(ma) * 34 * mag;
  const lx = (mx + Math.cos(ma) * 26 * mag - 60) * k * kx, ly = (my + Math.sin(ma) * 26 * mag - 126) * k * ky;
  const a = ((P.rot || 0) * Math.PI) / 180;
  return [x + Math.cos(a) * lx - Math.sin(a) * ly, y + Math.sin(a) * lx + Math.cos(a) * ly];
}

const FLASK = 'M46 10 H74 V44 L106 112 Q110 126 96 126 H24 Q10 126 14 112 L46 44 Z';
const FLASK_LIT = 'M46 10 H70 V45 L100 108 Q103 120 92 120 H24 Q12 120 16 109 L46 44 Z';

/** Bindu standing with the base centre at (x, y), `s` = height in px. */
export const Bindu: React.FC<{ x: number; y: number; s: number; P?: BinduPose }> = ({ x, y, s, P = {} }) => {
  const id = useId().replace(/:/g, '');
  const k = s / 138, q = P.sq || 0, kx = (1 + q) * (P.flip ?? 1), ky = 1 - q * 0.85;
  const [lx, ly] = P.look || [0, 0];
  const sm = clamp(P.smile || 0), lid = clamp(P.lid || 0), wide = clamp(P.wide || 0);
  const ex = lx * 4, ey = ly * 3;
  const er = 5.2 * (1 + 0.25 * wide);
  const wv = P.wave || 0;
  const lvl = 82 + 2 * Math.sin(wv);
  const liquid = `M0 ${lvl} Q30 ${lvl - 6 * Math.sin(wv + 1)} 60 ${lvl} T120 ${lvl} V140 H0 Z`;
  const mag = clamp(P.mag || 0), ma = ((P.magRot ?? -20) * Math.PI) / 180;
  const ax = 96, ay = 92, len = 34 * mag;
  const mx = ax + Math.cos(ma) * len, my = ay + Math.sin(ma) * len;
  return (
    <g transform={`translate(${x},${y}) rotate(${P.rot || 0}) scale(${(k * kx).toFixed(4)},${(k * ky).toFixed(4)}) translate(-60,-126)`}>
      <defs>
        <clipPath id={`${id}b`}>
          <path d={FLASK} />
        </clipPath>
      </defs>
      {/* magnifier arm behind the glass */}
      {mag > 0.02 && (
        <g>
          <line x1={ax - 6} y1={ay} x2={mx} y2={my} stroke={C.mist} strokeWidth={6} strokeLinecap="round" />
          <line x1={mx} y1={my} x2={mx + Math.cos(ma) * 10 * mag} y2={my + Math.sin(ma) * 10 * mag} stroke={C.coralD} strokeWidth={9} strokeLinecap="round" />
          <g transform={`translate(${mx + Math.cos(ma) * 26 * mag},${my + Math.sin(ma) * 26 * mag}) scale(${mag})`}>
            <circle r={17} fill={C.creamD} />
            <circle r={14.5} fill={C.cream} cx={-1} cy={-1} />
            <circle r={11.5} fill={C.n3} />
            <circle r={4} cx={-4.5} cy={-4.5} fill={C.mist} />
          </g>
        </g>
      )}
      {/* glass */}
      <path d={FLASK} fill={C.creamD} />
      <path d={FLASK_LIT} fill={C.cream} />
      {/* liquid */}
      <g clipPath={`url(#${id}b)`}>
        <path d={liquid} fill={C.mintD} />
        <path d={liquid} fill={C.mint} transform="translate(-5,-3)" />
        <circle cx={40} cy={104} r={4} fill={C.cream} />
        <circle cx={76} cy={112} r={3} fill={C.cream} />
      </g>
      {/* rim + leaf (like the logo) */}
      <rect x={41} y={5} width={38} height={9} rx={4} fill={C.sunD} />
      <rect x={41} y={5} width={36} height={6.5} rx={3.5} fill={C.sun} />
      <path d="M74 8 Q92 -4 100 10 Q86 18 74 8 Z" fill={C.mintD} />
      <path d="M74 8 Q90 -2 98 8 Q86 13 74 8 Z" fill={C.mint} />
      {/* eyes: the eye itself bends into an arch for a smile; a lid comes down for a blink */}
      {[46, 74].map((cx) => (
        <g key={cx}>
          <clipPath id={`${id}e${cx}`}>
            <rect x={cx - 10} y={66 + ey - 10 + 20 * lid} width={20} height={20 * (1 - lid) + 0.01} />
          </clipPath>
          <g clipPath={`url(#${id}e${cx})`}>
            <circle cx={cx + ex} cy={66 + ey} r={er} fill={C.night} />
            {sm > 0.01 && <circle cx={cx + ex} cy={66 + ey + lerp(14, 3.2, sm)} r={er * 1.05} fill={C.cream} />}
            {sm < 0.99 && <circle cx={cx + ex + 1.6} cy={64.4 + ey} r={1.7 * (1 - sm)} fill={C.cream} />}
          </g>
          {lid > 0.7 && <rect x={cx - 7} y={66 + ey - 1.5} width={14} height={3} rx={1.5} fill={C.night} />}
        </g>
      ))}
      <ellipse cx={37} cy={76} rx={4.6} ry={3} fill={C.coral} />
      <ellipse cx={83} cy={76} rx={4.6} ry={3} fill={C.coral} />
      {/* mouth */}
      <path d={`M${53 - 3 * sm} 77 Q60 ${82 + 5 * sm} ${67 + 3 * sm} 77`} fill="none" stroke={C.night} strokeWidth={3} strokeLinecap="round" />
    </g>
  );
};
