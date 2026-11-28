// Scene 2 (27-49 s): what are life processes? The body comes back to the middle, Bindu hops to the right and turns to
// face it. On each spoken name a process icon locks in a corner (Bindu's magnifier fires a dotted sight line at it) and a
// leader runs to its organ: nutrition -> stomach, respiration -> working muscle cells (energy is released in cells, not in
// the lungs: scene 4 says breathing and respiration are not the same), transportation -> heart, excretion -> kidneys.
// "Together": a dotted loop joins the four. "Alive": the body gets its two-ring glow.
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Bindu, binduLens, BinduPose } from './Bindu';
import { blobPath, Halo, ShadedEllipse, ShadedPath, Stars } from './flat';
import { Instrument, WipeText } from './Hud';
import { Body, BodyLife, binduPose, Cam, HEART_POS, levelTf, LOG, makeCam, SCENE1_END, STOPS } from './Scene1';
import { backE, beat, blink, C, ebump, eio, eo, FONT, FPS, kf, lerp, lineEnd, seg, spr, wob, wordAt } from './theme';

export const S2_FROM = SCENE1_END;
const T = {
  start: S2_FROM,
  maintenance: wordAt(5, 'maintenance'),
  alive1: wordAt(5, 'alive'),
  four: wordAt(6, 'four'),
  nutrition: wordAt(6, 'nutrition'),
  respiration: wordAt(6, 'respiration'),
  transportation: wordAt(6, 'transportation'),
  excretion: wordAt(6, 'excretion'),
  different: wordAt(7, 'different'),
  together: wordAt(7, 'together'),
  alive: wordAt(7, 'alive'),
};
export const SCENE2_END = lineEnd(7) + 2.0;

// ---------- camera: the body glides back to the middle ----------
const LOGF = LOG.body - 0.012;
const camAt2 = (t: number) => makeCam(LOGF - 0.02 * seg(t, S2_FROM, SCENE2_END), [1.12 * (1 - eio(seg(t, S2_FROM + 0.2, S2_FROM + 1.9))), 0.07]);

// ---------- the four processes ----------
type Proc = { key: string; name: string; at: number; cx: number; cy: number; organ: [number, number]; organName: string };
export const PROCS: Proc[] = [
  { key: 'nutrition', name: 'Nutrition', at: T.nutrition, cx: 500, cy: 300, organ: [0.045, -0.23], organName: 'stomach' },
  { key: 'respiration', name: 'Respiration', at: T.respiration, cx: 1420, cy: 300, organ: [0.25, -0.31], organName: 'muscle cells' },
  { key: 'transportation', name: 'Transportation', at: T.transportation, cx: 500, cy: 720, organ: [HEART_POS[0] - 0.02, HEART_POS[1] + 0.015], organName: 'heart' },
  { key: 'excretion', name: 'Excretion', at: T.excretion, cx: 1420, cy: 720, organ: [0.08, -0.075], organName: 'kidneys' },
];
export const R_IN = 100, R_OUT = 122;

const APPLE = blobPath([[0, -30], [20, -40], [42, -26], [46, 4], [34, 34], [14, 46], [0, 40], [-14, 46], [-34, 34], [-46, 4], [-42, -26], [-20, -40]]);
const BOLT = 'M10,-56 L-30,8 L-4,8 L-14,56 L30,-10 L4,-10 L18,-56 Z';
const HEART_ICON = 'M0,44 C-30,22 -50,4 -50,-16 C-50,-36 -34,-46 -20,-46 C-10,-46 -3,-40 0,-32 C3,-40 10,-46 20,-46 C34,-46 50,-36 50,-16 C50,4 30,22 0,44 Z';
const KIDNEY = blobPath([[-8, -46], [14, -50], [32, -36], [36, -8], [32, 24], [16, 46], [-6, 46], [-24, 32], [-26, 14], [-12, 4], [-12, -10], [-26, -20], [-24, -38]]);

export const Icon: React.FC<{ p: Proc; t: number }> = ({ p, t }) => {
  const pop = spr(t, p.at - 0.06, 14, 6.5);
  if (pop <= 0) return null;
  // "each process performs a different function": a small pulse each, one after another
  const i = PROCS.indexOf(p);
  const pulse = wob(t, T.different + 0.1 + i * 0.2, 16, 6);
  const s = pop * (1 + 0.12 * pulse);
  let art: React.ReactNode = null;
  if (p.key === 'nutrition') {
    const sway = 6 * Math.sin(t * 2 * Math.PI * 0.4);
    art = (
      <g transform={`rotate(${sway}) translate(0,6)`}>
        <path d="M0,-34 Q2,-50 10,-58" fill="none" stroke={C.creamD} strokeWidth={6} strokeLinecap="round" />
        <path d="M6,-48 Q24,-66 40,-54 Q26,-40 6,-48 Z" fill={C.mintD} />
        <path d="M6,-48 Q22,-62 36,-54 Q24,-44 6,-48 Z" fill={C.mint} />
        <ShadedPath id="apple" d={APPLE} base={C.coral} shade={C.coralD} dx={7} dy={6} />
        <ellipse cx={-20} cy={-14} rx={6} ry={9} fill={C.cream} transform="rotate(25 -20 -14)" />
      </g>
    );
  } else if (p.key === 'respiration') {
    const flick = 1 + 0.05 * Math.sin(t * 2 * Math.PI * 1.1);
    art = (
      <g transform={`scale(${flick})`}>
        <ShadedPath id="bolt" d={BOLT} base={C.cream} shade={C.creamD} dx={5} dy={4} />
      </g>
    );
  } else if (p.key === 'transportation') {
    const b = 1 - 0.07 * beat(t - 3.32);
    art = (
      <g transform={`scale(${b}) translate(0,4)`}>
        <ShadedPath id="hicon" d={HEART_ICON} base={C.coral} shade={C.coralD} dx={7} dy={6} />
        <ellipse cx={-24} cy={-22} rx={7} ry={10} fill={C.cream} transform="rotate(35 -24 -22)" />
      </g>
    );
  } else {
    const drip = ((t - p.at) / 1.6) % 1;
    art = (
      <g>
        <path d="M-6,8 Q4,30 2,58" fill="none" stroke={C.creamD} strokeWidth={6} strokeLinecap="round" />
        <ShadedPath id="kicon" d={KIDNEY} base={C.coral} shade={C.coralD} dx={6} dy={5} />
        <ellipse cx={8} cy={-26} rx={6} ry={10} fill={C.cream} transform="rotate(-20 8 -26)" />
        {t > p.at + 0.5 && drip > 0 && <circle cx={2} cy={58 + drip * 26} r={6 * (1 - drip)} fill={C.cream} />}
      </g>
    );
  }
  return (
    <g transform={`translate(${p.cx},${p.cy}) scale(${s.toFixed(4)})`}>
      <Halo x={0} y={0} r1={R_IN} r2={R_OUT} />
      {art}
    </g>
  );
};

/** Sun ring that locks on the icon when it is named, then ripples out. */
const LockRing: React.FC<{ p: Proc; t: number; until: number }> = ({ p, t, until }) => {
  const lock = spr(t, p.at, 15, 7);
  if (lock <= 0) return null;
  const out = seg(t, until, until + 0.45);
  if (out >= 1) return null;
  const r = R_IN * (1 + 0.25 * (1 - lock)) + 50 * eo(out);
  return <circle cx={p.cx} cy={p.cy} r={r} fill="none" stroke={C.sun} strokeWidth={5 * (1 - out)} />;
};

/** Name under the icon: rises from below its baseline, centred. */
const Name: React.FC<{ p: Proc; t: number }> = ({ p, t }) => {
  const up = spr(t, p.at + 0.12, 15, 7.5);
  if (up <= 0) return null;
  const y = p.cy + R_OUT + 52;
  return (
    <g>
      <clipPath id={`nm-${p.key}`}>
        <rect x={p.cx - 260} y={y - 46} width={520} height={60} />
      </clipPath>
      <text clipPath={`url(#nm-${p.key})`} x={p.cx} y={y + 54 * (1 - up)} textAnchor="middle" fontFamily={FONT} fontWeight={600} fontSize={44} fill={C.cream}>{p.name}</text>
    </g>
  );
};

/** Dotted sight line from Bindu's lens to the icon: dots pop out one by one, stream toward it, then leave. */
const SightLine: React.FC<{ t: number; t0: number; a: [number, number]; b: [number, number]; until: number }> = ({ t, t0, a, b, until }) => {
  if (t < t0 || t > until + 0.5) return null;
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
  const gap = 30, n = Math.floor((L - R_OUT - 20) / gap);
  const shift = ((t - t0) * 42) % gap;
  const dots: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const d = 16 + i * gap + shift;
    if (d > L - R_OUT - 8) continue;
    const k = backE(seg(t, t0 + i * 0.018, t0 + i * 0.018 + 0.14), 2.2) * (1 - eio(seg(t, until + i * 0.012, until + i * 0.012 + 0.15)));
    if (k <= 0.01) continue;
    const r = 5 * k * Math.min(1, d / 40, (L - R_OUT - d) / 30);
    dots.push(<circle key={i} cx={a[0] + (dx / L) * d} cy={a[1] + (dy / L) * d} r={Math.max(0, r)} fill={C.sun} />);
  }
  return <g>{dots}</g>;
};

/** Leader from the icon's glow to its organ, drawn on after the lock; a small sun dot marks the organ. */
const OrganLeader: React.FC<{ p: Proc; t: number; cam: Cam }> = ({ p, t, cam }) => {
  const k = eo(seg(t, p.at + 0.3, p.at + 0.8));
  if (k <= 0) return null;
  const [ox, oy] = cam.at(p.organ);
  const dx = ox - p.cx, dy = oy - p.cy, L = Math.hypot(dx, dy);
  const sx = p.cx + (dx / L) * (R_OUT + 6), sy = p.cy + (dy / L) * (R_OUT + 6);
  const ex = lerp(sx, ox - (dx / L) * 10, k), ey = lerp(sy, oy - (dy / L) * 10, k);
  const dot = spr(t, p.at + 0.75, 15, 7);
  return (
    <g>
      <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={C.cream} strokeWidth={2.5} strokeLinecap="round" />
      {dot > 0 && <circle cx={ox} cy={oy} r={7 * dot} fill={C.sun} />}
      {dot > 0 && <circle cx={ox} cy={oy} r={14 * dot} fill="none" stroke={C.sun} strokeWidth={2.5} />}
    </g>
  );
};

// ---------- organs that join the body in this scene (metres, drawn in the body's frame) ----------
const STOMACH = blobPath([[-38, -26], [-14, -32], [10, -28], [36, -20], [48, 0], [40, 22], [14, 30], [-12, 24], [-22, 6], [-30, -8]]);
const KIDNEY_B = blobPath([[-6, -34], [10, -36], [22, -26], [25, -4], [22, 18], [10, 32], [-6, 32], [-18, 22], [-18, 10], [-9, 3], [-9, -7], [-18, -14], [-17, -27]]);
export const NewOrgans: React.FC<{ t: number; cam: Cam }> = ({ t, cam }) => {
  const st = spr(t, T.nutrition + 0.2, 14, 7), kd = spr(t, T.excretion + 0.2, 14, 7);
  return (
    <g transform={levelTf(cam, [0, 0], 1)}>
      {kd > 0 && (
        <g>
          {[-1, 1].map((sx) => (
            <g key={sx} transform={`translate(${sx * 0.08},-0.075) scale(${(sx * 0.0011 * kd).toFixed(6)},${(0.0011 * kd).toFixed(6)})`}>
              <ShadedPath id={`kb${sx}`} d={KIDNEY_B} base={C.coral} shade={C.coralD} dx={4} dy={4} />
            </g>
          ))}
          <path d={`M-0.072,-0.05 Q-0.05,0.0 -0.012,0.03 M0.072,-0.05 Q0.05,0.0 0.012,0.03`} fill="none" stroke={C.cream} strokeWidth={2.5 * kd} vectorEffect="non-scaling-stroke" strokeLinecap="round" />
          <ShadedEllipse cx={0} cy={0.04} rx={0.026 * kd} ry={0.02 * kd} base={C.cream} shade={C.creamD} />
        </g>
      )}
      {st > 0 && (
        <g transform={`translate(0.045,-0.23) scale(${(0.0012 * st).toFixed(6)})`}>
          <ShadedPath id="stomach" d={STOMACH} base={C.cream} shade={C.creamD} dx={6} dy={5} />
        </g>
      )}
    </g>
  );
};

// ---------- the loop that joins the four ("together") ----------
const LOOP: [number, number][] = (() => {
  const [a, b, c, d] = [PROCS[0], PROCS[1], PROCS[3], PROCS[2]].map((p) => [p.cx, p.cy] as [number, number]);
  const pts: [number, number][] = [];
  const edge = (p: [number, number], q: [number, number]) => { for (let i = 0; i < 40; i++) pts.push([lerp(p[0], q[0], i / 40), lerp(p[1], q[1], i / 40)]); };
  edge(a, b); edge(b, c); edge(c, d); edge(d, a);
  return pts;
})();
const LOOP_LEN = LOOP.reduce((s, p, i) => s + Math.hypot(p[0] - LOOP[(i + 1) % LOOP.length][0], p[1] - LOOP[(i + 1) % LOOP.length][1]), 0);
const loopAt = (d: number): [number, number] => {
  d = ((d % LOOP_LEN) + LOOP_LEN) % LOOP_LEN;
  for (let i = 0; i < LOOP.length; i++) {
    const p = LOOP[i], q = LOOP[(i + 1) % LOOP.length], L = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (d <= L) return [lerp(p[0], q[0], d / L), lerp(p[1], q[1], d / L)];
    d -= L;
  }
  return LOOP[0];
};
const Loop: React.FC<{ t: number }> = ({ t }) => {
  if (t < T.together - 0.1) return null;
  const gap = 34, n = Math.floor(LOOP_LEN / gap), shift = (t - T.together) * 70;
  const dots: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const d = i * gap + shift;
    const [x, y] = loopAt(d);
    // hidden where it passes under an icon's glow
    if (PROCS.some((p) => Math.hypot(x - p.cx, y - p.cy) < R_OUT + 10)) continue;
    const k = backE(seg(t, T.together + (i / n) * 0.9, T.together + (i / n) * 0.9 + 0.16), 2.2);
    if (k > 0.01) dots.push(<circle key={i} cx={x} cy={y} r={4.5 * k} fill={C.cream} />);
  }
  return <g>{dots}</g>;
};

/** Two hard rings behind the body on "alive". */
const BodyGlow: React.FC<{ t: number; cam: Cam }> = ({ t, cam }) => {
  const k = spr(t, T.alive - 0.05, 13, 6.5);
  if (k <= 0) return null;
  const [cx, cy] = cam.at([0, -0.03]);
  const hw = 0.36 * cam.k, hh = 0.95 * cam.k;
  const ring = (pad: number, fill: string) => {
    const w = (hw + pad) * k, h = (hh + pad) * k;
    return <rect x={cx - w} y={cy - h} width={2 * w} height={2 * h} rx={w} fill={fill} />;
  };
  return (
    <g>
      {ring(70, C.n2)}
      {ring(36, C.n3)}
    </g>
  );
};

// ---------- Bindu: hops from the title spot to the right and turns to face the body ----------
export const B2 = { x: 1735, y: 700, s: 190 };
const HOP = [S2_FROM + 0.35, S2_FROM + 1.25] as const;
const targetAt = (t: number): [number, number] => {
  const keys: [number, [number, number]][] = [[T.nutrition - 0.3, [960, 480]], ...PROCS.map((p) => [p.at - 0.25, [p.cx, p.cy]] as [number, [number, number]]), [T.together - 0.2, [960, 470]]];
  let cur = keys[0][1];
  for (let i = 0; i < keys.length; i++) {
    const [tk, v] = keys[i];
    const prev = i ? keys[i - 1][1] : v;
    const k = eio(seg(t, tk, tk + 0.3));
    if (t >= tk) cur = [lerp(prev[0], v[0], k), lerp(prev[1], v[1], k)];
  }
  return cur;
};
export function binduPose2(t: number): { x: number; y: number; s: number; P: BinduPose } {
  const p0 = binduPose(Math.min(t, HOP[0]));
  const hp = seg(t, HOP[0], HOP[1]);
  const crouch = ebump(t, HOP[0] - 0.15, HOP[0], HOP[0], HOP[0] + 0.08);
  const land = wob(t, HOP[1], 18, 7);
  const cheer = seg(t, T.alive + 0.05, T.alive + 0.6);
  const cheerY = cheer > 0 && cheer < 1 ? Math.sin(Math.PI * cheer) : 0;
  const x = lerp(p0.x, B2.x, eio(hp)) + 3 * Math.sin(t * 2 * Math.PI * 0.3);
  const y = lerp(p0.y, B2.y, eio(hp)) - 170 * Math.sin(Math.PI * hp) + 5 * Math.sin(t * 2 * Math.PI * 0.45 + 0.5) - 40 * cheerY;
  const s = lerp(p0.s, B2.s, hp);
  const flip = Math.cos(Math.PI * eio(seg(t, HOP[0] + 0.2, HOP[1] - 0.15)));
  // the magnifier points at the current target (angle in Bindu's own, mirrored frame)
  const tg = targetAt(t);
  const lensBase: [number, number] = [x, y - s * 0.4];
  const aim = (Math.atan2(tg[1] - lensBase[1], (tg[0] - lensBase[0]) * (flip < 0 ? -1 : 1)) * 180) / Math.PI;
  const magRot = lerp(p0.P.magRot ?? -48, aim, eio(seg(t, HOP[1] - 0.1, HOP[1] + 0.5)));
  return {
    x, y, s,
    P: {
      ...p0.P,
      flip: Math.abs(flip) < 0.04 ? 0.04 * Math.sign(flip || 1) : flip,
      sq: 0.1 * crouch - (hp > 0 && hp < 0.5 ? 0.1 * Math.sin(Math.PI * hp * 2) : 0) + 0.09 * Math.max(0, land) - 0.08 * (cheerY > 0 ? Math.sin(Math.PI * cheer * 2) : 0),
      rot: hp < 1 ? lerp(p0.P.rot ?? 0, 0, eio(hp)) : 4 * Math.sin(t * 1.1),
      look: [kf(t, [[HOP[1], 0.6], [T.nutrition, 0.6], [T.respiration - 0.2, 0.3]]), kf(t, [[HOP[1], -0.3], [T.transportation - 0.2, -0.3], [T.transportation + 0.1, 0.4], [T.together, 0.2]])],
      smile: Math.max(t < HOP[0] + 0.3 ? p0.P.smile ?? 0 : 0, eio(seg(t, T.alive - 0.1, T.alive + 0.2)), 0.5 * ebump(t, T.four, T.four + 0.3, T.excretion + 0.6, T.excretion + 0.9)),
      wide: 0,
      lid: Math.max(blink(t, S2_FROM + 2.4), blink(t, T.maintenance + 1.9), blink(t, T.different), blink(t, SCENE2_END - 1.0)),
      mag: 1,
      magRot,
    },
  };
}

/** Everything scene 2 draws at time t (scene 3 dives out of it through the Nutrition ring). */
export const Scene2Art: React.FC<{ t: number; hud?: boolean }> = ({ t, hud = true }) => {
  const cam = camAt2(t);
  const starZoom = Math.pow(10, -(cam.logf - LOG.cell) * 0.03);
  const b = binduPose2(t);
  const lens = binduLens(b.x, b.y, b.s, b.P);
  const until = (i: number) => (i < 3 ? PROCS[i + 1].at - 0.05 : T.excretion + 1.1);
  const heading2 = T.four - 0.1;
  return (
    <g>
        <Stars seed={3} n={150} zoom={starZoom} />
        <BodyGlow t={t} cam={cam} />
        <Body t={t} cam={cam} />
        <NewOrgans t={t} cam={cam} />
        <BodyLife t={t} cam={cam} />
        <Loop t={t} />
        {PROCS.map((p) => <OrganLeader key={p.key} p={p} t={t} cam={cam} />)}
        {PROCS.map((p) => <Icon key={p.key} p={p} t={t} />)}
        {PROCS.map((p, i) => <LockRing key={p.key} p={p} t={t} until={until(i)} />)}
        {PROCS.map((p) => <Name key={p.key} p={p} t={t} />)}
        {PROCS.map((p, i) => <SightLine key={p.key} t={t} t0={p.at - 0.02} a={lens} b={[p.cx, p.cy]} until={until(i)} />)}

        {/* heading, top centre */}
        {/* line 6 (no icons yet): the definition sits in the free left half, clear of the head */}
        <WipeText t={t} tIn={S2_FROM + 1.4} tOut={heading2 - 0.5} x={120} y={420} text="WHAT ARE LIFE PROCESSES?" size={24} color={C.sun} weight={600} spacing={4} caps />
        <WipeText t={t} tIn={T.maintenance - 0.1} tOut={heading2 - 0.6} x={120} y={496} text="Basic maintenance activities" size={48} color={C.cream} />
        <WipeText t={t} tIn={T.maintenance + 0.35} tOut={heading2 - 0.55} x={120} y={562} text="that keep us alive" size={48} color={C.cream} />
        <WipeText t={t} tIn={heading2} x={960 - 268} y={96} text="THE FOUR MAJOR LIFE PROCESSES" size={24} color={C.sun} weight={600} spacing={4} caps />

        <Bindu x={b.x} y={b.y} s={b.s} P={b.P} />
        {hud && <Instrument logf={cam.logf} stops={STOPS} show={1} />}
    </g>
  );
};

export const Scene2: React.FC = () => {
  const t = useCurrentFrame() / FPS + S2_FROM;
  return (
    <AbsoluteFill style={{ background: C.night }}>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080">
        <Scene2Art t={t} />
      </svg>
    </AbsoluteFill>
  );
};

// ---------- sound cues: [video seconds, sfx, volume] ----------
export const SFX2: [number, string, number][] = [
  [HOP[0] - 0.1, 'life-pop', 0.26],
  [HOP[1], 'life-pluck', 0.16],
  [S2_FROM + 1.4, 'life-blip', 0.08],
  ...PROCS.flatMap((p) => [[p.at - 0.02, 'life-lock', 0.26], [p.at + 0.05, 'life-blip', 0.1]] as [number, string, number][]),
  ...PROCS.map((_, i) => [T.different + 0.1 + i * 0.2, 'life-blip', 0.09] as [number, string, number]),
  [T.together, 'life-sparkle', 0.2],
  [T.alive - 0.05, 'life-chime', 0.22],
  [T.alive + 0.05, 'life-pop', 0.2],
];
