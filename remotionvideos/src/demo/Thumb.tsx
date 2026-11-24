// LinkedIn thumbnail for the demo video (still "DemoThumb", 1920x1080). The key moment: Priya shows Meera the app on her
// phone; Anika still stuck in the window behind. Headline on a mustard banner, the website on a teal pill.
import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { loadFont as loadFraunces } from '@remotion/google-fonts/Fraunces';
import { loadFont as loadKalam } from '@remotion/google-fonts/Kalam';
import { BalconyStage, PRIYA_LEAN } from './Scene1';
import { HOLD_ARM, Phone, PRIYA_AT, priyaWorld } from './Scene2';
import { C } from './theme';

loadFraunces('normal', { weights: ['700'], subsets: ['latin'] });
loadKalam('normal', { weights: ['700'], subsets: ['latin'] });

const T = 30; // story time to draw the set at: Anika slumped over the book, the formula bubbles showing

export const Thumb: React.FC = () => {
  const hand = priyaWorld(1, HOLD_ARM.hand);
  const pc: [number, number] = [hand[0] - 6, hand[1] - 58];
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <BalconyStage
        t={T}
        camera="translate(960 580) scale(1.38) translate(-960 -560)"
        doorOpen={1}
        meera={{ headTilt: 3, lean: 5, look: 1, brow: 'soft', mouth: 'smile', blink: false, front: { elbow: [74, -70], hand: [30, -22] }, breathe: 0.5 }}
        priya={{ ...PRIYA_AT, lean: 1, headTilt: -2, look: 0.8, brow: 'happy', mouth: 'smile', blink: false, front: HOLD_ARM, back: PRIYA_LEAN.back, breathe: 0.5 }}
      >
        <Phone pc={pc} ps={1.12} screenOn={1} />
      </BalconyStage>
      {/* paper grain */}
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, mixBlendMode: 'multiply', opacity: 0.16 }}>
        <filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={4} /><feColorMatrix type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.36  0 0 0 0 0.25  0 0 0 0.9 0" /></filter>
        <rect width={1920} height={1080} filter="url(#g)" />
      </svg>
      {/* headline */}
      <div style={{ position: 'absolute', top: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 26, padding: '22px 56px', borderRadius: 80, background: C.mustard, border: `7px solid ${C.cream}`, boxShadow: `0 12px 0 ${C.coralDark}`, transform: 'rotate(-1.5deg)' }}>
          <Img src={staticFile('logo.png')} style={{ width: 96, height: 96, objectFit: 'contain' }} />
          <div style={{ fontFamily: 'Fraunces', fontWeight: 700, color: C.navy, lineHeight: 1.05 }}>
            <div style={{ fontSize: 74 }}>Stuck on Class 10 Chemistry?</div>
            <div style={{ fontSize: 40, color: C.coralDark, marginTop: 8 }}>Simple answers straight from the NCERT textbook</div>
          </div>
        </div>
      </div>
      {/* website */}
      <div style={{ position: 'absolute', bottom: 46, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '16px 48px', borderRadius: 60, background: C.teal, border: `6px solid ${C.cream}`, boxShadow: `0 10px 0 ${C.tealDark}`, fontFamily: 'Fraunces', fontWeight: 700, fontSize: 60, color: C.cream }}>
          <svg width={40} height={40} viewBox="-20 -20 40 40"><path d="M 0 -18 L 5 -5 L 18 0 L 5 5 L 0 18 L -5 5 L -18 0 L -5 -5 Z" fill={C.mustardLight} /></svg>
          VigyanVerse AI · vigyanverseai.live
        </div>
      </div>
    </AbsoluteFill>
  );
};
