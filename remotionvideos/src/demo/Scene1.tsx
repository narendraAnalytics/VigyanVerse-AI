// Scene 1 · THE WORRY (script.txt). Evening, two balconies side by side. Meera sits worried; behind her, through the
// window, her daughter Anika struggles with a chemistry book. Priya steps out next door and asks what happened.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Woman, type Arm, type WomanProps } from './Woman';
import { C, FPS, blinking, lerp, lineEnd, mouthOpen, pop, prog, speaking, twos, wordAt } from './theme';

export const SCENE1_END = lineEnd(1) + 1.2;

const MEERA = 1;
const PRIYA = 0;

// cues from the spoken words (video seconds)
const T = {
  door: 0.35,
  priyaOut: [0.6, 1.5] as const,
  anika: wordAt(MEERA, 'anika'),
  equations: wordAt(MEERA, 'equations'),
  acids: wordAt(MEERA, 'acids'),
  bases: wordAt(MEERA, 'bases'),
  reads: wordAt(MEERA, 'reads'),
  three: wordAt(MEERA, 'three'),
  lost: wordAt(MEERA, 'lost'),
  still: wordAt(MEERA, 'still'),
};

const mix = (a: Arm, b: Arm, k: number): Arm => ({
  elbow: [lerp(a.elbow[0], b.elbow[0], k), lerp(a.elbow[1], b.elbow[1], k)],
  hand: [lerp(a.hand[0], b.hand[0], k), lerp(a.hand[1], b.hand[1], k)],
});

// ---------- background ----------
const Sky: React.FC<{ t: number }> = ({ t }) => (
  <g>
    <rect x={0} y={0} width={1920} height={300} fill={C.sky1} />
    <rect x={0} y={120} width={1920} height={180} fill={C.sky2} />
    <rect x={0} y={205} width={1920} height={95} fill={C.sky3} opacity={0.85} />
    {/* moon + four-point sparkles (mid-century stars) */}
    <circle cx={1660} cy={88} r={46} fill={C.mustardLight} />
    <circle cx={1682} cy={74} r={42} fill={C.sky1} />
    {[[260, 60, 1], [520, 110, 0.7], [880, 50, 0.9], [1240, 96, 0.6], [1460, 40, 0.8], [1820, 150, 0.7], [90, 150, 0.6]].map(([x, y, k], i) => {
      const tw = 0.75 + 0.25 * Math.sin(twos(t) * 3 + i * 1.7);
      const r = 13 * k * tw;
      return <path key={i} d={`M ${x} ${y - r} Q ${x} ${y} ${x + r} ${y} Q ${x} ${y} ${x} ${y + r} Q ${x} ${y} ${x - r} ${y} Q ${x} ${y} ${x} ${y - r} Z`} fill={C.cream} opacity={0.9} />;
    })}
    {/* distant city: flat blocks with lit windows */}
    {[[0, 210, 140], [150, 180, 110], [270, 230, 160], [440, 170, 120], [570, 220, 150], [740, 190, 130], [880, 235, 170], [1060, 175, 140], [1210, 215, 120], [1340, 190, 160], [1510, 225, 140], [1660, 185, 130], [1800, 215, 140]].map(([x, top, w], i) => (
      <g key={i}>
        <rect x={x} y={top} width={w} height={300 - top} fill={i % 2 ? '#2B4A55' : '#335A62'} />
        {Array.from({ length: 6 }, (_, k) => (
          <rect key={k} x={x + 18 + (k % 3) * (w / 3.4)} y={top + 18 + Math.floor(k / 3) * 30} width={10} height={14} fill={C.mustardLight} opacity={(i + k) % 3 === 0 ? 0.85 : 0.15} />
        ))}
      </g>
    ))}
  </g>
);

const Bulbs: React.FC<{ t: number }> = ({ t }) => {
  const pts = Array.from({ length: 23 }, (_, i) => {
    const x = -20 + i * 90;
    const sag = Math.sin(((x % 960) / 960) * Math.PI) * 44;
    return [x, 236 + sag] as const;
  });
  return (
    <g>
      <path d={`M ${pts.map(([x, y]) => `${x} ${y}`).join(' L ')}`} stroke={C.ink} strokeWidth={3} fill="none" opacity={0.7} />
      {pts.map(([x, y], i) => {
        const on = 0.8 + 0.2 * Math.sin(twos(t) * 2.2 + i);
        const col = [C.mustardLight, C.coral, C.tealLight, C.pink][i % 4];
        return (
          <g key={i}>
            <circle cx={x} cy={y + 14} r={20} fill={col} opacity={0.18 * on} />
            <ellipse cx={x} cy={y + 14} rx={8} ry={11} fill={col} opacity={on} />
          </g>
        );
      })}
    </g>
  );
};

/** Anika at her desk, seen through Meera's window (local coords: window interior 0..420 x 0..400). */
const AnikaRoom: React.FC<{ t: number; happy: number }> = ({ t, happy }) => {
  const tt = twos(t);
  // page flips: three quick flips from "reads", then her head drops on "lost"
  const flips = [T.reads + 0.1, T.reads + 0.55, T.three + 0.05];
  const flipK = flips.map((f) => prog(tt, f, f + 0.33));
  const flipping = flipK.findIndex((k) => k > 0 && k < 1);
  const drop = prog(tt, T.lost - 0.15, T.lost + 0.3) * (1 - happy);
  const scratch = drop < 0.5 && happy === 0 ? Math.sin(tt * 14) : 0;
  const nod = happy > 0.9 ? Math.sin(tt * 6) * 3 : 0;
  return (
    <g>
      <rect x={0} y={0} width={420} height={400} fill={C.glow} />
      {/* wallpaper: mid-century boomerangs */}
      {Array.from({ length: 12 }, (_, i) => (
        <path key={i} d={`M ${(i % 4) * 110 + 20} ${Math.floor(i / 4) * 110 + 30} q 22 -18 44 0 q -22 -6 -44 0 Z`} fill={C.mustard} opacity={0.35} />
      ))}
      {/* cone lamp */}
      <path d="M 330 150 L 300 205 L 370 205 Z" fill={C.teal} />
      <rect x={333} y={205} width={4} height={70} fill={C.ink} />
      <path d="M 300 205 L 250 300 L 420 300 L 370 205 Z" fill={C.cream} opacity={0.35} />
      {/* desk */}
      <rect x={60} y={300} width={360} height={18} fill={C.coralDark} />
      <path d="M 90 318 L 78 400 M 390 318 L 402 400" stroke={C.ink} strokeWidth={6} />
      {/* book: left page fixed, right page flips over the spine */}
      <g transform={`translate(250 292)`}>
        <path d="M 0 0 L -70 -6 L -66 8 L 0 10 Z" fill={C.cream} />
        <path d="M 0 0 L 70 -6 L 66 8 L 0 10 Z" fill={C.cream} />
        <path d="M 0 0 L 0 10" stroke={C.ink} strokeWidth={2} opacity={0.4} />
        {flipping >= 0 && (
          <path d={`M 0 0 L ${70 * Math.cos(flipK[flipping] * Math.PI)} ${-6 - Math.sin(flipK[flipping] * Math.PI) * 26} L ${66 * Math.cos(flipK[flipping] * Math.PI)} ${8 - Math.sin(flipK[flipping] * Math.PI) * 26} L 0 10 Z`} fill="#FFF8E8" />
        )}
        <text x={-60} y={-12} fontFamily="Kalam" fontWeight={700} fontSize={13} fill={C.teal}>CHEMISTRY</text>
      </g>
      {/* scene 4: a laptop on the desk, its screen lit with our logo colours */}
      {happy > 0 && (
        <g transform={`translate(330 300) scale(${happy})`}>
          <path d="M -46 0 L 46 0 L 40 6 L -40 6 Z" fill={C.ink} />
          <rect x={-40} y={-58} width={80} height={56} rx={4} fill={C.ink} />
          <rect x={-35} y={-53} width={70} height={46} rx={2} fill={C.cream} />
          <circle cx={0} cy={-36} r={9} fill={C.olive} />
          <rect x={-22} y={-22} width={44} height={5} rx={2} fill={C.navy} />
          <rect x={-16} y={-14} width={32} height={4} rx={2} fill={C.coral} />
        </g>
      )}
      {/* Anika (profile, facing the book) */}
      <g transform={`translate(${160} ${300 + drop * 14 + nod}) rotate(${drop * 16})`}>
        <path d="M -38 0 L -30 -88 Q 0 -100 30 -88 L 38 0 Z" fill={C.tealLight} />
        <rect x={-8} y={-108} width={16} height={22} fill="#9C6440" />
        <g transform={`translate(0 -132)`}>
          <ellipse cx={-26} cy={4} rx={9} ry={30} fill={C.ink} />
          <circle cx={0} cy={0} r={27} fill="#B57A50" />
          <path d="M -28 4 Q -32 -36 2 -32 Q 28 -32 28 -6 Q 14 -22 -6 -20 Q -22 -16 -28 4 Z" fill={C.ink} />
          <ellipse cx={14} cy={0} rx={3} ry={drop > 0.6 ? 0.8 : 4} fill={C.ink} />
          <path d={happy > 0.5 ? 'M 6 10 Q 14 20 22 10' : drop > 0.5 ? 'M 8 14 Q 14 10 20 14' : 'M 9 13 L 19 13'} stroke="#5A1F1F" strokeWidth={2.5} fill="none" strokeLinecap="round" />
        </g>
        {/* arm: scratches her head, then rests on the desk */}
        {happy > 0.5 ? (
          <path d="M 18 -78 L 70 -50 L 120 -40" stroke="#9C6440" strokeWidth={12} strokeLinecap="round" fill="none" />
        ) : drop < 0.5 ? (
          <path d={`M 18 -78 L 34 -112 L ${22 + scratch * 6} ${-150 + scratch * 4}`} stroke="#9C6440" strokeWidth={12} strokeLinecap="round" fill="none" />
        ) : (
          <path d="M 18 -78 L 50 -30 L 90 -14" stroke="#9C6440" strokeWidth={12} strokeLinecap="round" fill="none" />
        )}
      </g>
      {/* "lost": a little scribble cloud over her head */}
      {drop > 0.3 && happy === 0 && (
        <path
          transform={`translate(160 ${120 + Math.sin(tt * 5) * 3})`}
          d="M 0 0 c 10 -22 30 -22 34 0 c 6 -20 30 -18 28 4 c 18 2 16 26 -4 24 c -2 14 -26 14 -30 0 c -10 14 -34 8 -28 -8 c -14 -4 -10 -22 0 -20"
          fill="none"
          stroke={C.navy}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray="300"
          strokeDashoffset={300 * (1 - prog(tt, T.lost, T.lost + 0.45))}
        />
      )}
    </g>
  );
};

/** The formulas Anika cannot crack, popping in on Meera's words (over the window bars). */
const Formulas: React.FC<{ t: number; happy: number; happyAt: number }> = ({ t, happy, happyAt }) => {
  const tt = twos(t);
  const forms = [
    { at: T.equations, text: 'Fe + H₂O → ?', x: 40, y: 64, w: 168 },
    { at: T.acids, text: 'HCl + NaOH → ?', x: 196, y: 36, w: 196 },
    { at: T.bases, text: 'pH = ?', x: 290, y: 112, w: 104 },
  ];
  return (
    <g>
      {forms.map((f, i) => {
        const k = pop(tt, f.at);
        const bob = Math.sin(tt * 3 + i) * 4;
        return k > 0 ? (
          <g key={i} transform={`translate(${f.x} ${f.y + bob}) scale(${k})`}>
            <rect x={-12} y={-28} width={f.w} height={40} rx={18} fill={C.cream} />
            <text x={0} y={0} fontFamily="Kalam" fontWeight={700} fontSize={23} fill={C.coralDark}>{f.text}</text>
            {happy > 0 && (
              <g transform={`translate(${f.w - 14} -26) scale(${pop(tt, happyAt + 0.25 * i, 0.3)})`}>
                <circle r={16} fill={C.olive} />
                <path d="M -7 0 L -2 6 L 8 -6" stroke={C.cream} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            )}
          </g>
        ) : null;
      })}
    </g>
  );
};

/** Mid-century railing across the front: teal rail, slim bars and mustard diamonds. */
const Railing: React.FC = () => (
  <g>
    <rect x={0} y={1030} width={1920} height={50} fill={C.tealDark} />
    {Array.from({ length: 41 }, (_, i) => (
      <rect key={i} x={i * 48} y={830} width={8} height={205} fill={C.teal} />
    ))}
    {Array.from({ length: 20 }, (_, i) => (
      <path key={i} d={`M ${i * 96 + 52} 905 l 22 26 l -22 26 l -22 -26 Z`} fill={C.mustard} />
    ))}
    <rect x={0} y={812} width={1920} height={26} rx={6} fill={C.tealDark} />
    <rect x={0} y={812} width={1920} height={8} fill={C.tealLight} opacity={0.6} />
  </g>
);

const Plant: React.FC<{ x: number; t: number; kind: 'snake' | 'leafy' }> = ({ x, t, kind }) => {
  const sway = Math.sin(twos(t) * 1.6 + x) * 2.5;
  return (
    <g transform={`translate(${x} 830)`}>
      {kind === 'snake'
        ? [-50, -22, 4, 30, 54].map((dx, i) => (
            <path key={i} d={`M ${dx - 14} 0 Q ${dx + sway} ${-210 + i * 18} ${dx + 3 + sway} ${-260 + (i % 2) * 40} Q ${dx + 8} ${-120} ${dx + 14} 0 Z`} fill={i % 2 ? C.olive : C.oliveDark} />
          ))
        : [[-70, -150], [-10, -200], [55, -160], [-40, -90], [40, -95]].map(([dx, dy], i) => (
            <ellipse key={i} cx={dx + sway} cy={dy} rx={46} ry={30} transform={`rotate(${dx / 2} ${dx} ${dy})`} fill={i % 2 ? C.olive : C.oliveDark} />
          ))}
      <path d="M -70 -10 L 70 -10 L 52 40 L -52 40 Z" fill={C.coral} />
    </g>
  );
};

// ---------- the scene ----------
export const Scene1: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const tt = twos(t);

  // camera: a slow push, drifting towards whoever is talking
  const zoom = lerp(1.0, 1.07, prog(t, 0, SCENE1_END));
  const panX = lerp(0, 40, prog(t, 5.5, 7.5)) - lerp(0, 25, prog(t, T.lost, SCENE1_END));

  // Priya: door opens, she steps out and leans on the low wall
  const doorOpen = prog(tt, T.door, T.door + 0.45);
  const out = prog(tt, T.priyaOut[0], T.priyaOut[1]);
  const priyaX = lerp(1470, 1245, out);
  const step = out > 0 && out < 1 ? Math.abs(Math.sin(tt * 9)) * -10 : 0;
  const priyaTalk = speaking(PRIYA, t);

  // Meera: chin on hand; drops it to talk, counts on her hand at "equations, acids, bases", chin on hand again at "still"
  const chinArm: Arm = { elbow: [72, -34], hand: [44, -238] };
  const lapArm: Arm = { elbow: [74, -70], hand: [30, -22] };
  const countArm: Arm = { elbow: [92, -90], hand: [118, -190] };
  const talkK = prog(tt, T.anika - 0.4, T.anika) * (1 - prog(tt, T.still - 0.3, T.still + 0.2));
  const countK = prog(tt, T.equations - 0.3, T.equations) * (1 - prog(tt, T.bases + 0.5, T.bases + 0.9));
  const countBob = countK > 0.9 ? Math.abs(Math.sin((tt - T.equations) * Math.PI / Math.max(0.5, (T.acids - T.equations)))) * 14 : 0;
  let front = mix(chinArm, lapArm, talkK);
  front = mix(front, countArm, countK);
  front = { ...front, hand: [front.hand[0], front.hand[1] - countBob] };
  const lookBack = prog(tt, T.anika - 0.2, T.anika + 0.15) * (1 - prog(tt, T.anika + 1.0, T.anika + 1.4));
  const meeraHead = lerp(lerp(6, -2, talkK), -12, lookBack);

  return (
    <BalconyStage
      t={t}
      camera={`translate(${960 - panX} 600) scale(${zoom}) translate(-960 -600)`}
      doorOpen={doorOpen}
      meera={{
        headTilt: meeraHead,
        look: lerp(0.6, -1, lookBack),
        brow: 'worried',
        mouth: mouthOpen(MEERA, t) ? 'open' : speaking(MEERA, t) ? 'neutral' : 'frown',
        blink: blinking(t, 0.7),
        front,
        breathe: (Math.sin(tt * 1.4) + 1) / 2,
      }}
      priya={
        doorOpen > 0.3
          ? {
              x: priyaX,
              y: 850 + step,
              s: 1.28 * lerp(0.94, 1, out),
              lean: lerp(0, 6, out),
              headTilt: priyaTalk ? 4 : 6 + Math.sin(tt * 1.2) * 2,
              look: 0.8,
              brow: t > 1.2 ? 'worried' : 'soft',
              mouth: mouthOpen(PRIYA, t) ? 'open' : 'neutral',
              blink: blinking(t, 1.9),
              front: out > 0.9 ? PRIYA_LEAN.front : { elbow: [74, -80], hand: [44, -24] },
              back: out > 0.9 ? PRIYA_LEAN.back : { elbow: [-64, -80], hand: [-40, -24] },
              breathe: (Math.sin(tt * 1.6 + 1) + 1) / 2,
            }
          : null
      }
    />
  );
};

// ---------- the balcony set, shared by the scenes on it (scenes 1, 2, 4) ----------
type Pose = Pick<WomanProps, 'headTilt' | 'look' | 'brow' | 'mouth' | 'blink' | 'front' | 'breathe'>;
export type MeeraPose = Pose & { back?: Arm; lean?: number; y?: number };
export type PriyaPose = Pose & { x: number; y: number; s: number; lean: number; back: Arm };
export const PRIYA_LEAN: { front: Arm; back: Arm } = { front: { elbow: [92, -46], hand: [150, -40] }, back: { elbow: [-20, -50], hand: [70, -46] } };
export const MEERA_AT = { x: 700, y: 870, s: 1.28 };
export const MEERA_LOOK = { skin: '#C68A5E', skinDark: '#A86E47', hair: '#2B1E1A', hairStyle: 'bun', blouse: C.mustard, saree: C.teal, border: C.coral } as const;
export const PRIYA_LOOK = { skin: '#A86B45', skinDark: '#8C5634', hair: '#1E1512', hairStyle: 'braid', blouse: C.olive, saree: C.coral, border: C.mustard } as const;

export const BalconyStage: React.FC<{
  t: number;
  camera: string;
  doorOpen: number;
  meera: MeeraPose;
  priya: PriyaPose | null;
  /** drawn over Priya, under the railing (e.g. her phone) */
  children?: React.ReactNode;
  /** scene 4: Anika happy at her laptop (0..1), and when that starts (the formula ticks pop from then) */
  anikaHappy?: number;
  happyAt?: number;
}> = ({ t, camera, doorOpen, meera, priya, children, anikaHappy = 0, happyAt = 1e9 }) => {
  const tt = twos(t);
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0 }}>
      <g transform={camera}>
        <Sky t={t} />
        {/* back walls */}
        <rect x={0} y={250} width={1030} height={830} fill={C.wallL} />
        <rect x={1090} y={250} width={830} height={830} fill={C.wallR} />
        <rect x={0} y={250} width={1920} height={18} fill={C.wallShade} />
        {Array.from({ length: 11 }, (_, i) => <rect key={i} x={i * 96} y={268} width={3} height={560} fill={C.wallShade} opacity={0.35} />)}
        {/* Meera's window with Anika inside */}
        <g transform="translate(170 330)">
          <rect x={-22} y={-22} width={464} height={444} rx={8} fill={C.teal} />
          <AnikaRoom t={t} happy={anikaHappy} />
          <rect x={86} y={0} width={10} height={400} fill={C.teal} />
          <rect x={0} y={176} width={86} height={10} fill={C.teal} />
          <Formulas t={t} happy={anikaHappy} happyAt={happyAt} />
          <rect x={-34} y={414} width={488} height={20} rx={4} fill={C.tealDark} />
        </g>
        {/* Priya's door: coral panel swings open onto warm light */}
        <g transform="translate(1310 340)">
          <rect x={-18} y={-18} width={296} height={500} fill={C.tealDark} />
          <rect x={0} y={0} width={260} height={482} fill={C.glow} />
          <rect x={260 - 260 * (1 - 0.82 * doorOpen)} y={0} width={260 * (1 - 0.82 * doorOpen)} height={482} fill={C.coral} />
          {doorOpen < 0.5 && <path d="M 130 90 l 40 50 l -40 50 l -40 -50 Z" fill={C.mustardLight} />}
        </g>
        {/* the low wall between the two balconies */}
        <rect x={1030} y={250} width={60} height={830} fill={C.wallShade} />
        <rect x={1022} y={250} width={76} height={20} fill={C.coralDark} />
        <Bulbs t={t} />
        {/* Meera: on a mid-century chair, chai on a little table */}
        <g>
          <path d="M 592 840 L 616 590 Q 700 548 784 590 L 808 840 Z" fill="#7A4A2E" />
          <path d="M 630 600 Q 700 570 770 600" stroke="#A8724A" strokeWidth={10} fill="none" strokeLinecap="round" />
          <path d="M 616 590 L 592 840 M 784 590 L 808 840" stroke="#4E2E1C" strokeWidth={6} />
        </g>
        <Woman {...MEERA_AT} {...MEERA_LOOK} back={{ elbow: [-62, -70], hand: [0, -30] }} {...meera} />
        <g transform="translate(930 0)">
          <ellipse cx={0} cy={770} rx={70} ry={14} fill={C.coralDark} />
          <rect x={-5} y={770} width={10} height={60} fill={C.ink} />
          <path d="M -20 742 L 20 742 L 15 768 L -15 768 Z" fill={C.cream} />
          <path d="M 20 748 q 14 2 4 14" stroke={C.cream} strokeWidth={4} fill="none" />
          {[0, 1].map((i) => (
            <path key={i} d={`M ${-6 + i * 12} 734 q ${8 * Math.sin(tt * 4 + i)} -14 0 -26 q ${-8 * Math.sin(tt * 4 + i)} -12 0 -24`} stroke={C.cream} strokeWidth={3} fill="none" opacity={0.7} strokeLinecap="round" />
          ))}
        </g>
        {priya && <Woman flip {...PRIYA_LOOK} {...priya} />}
        {children}
        <Railing />
        <Plant x={110} t={t} kind="snake" />
        <Plant x={1800} t={t} kind="leafy" />
      </g>
    </svg>
  );
};
