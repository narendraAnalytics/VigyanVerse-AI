// Scene 4 · THE SMILE (script.txt) + END CARD. The recording shrinks back into Priya's phone and the camera pulls out
// to the balcony. Meera asks for the website, Priya says it (a big "vigyanverseai.live" sign pops up), Meera stands up
// smiling: "I'll tell Anika to start tonight!", and through the window Anika sits up at a glowing laptop, smiling, with
// green ticks on her old formula bubbles. A cartoon iris closes on Meera's smile and opens on the end card.
import React from 'react';
import { Img, staticFile, useCurrentFrame } from 'remotion';
import { BalconyStage, MEERA_AT, PRIYA_LEAN } from './Scene1';
import { AppScreen, HOLD_ARM, Phone, PRIYA_AT, mix, priyaWorld } from './Scene2';
import { SCENE3_END } from './Scene3';
import type { Arm } from './Woman';
import { C, FPS, blinking, lerp, lineEnd, mouthOpen, pop, prog, twos, wordAt, LINES } from './theme';

const ASK = 15; // Meera: "That sounds wonderful! What's the website?"
const SITE = 16; // Priya: "Just open VigyanVerse AI dot live, on her phone or laptop."
const SMILE = 17; // Meera: "That's exactly what she needs ... I'll tell Anika to start tonight!"

export const S4_FROM = Math.ceil(SCENE3_END * FPS);
const S4_START = S4_FROM / FPS;
const W4 = {
  live: wordAt(SITE, 'live'),
  ill: wordAt(SMILE, "i'll"),
  anika: wordAt(SMILE, 'anika'),
  tonight: wordAt(SMILE, 'tonight'),
};
export const W4_LIVE = wordAt(16, 'live');
export const W4_ANIKA = wordAt(17, 'anika');
export const IRIS = lineEnd(SMILE) + 0.7; // iris starts closing
const IRIS_SHUT = IRIS + 0.8;
/** scene 4 ends with the iris shut; scene 5 (Work with us + the final card) opens from it */
export const SCENE4_END = IRIS_SHUT + 0.2;

/** The end card: logo, name, tagline, the website, and the owner's credit line (wording from the site's Our Story). */
export const EndCard: React.FC<{ k: number; credit?: number }> = ({ k, credit = 0 }) => (
  <div style={{ position: 'absolute', inset: 0, background: C.cream, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
      {[[200, 180, C.mustard], [1700, 220, C.coral], [260, 860, C.teal], [1660, 880, C.mustard], [980, 110, C.tealLight]].map(([x, y, col], i) => (
        <path key={i} transform={`translate(${x} ${y}) rotate(${i * 20}) scale(${0.6 + 0.4 * k})`} d="M 0 -60 L 14 -14 L 60 0 L 14 14 L 0 60 L -14 14 L -60 0 L -14 -14 Z" fill={col as string} opacity={0.55} />
      ))}
    </svg>
    <Img src={staticFile('logo.png')} style={{ width: 300, height: 300, objectFit: 'contain', transform: `scale(${0.85 + 0.15 * k})` }} />
    <div style={{ fontFamily: 'Fraunces', fontWeight: 700, fontSize: 96, color: C.navy }}>VigyanVerse AI</div>
    <div style={{ fontFamily: 'Fraunces', fontWeight: 700, fontSize: 40, color: C.coralDark }}>Class 10 Science, explained the way you ask it</div>
    <div style={{ marginTop: 22, padding: '16px 44px', borderRadius: 60, background: C.teal, boxShadow: `0 8px 0 ${C.tealDark}`, fontFamily: 'Fraunces', fontWeight: 700, fontSize: 58, color: C.cream, transform: `scale(${pop(k * 2, 0.6, 0.6) || 0.001})` }}>
      vigyanverseai.live
    </div>
    {credit > 0 && (
      <div style={{ position: 'absolute', bottom: 70, fontFamily: 'Fraunces', fontWeight: 700, fontSize: 30, color: C.navy, opacity: credit, transform: `translateY(${(1 - credit) * 12}px)` }}>
        Built by Narendra Kumar · See more of my work at <span style={{ color: C.coralDark }}>buildflows.shop</span>
      </div>
    )}
  </div>
);

export const Scene4: React.FC = () => {
  const frame = useCurrentFrame();
  const t = (S4_FROM + frame) / FPS;
  const tt = twos(t);

  // pull-back out of the phone (scene 2's dive, reversed)
  const back = prog(t, S4_START, S4_START + 1.0);
  // Priya lowers the phone once Meera starts her last line
  const lower = prog(tt, LINES[SMILE].at, LINES[SMILE].at + 0.6);
  const front: Arm = mix(HOLD_ARM, PRIYA_LEAN.front, lower);
  const priyaLean = lerp(1, 6, lower);
  const hand = priyaWorld(priyaLean, front.hand);
  const pc: [number, number] = [hand[0] - 6, hand[1] - 58];
  const ps = 1 - lower;

  // Meera: happy; stands up on "I'll", looks back to the window on "Anika"
  const stand = prog(tt, W4.ill - 0.3, W4.ill + 0.3);
  const lookBack = prog(tt, W4.anika - 0.15, W4.anika + 0.2) * (1 - prog(tt, W4.tonight + 0.2, W4.tonight + 0.6));
  const wave = prog(tt, W4.anika - 0.2, W4.anika + 0.2) * (1 - prog(tt, lineEnd(SMILE) + 0.3, lineEnd(SMILE) + 0.7));
  const waveArm: Arm = { elbow: [-40, -150], hand: [-70 + Math.sin(tt * 12) * 10, -250] };
  const anikaHappy = prog(tt, W4.anika, W4.anika + 0.5);

  // camera: phone -> two-shot -> wider on "I'll" (the window in view) -> slow push to Meera
  const z0 = lerp(9, 1.55, Math.pow(back, 0.6));
  const wide = prog(t, W4.ill - 0.4, W4.ill + 0.8);
  const z = lerp(z0, 1.18, wide) + 0.06 * prog(t, W4.tonight, IRIS);
  const cx = lerp(lerp(pc[0], 1000, back), 860, wide);
  const cy = lerp(lerp(pc[1], 560, back), 560, wide);

  // the app screen shrinking from the full frame into the phone
  const shrink = prog(t, S4_START, S4_START + 0.85);
  const scr = { x: 960 + (pc[0] - 32 - cx) * z, y: 540 + (pc[1] - 58 - cy) * z, w: 64 * z, h: 116 * z };
  const ov = { x: lerp(0, scr.x, shrink), y: lerp(0, scr.y, shrink), w: lerp(1920, scr.w, shrink), h: lerp(1080, scr.h, shrink) };

  // the website sign
  const sign = pop(t, W4.live - 0.1, 0.45);

  // iris on Meera's face
  const meeraY = lerp(MEERA_AT.y, 806, stand);
  const face = { x: 960 + (MEERA_AT.x + 20 - cx) * z, y: 540 + (meeraY - 292 * MEERA_AT.s - cy) * z };
  const irisR = lerp(1400, 0, prog(t, IRIS, IRIS_SHUT));

  return (
    <>
      <BalconyStage
        t={t}
        camera={`translate(960 540) scale(${z}) translate(${-cx} ${-cy})`}
        doorOpen={1}
        anikaHappy={anikaHappy}
        happyAt={W4.anika + 0.3}
        meera={{
          y: meeraY,
          headTilt: lerp(3, -12, lookBack),
          lean: lerp(5, 0, stand),
          look: lerp(1, -1, lookBack),
          brow: 'happy',
          mouth: mouthOpen(ASK, t) || mouthOpen(SMILE, t) ? 'open' : 'smile',
          blink: blinking(t, 0.7),
          front: { elbow: [74, -70], hand: [30, -22] },
          back: mix({ elbow: [-62, -70], hand: [0, -30] }, waveArm, wave),
          breathe: (Math.sin(tt * 1.4) + 1) / 2,
        }}
        priya={{
          ...PRIYA_AT,
          lean: priyaLean,
          headTilt: -2,
          look: 0.8,
          brow: 'happy',
          mouth: mouthOpen(SITE, t) ? 'open' : 'smile',
          blink: blinking(t, 1.9),
          front,
          back: PRIYA_LEAN.back,
          breathe: (Math.sin(tt * 1.6 + 1) + 1) / 2,
        }}
      >
        {ps > 0.02 && <Phone pc={pc} ps={ps} screenOn={1} />}
      </BalconyStage>
      {shrink < 1 && (
        <div style={{ position: 'absolute', left: ov.x, top: ov.y, width: ov.w, height: ov.h, borderRadius: lerp(0, 6 * z, shrink), overflow: 'hidden', opacity: 1 - prog(t, S4_START + 0.7, S4_START + 0.85) }}>
          <AppScreen w={ov.w} h={ov.h} url={1 - shrink} />
        </div>
      )}
      {sign > 0 && t < IRIS_SHUT && (
        <div style={{ position: 'absolute', left: 960, top: 150, transform: `translateX(-50%) scale(${sign}) rotate(-2deg)`, display: 'flex', alignItems: 'center', gap: 18, padding: '18px 46px', borderRadius: 60, background: C.mustard, border: `6px solid ${C.cream}`, boxShadow: `0 10px 0 ${C.coralDark}`, fontFamily: 'Fraunces', fontWeight: 700, fontSize: 64, color: C.navy, whiteSpace: 'nowrap' }}>
          <svg width={44} height={44} viewBox="-22 -22 44 44"><path d="M 0 -20 L 5 -5 L 20 0 L 5 5 L 0 20 L -5 5 L -20 0 L -5 -5 Z" fill={C.cream} /></svg>
          vigyanverseai.live
          <svg width={44} height={44} viewBox="-22 -22 44 44"><path d="M 0 -20 L 5 -5 L 20 0 L 5 5 L 0 20 L -5 5 L -20 0 L -5 -5 Z" fill={C.cream} /></svg>
        </div>
      )}
      {t >= IRIS && (
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
          <path fillRule="evenodd" fill={C.ink} d={`M 0 0 H 1920 V 1080 H 0 Z M ${face.x - irisR} ${face.y} a ${irisR} ${irisR} 0 1 0 ${irisR * 2} 0 a ${irisR} ${irisR} 0 1 0 ${-irisR * 2} 0 Z`} />
        </svg>
      )}
    </>
  );
};
