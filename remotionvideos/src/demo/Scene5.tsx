// Scene 5 · WORK WITH US + the final card (owner 2026-11-24, for LinkedIn). Text and music only (people read it; most
// LinkedIn viewers watch muted). Wording is the site's own (frontend/src/lib/story.ts "Work with us" and "Find us").
// BuildFlows appears ONLY as the owner's other work ("See more of my work at"), never as the operator of VigyanVerse AI.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { EndCard, SCENE4_END } from './Scene4';
import { C, FPS, lerp, pop, prog, twos } from './theme';

export const S5_FROM = Math.ceil(SCENE4_END * FPS);
const S5_START = S5_FROM / FPS;
const Q_AT = S5_START + 0.5; // the question
const CHIPS_AT = S5_START + 2.0; // the four partnership chips, 0.45 s apart
const OPEN_AT = CHIPS_AT + 2.1; // "We are open to partnerships"
const MAIL_AT = OPEN_AT + 0.9; // the email
export const FINAL_AT = MAIL_AT + 4.0; // wipe to the final card
const CREDIT_AT = FINAL_AT + 1.2;
export const SCENE5_END = FINAL_AT + 5.5;
export const S5_CUES = { chips: [0, 1, 2, 3].map((i) => CHIPS_AT + i * 0.45), mail: MAIL_AT, final: FINAL_AT };

const CHIPS = [
  { text: 'School pilots', bg: C.mustard, fg: C.navy },
  { text: 'Learning content', bg: C.coral, fg: C.cream },
  { text: 'Tools that work with VigyanVerse AI', bg: C.tealLight, fg: C.navy },
  { text: 'Support to grow', bg: C.olive, fg: C.cream },
];

const Star: React.FC<{ x: number; y: number; r: number; fill: string; spin: number }> = ({ x, y, r, fill, spin }) => (
  <path transform={`translate(${x} ${y}) rotate(${spin}) scale(${r / 60})`} d="M 0 -60 L 14 -14 L 60 0 L 14 14 L 0 60 L -14 14 L -60 0 L -14 -14 Z" fill={fill} />
);

export const Scene5: React.FC = () => {
  const t = (S5_FROM + useCurrentFrame()) / FPS;
  const tt = twos(t);
  const iris = prog(t, S5_START, S5_START + 0.7);
  const wipe = prog(t, FINAL_AT, FINAL_AT + 0.55);
  const finalK = prog(t, FINAL_AT + 0.2, FINAL_AT + 0.9);

  return (
    <>
      {/* Work with us */}
      <div style={{ position: 'absolute', inset: 0, background: C.teal, clipPath: `circle(${lerp(0, 1200, iris)}px at 50% 50%)` }}>
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
          <Star x={170} y={150} r={46} fill={C.mustard} spin={tt * 20} />
          <Star x={1760} y={170} r={38} fill={C.coral} spin={-tt * 16} />
          <Star x={140} y={930} r={34} fill={C.cream} spin={tt * 12} />
          <Star x={1790} y={920} r={50} fill={C.mustardLight} spin={-tt * 22} />
        </svg>
        <div style={{ position: 'absolute', left: 190, top: 120, width: 1540, height: 840, borderRadius: 36, background: C.cream, boxShadow: `0 16px 0 ${C.tealDark}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', top: -38, padding: '12px 40px', borderRadius: 40, background: C.mustard, boxShadow: `0 6px 0 ${C.coralDark}`, fontFamily: 'Fraunces', fontWeight: 700, fontSize: 44, color: C.navy, transform: `scale(${pop(t, S5_START + 0.3, 0.4)})` }}>
            Work with us
          </div>
          <div style={{ fontFamily: 'Fraunces', fontWeight: 700, fontSize: 64, color: C.navy, textAlign: 'center', lineHeight: 1.2, maxWidth: 1300, transform: `scale(${pop(t, Q_AT, 0.45)})` }}>
            Are you a startup, founder, school or educator?
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 22, maxWidth: 1300, marginTop: 56 }}>
            {CHIPS.map((c, i) => (
              <div key={c.text} style={{ padding: '16px 34px', borderRadius: 40, background: c.bg, color: c.fg, fontFamily: 'Fraunces', fontWeight: 700, fontSize: 40, boxShadow: '0 6px 0 rgba(20,12,4,0.22)', transform: `scale(${pop(t, S5_CUES.chips[i], 0.4)}) rotate(${i % 2 ? 1.5 : -1.5}deg)` }}>
                {c.text}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 48, fontFamily: 'Fraunces', fontWeight: 700, fontSize: 46, color: C.coralDark, opacity: prog(t, OPEN_AT, OPEN_AT + 0.4), transform: `translateY(${(1 - prog(t, OPEN_AT, OPEN_AT + 0.4)) * 14}px)` }}>
            We are open to partnerships.
          </div>
          <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', gap: 20, padding: '16px 40px', borderRadius: 50, background: C.teal, boxShadow: `0 7px 0 ${C.tealDark}`, transform: `scale(${pop(t, MAIL_AT, 0.45)})` }}>
            <svg width={52} height={40} viewBox="0 0 52 40"><rect x={2} y={2} width={48} height={36} rx={5} fill={C.cream} /><path d="M 4 5 L 26 22 L 48 5" fill="none" stroke={C.teal} strokeWidth={4} strokeLinejoin="round" /></svg>
            <span style={{ fontFamily: 'Fraunces', fontWeight: 700, fontSize: 46, color: C.cream }}>admin@vigyanverseai.live</span>
            <span style={{ fontFamily: 'Fraunces', fontWeight: 700, fontSize: 30, color: C.mustardLight }}>Subject: “Partnership”</span>
          </div>
        </div>
      </div>
      {/* the final card, brought in by a mustard and coral wipe */}
      {wipe > 0 && (
        <>
          <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 ${(1 - wipe) * 100}% 0 0)` }}>
            <EndCard k={finalK} credit={prog(t, CREDIT_AT, CREDIT_AT + 0.6)} />
          </div>
          {wipe < 1 && <div style={{ position: 'absolute', top: -100, bottom: -100, width: 200, left: lerp(-260, 1960, wipe), background: C.mustard, transform: 'skewX(-14deg)', boxShadow: `-34px 0 0 ${C.coral}` }} />}
        </>
      )}
    </>
  );
};
