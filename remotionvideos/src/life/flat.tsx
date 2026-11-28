// Flat drawing helpers for the Scale Zoom style: solid fills, one shade step, hard two-ring glows. No outlines,
// no gradients, no blur. The "shade step" is drawn without clip paths: the whole shape in the shade colour, then the
// base colour on a slightly smaller copy pushed toward the light (upper left), which leaves a crescent at the lower right.
import React from 'react';
import { C, r1, rng, W, H } from './theme';

/** Closed Catmull-Rom curve through points -> smooth SVG path. */
export function blobPath(pts: [number, number][]) {
  const n = pts.length;
  let d = `M${r1(pts[0][0])},${r1(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${r1(c1[0])},${r1(c1[1])} ${r1(c2[0])},${r1(c2[1])} ${r1(p2[0])},${r1(p2[1])}`;
  }
  return d + 'Z';
}
/** Same, with full precision (for shapes drawn in small local units, e.g. mm or µm, then scaled up). */
export function blobPathF(pts: [number, number][]) {
  const n = pts.length, f = (v: number) => v.toFixed(3);
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`;
  }
  return d + 'Z';
}

/** Circle with one shade step (crescent lower right). */
export const ShadedCircle: React.FC<{ cx: number; cy: number; r: number; base: string; shade: string; k?: number }> = ({ cx, cy, r, base, shade, k = 0.14 }) => (
  <>
    <circle cx={cx} cy={cy} r={r} fill={shade} />
    <circle cx={cx - r * k * 0.7} cy={cy - r * k * 0.7} r={r * (1 - k)} fill={base} />
  </>
);
/** Ellipse with one shade step. */
export const ShadedEllipse: React.FC<{ cx: number; cy: number; rx: number; ry: number; base: string; shade: string; k?: number; rot?: number }> = ({ cx, cy, rx, ry, base, shade, k = 0.16, rot = 0 }) => (
  <g transform={rot ? `rotate(${rot} ${cx} ${cy})` : undefined}>
    <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={shade} />
    <ellipse cx={cx - rx * k * 0.6} cy={cy - ry * k * 0.6} rx={rx * (1 - k * 0.6)} ry={ry * (1 - k)} fill={base} />
  </g>
);
/** Rounded rectangle with one shade step. */
export const ShadedRect: React.FC<{ x: number; y: number; w: number; h: number; rx: number; base: string; shade: string; d?: number }> = ({ x, y, w, h, rx, base, shade, d }) => {
  const s = d ?? Math.min(w, h) * 0.16;
  return (
    <>
      <rect x={x} y={y} width={w} height={h} rx={rx} fill={shade} />
      <rect x={x} y={y} width={w - s} height={h - s} rx={Math.max(0, rx - s * 0.3)} fill={base} />
    </>
  );
};
/** Any path with one shade step: the shade copy is the shape itself, the lit copy is clipped to it and shifted. */
export const ShadedPath: React.FC<{ id: string; d: string; base: string; shade: string; dx: number; dy: number }> = ({ id, d, base, shade, dx, dy }) => (
  <>
    <defs>
      <clipPath id={id}>
        <path d={d} />
      </clipPath>
    </defs>
    <path d={d} fill={shade} />
    <g clipPath={`url(#${id})`}>
      <path d={d} fill={base} transform={`translate(${-dx},${-dy})`} />
    </g>
  </>
);

/** Flat glow: two hard rings one and two steps lighter than the night ground. */
export const Halo: React.FC<{ x: number; y: number; r1: number; r2: number }> = ({ x, y, r1: a, r2: b }) => (
  <>
    <circle cx={x} cy={y} r={b} fill={C.n2} />
    <circle cx={x} cy={y} r={a} fill={C.n3} />
  </>
);

export const sparklePath = (x: number, y: number, r: number) => {
  const k = r * 0.2;
  return `M${x},${y - r}Q${x + k},${y - k} ${x + r},${y}Q${x + k},${y + k} ${x},${y + r}Q${x - k},${y + k} ${x - r},${y}Q${x - k},${y - k} ${x},${y - r}Z`;
};

/** Static dust / stars in screen space (they never flicker), shifted by a parallax offset. */
export const Stars: React.FC<{ seed: number; n: number; ox?: number; oy?: number; zoom?: number }> = ({ seed, n, ox = 0, oy = 0, zoom = 1 }) => {
  const R = rng(seed);
  const dots: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const x0 = R() * W * 1.6 - W * 0.3, y0 = R() * H * 1.6 - H * 0.3, k = R();
    const x = (x0 - W / 2) * zoom + W / 2 + ox, y = (y0 - H / 2) * zoom + H / 2 + oy;
    if (x < -10 || x > W + 10 || y < -10 || y > H + 10) continue;
    const r = k < 0.7 ? 1.3 + R() * 1.2 : 2.2 + R() * 1.6;
    dots.push(<circle key={i} cx={r1(x)} cy={r1(y)} r={r1(r)} fill={k < 0.6 ? C.n3 : k < 0.92 ? C.mist : C.cream} />);
  }
  return <>{dots}</>;
};
