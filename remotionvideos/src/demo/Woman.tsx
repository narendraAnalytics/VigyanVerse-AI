// A mid-century cartoon woman (flat shapes, no outlines), drawn facing right; `flip` mirrors her to face left.
// Origin = waist, centre; everything below the waist is hidden by the balcony railing.
import React from 'react';
import { C } from './theme';

export type Arm = { elbow: [number, number]; hand: [number, number] };
export type WomanProps = {
  x: number;
  y: number;
  s?: number;
  flip?: boolean;
  lean?: number; // degrees
  skin: string;
  skinDark: string;
  hair: string;
  hairStyle: 'bun' | 'braid';
  blouse: string;
  saree: string;
  border: string;
  headTilt?: number; // degrees
  look?: number; // eye shift, -1 (back) .. 1 (forward)
  brow: 'worried' | 'soft' | 'happy';
  mouth: 'open' | 'frown' | 'smile' | 'neutral';
  blink?: boolean;
  front: Arm; // the arm nearer the camera, drawn over the body
  back: Arm; // the far arm, drawn behind the body
  breathe?: number; // 0..1 shoulder rise
};

const limb = (from: [number, number], arm: Arm, sleeve: string, skin: string) => (
  <g>
    <path d={`M ${from[0]} ${from[1]} L ${arm.elbow[0]} ${arm.elbow[1]}`} stroke={skin} strokeWidth={28} strokeLinecap="round" fill="none" />
    <path d={`M ${arm.elbow[0]} ${arm.elbow[1]} L ${arm.hand[0]} ${arm.hand[1]}`} stroke={skin} strokeWidth={25} strokeLinecap="round" fill="none" />
    <circle cx={arm.hand[0]} cy={arm.hand[1]} r={16} fill={skin} />
    <circle cx={from[0]} cy={from[1]} r={27} fill={sleeve} />
    {/* bangles */}
    <path d={`M ${arm.hand[0] + (arm.elbow[0] - arm.hand[0]) * 0.22 - 12} ${arm.hand[1] + (arm.elbow[1] - arm.hand[1]) * 0.22} l 24 0`} stroke={C.gold} strokeWidth={6} strokeLinecap="round" />
  </g>
);

export const Woman: React.FC<WomanProps> = (p) => {
  const s = p.s ?? 1;
  const rise = (p.breathe ?? 0) * -4;
  const look = (p.look ?? 0) * 6;
  const eyeRy = p.blink ? 1.2 : 6.5;
  const browL = p.brow === 'worried' ? 'M 4 -13 L 20 -23' : p.brow === 'soft' ? 'M 3 -19 Q 12 -25 21 -21' : 'M 3 -20 Q 12 -28 21 -22';
  const browR = p.brow === 'worried' ? 'M 28 -23 L 43 -14' : p.brow === 'soft' ? 'M 27 -21 Q 36 -25 44 -19' : 'M 27 -22 Q 36 -28 45 -20';
  return (
    <g transform={`translate(${p.x} ${p.y}) scale(${(p.flip ? -1 : 1) * s} ${s}) rotate(${p.lean ?? 0})`}>
      {/* far arm, behind the body */}
      {limb([-56, -168 + rise], p.back, p.blouse, p.skinDark)}
      {/* neck */}
      <rect x={-15} y={-236 + rise} width={30} height={50} rx={10} fill={p.skinDark} />
      {/* body: saree with the pallu across, border stripe */}
      <path d={`M -72 10 L -58 ${-182 + rise} Q 0 ${-210 + rise} 58 ${-182 + rise} L 72 10 Z`} fill={p.saree} />
      <path d={`M -60 ${-176 + rise} L -24 ${-200 + rise} L 74 -30 L 74 10 L 36 10 Z`} fill={p.border} opacity={0.9} />
      <path d={`M -42 ${-190 + rise} L 72 -14`} stroke={p.saree} strokeWidth={12} opacity={0.55} />
      <path d={`M -24 ${-200 + rise} L 74 -30`} stroke={C.cream} strokeWidth={4} strokeDasharray="2 10" strokeLinecap="round" />
      {/* head */}
      <g transform={`translate(0 ${-292 + rise}) rotate(${p.headTilt ?? 0})`}>
        {p.hairStyle === 'bun' ? <circle cx={-38} cy={-46} r={30} fill={p.hair} /> : <ellipse cx={-44} cy={40} rx={15} ry={66} fill={p.hair} />}
        <ellipse cx={0} cy={0} rx={50} ry={58} fill={p.skin} />
        <path d="M -52 6 Q -60 -72 2 -63 Q 52 -64 53 -12 Q 34 -44 -6 -40 Q -36 -34 -46 14 Z" fill={p.hair} />
        <ellipse cx={-30} cy={6} rx={8} ry={12} fill={p.skinDark} />
        <circle cx={-30} cy={22} r={5} fill={C.gold} />
        <ellipse cx={37} cy={18} rx={10} ry={6} fill={C.coral} opacity={0.28} />
        <circle cx={24} cy={-27} r={4} fill={C.red} />
        <ellipse cx={12 + look} cy={-2} rx={4.6} ry={eyeRy} fill={C.ink} />
        <ellipse cx={35 + look} cy={-2} rx={4.6} ry={eyeRy} fill={C.ink} />
        <path d={browL} stroke={p.hair} strokeWidth={4.5} strokeLinecap="round" fill="none" />
        <path d={browR} stroke={p.hair} strokeWidth={4.5} strokeLinecap="round" fill="none" />
        <path d="M 44 0 L 51 17 L 42 19" stroke={p.skinDark} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {p.mouth === 'open' && <ellipse cx={30} cy={33} rx={8} ry={7} fill="#5A1F1F" />}
        {p.mouth === 'frown' && <path d="M 20 37 Q 30 29 40 37" stroke="#5A1F1F" strokeWidth={4} strokeLinecap="round" fill="none" />}
        {p.mouth === 'smile' && <path d="M 17 29 Q 30 43 43 29" stroke="#5A1F1F" strokeWidth={4.5} strokeLinecap="round" fill="none" />}
        {p.mouth === 'neutral' && <path d="M 21 34 L 39 34" stroke="#5A1F1F" strokeWidth={4} strokeLinecap="round" />}
      </g>
      {/* near arm, over the body */}
      {limb([56, -168 + rise], p.front, p.blouse, p.skin)}
    </g>
  );
};
