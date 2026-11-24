// Scene 2 · THE TIP (script.txt). The camera keeps moving from scene 1 (no cut) into a two-shot. Priya brightens,
// lifts her phone (it lights up with the VigyanVerse AI logo on "VigyanVerse"), Meera turns to it and her worry eases
// on "simple". On "Look." the camera dives into the phone and its screen grows to fill the frame (-> scene 3).
import React from 'react';
import { Img, staticFile, useCurrentFrame } from 'remotion';
import { BalconyStage, PRIYA_LEAN, PRIYA_LOOK, SCENE1_END } from './Scene1';
import type { Arm } from './Woman';
import { C, FPS, blinking, lerp, mouthOpen, prog, twos, wordAt } from './theme';

const LINE = 2;
export const S2_FROM = Math.ceil(SCENE1_END * FPS); // first frame of scene 2
const S2_START = S2_FROM / FPS;
export const W2 = {
  started: wordAt(LINE, 'started'),
  vv: wordAt(LINE, 'vigyanverse'),
  simple: wordAt(LINE, 'simple'),
  look: wordAt(LINE, 'look'),
};
const D0 = W2.look + 0.25; // the dive into the phone
const D1 = D0 + 0.9;
export const SCENE2_END = D1 + 0.5;

export const PRIYA_AT = { x: 1245, y: 850, s: 1.28 };
export const HOLD_ARM: Arm = { elbow: [112, -100], hand: [182, -196] };
export const mix = (a: Arm, b: Arm, k: number): Arm => ({
  elbow: [lerp(a.elbow[0], b.elbow[0], k), lerp(a.elbow[1], b.elbow[1], k)],
  hand: [lerp(a.hand[0], b.hand[0], k), lerp(a.hand[1], b.hand[1], k)],
});
/** A point in Priya's own drawing space -> world space (her Woman transform: translate, mirrored scale, lean). */
export const priyaWorld = (lean: number, [lx, ly]: [number, number]): [number, number] => {
  const a = (lean * Math.PI) / 180;
  const rx = lx * Math.cos(a) - ly * Math.sin(a);
  const ry = lx * Math.sin(a) + ly * Math.cos(a);
  return [PRIYA_AT.x - PRIYA_AT.s * rx, PRIYA_AT.y + PRIYA_AT.s * ry];
};

/** What the phone shows: our app's home screen. Drawn at any size (the phone, then the full frame). */
export const AppScreen: React.FC<{ w: number; h: number; url?: number }> = ({ w, h, url = 0 }) => {
  const logo = Math.min(w * 0.55, h * 0.36);
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.cream, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: logo * 0.08, overflow: 'hidden' }}>
      <Img src={staticFile('logo.png')} style={{ width: logo, height: logo, objectFit: 'contain' }} />
      <div style={{ fontFamily: 'Fraunces', fontWeight: 700, fontSize: logo * 0.2, color: C.navy, whiteSpace: 'nowrap' }}>VigyanVerse AI</div>
      <div style={{ fontFamily: 'Fraunces', fontWeight: 700, fontSize: logo * 0.085, color: C.coralDark, whiteSpace: 'nowrap' }}>Class 10 Science, explained the way you ask it</div>
      {url > 0 && (
        <div style={{ marginTop: logo * 0.06, padding: `${logo * 0.025}px ${logo * 0.07}px`, borderRadius: logo, background: C.teal, color: C.cream, fontFamily: 'Fraunces', fontWeight: 700, fontSize: logo * 0.07, opacity: url }}>
          vigyanverseai.live
        </div>
      )}
    </div>
  );
};

/** Priya's phone (world coords, centre pc, scale ps); the screen shows the app once it is on. */
export const Phone: React.FC<{ pc: [number, number]; ps: number; screenOn: number }> = ({ pc, ps, screenOn }) => (
  <g transform={`translate(${pc[0]} ${pc[1]}) scale(${ps})`}>
    {screenOn > 0 && <circle r={120} fill={C.mustardLight} opacity={0.3 * screenOn} />}
    <rect x={-38} y={-68} width={76} height={136} rx={12} fill={C.ink} />
    <rect x={-32} y={-58} width={64} height={116} rx={6} fill={screenOn > 0.5 ? C.cream : '#1F2B33'} />
    {screenOn > 0.5 && (
      <foreignObject x={-32} y={-58} width={64} height={116}>
        <AppScreen w={64} h={116} />
      </foreignObject>
    )}
    <circle cx={-30} cy={46} r={12} fill={PRIYA_LOOK.skin} />
  </g>
);

export const Scene2: React.FC = () => {
  const frame = useCurrentFrame();
  const t = (S2_FROM + frame) / FPS;
  const tt = twos(t);

  // Priya lifts her phone on "started", pushes it forward on "Look."
  const lift = prog(tt, W2.started - 0.1, W2.started + 0.4);
  const priyaLean = lerp(6, 1, lift);
  const front = mix(PRIYA_LEAN.front, HOLD_ARM, lift);
  const hand = priyaWorld(priyaLean, front.hand);
  const forward = prog(tt, W2.look - 0.05, W2.look + 0.25);
  const ps = lift * (1 + 0.15 * forward); // phone scale
  const pc: [number, number] = [hand[0] - 6, hand[1] - 58]; // phone centre (world)
  const screenOn = prog(t, W2.vv - 0.1, W2.vv + 0.15);

  // Meera turns to the phone, drops her hand and leans in; her brows soften on "simple"
  const turn = prog(tt, W2.started, W2.started + 0.5);
  const handDown = prog(tt, W2.vv, W2.vv + 0.5);
  const hope = prog(tt, W2.simple - 0.2, W2.simple + 0.3);
  const meeraFront = mix({ elbow: [72, -34], hand: [44, -238] }, { elbow: [74, -70], hand: [30, -22] }, handDown);

  // camera: continues scene 1's framing (zoom 1.07, centre 974,544), pushes into a two-shot, then dives into the phone
  const push = prog(t, S2_START, S2_START + 1.8);
  const dive = prog(t, D0, D1);
  const z = lerp(1.07, 1.55, push) * Math.pow(9 / 1.55, dive);
  const toPhone = Math.min(1, dive * 1.8);
  const cx = lerp(lerp(974, 1000, push), pc[0], toPhone);
  const cy = lerp(lerp(544, 560, push), pc[1], toPhone);

  // the phone screen on screen, then growing to the full frame
  const scr = { x: 960 + (pc[0] - 32 * ps - cx) * z, y: 540 + (pc[1] - 58 * ps - cy) * z, w: 64 * ps * z, h: 116 * ps * z };
  const grow = prog(t, D0 + 0.3, D1 + 0.15);
  const ov = { x: lerp(scr.x, 0, grow), y: lerp(scr.y, 0, grow), w: lerp(scr.w, 1920, grow), h: lerp(scr.h, 1080, grow) };

  return (
    <>
      <BalconyStage
        t={t}
        camera={`translate(960 540) scale(${z}) translate(${-cx} ${-cy})`}
        doorOpen={1}
        meera={{
          headTilt: lerp(6, 3, turn),
          lean: lerp(0, 5, handDown),
          look: lerp(0.6, 1, turn),
          brow: hope > 0.5 ? 'soft' : 'worried',
          mouth: hope > 0.5 ? 'neutral' : 'frown',
          blink: blinking(t, 0.7),
          front: meeraFront,
          breathe: (Math.sin(tt * 1.4) + 1) / 2,
        }}
        priya={{
          ...PRIYA_AT,
          lean: priyaLean,
          headTilt: lerp(4, -2, lift),
          look: 0.8,
          brow: t < W2.started ? 'soft' : 'happy',
          mouth: mouthOpen(LINE, t) ? 'open' : t > W2.started ? 'smile' : 'neutral',
          blink: blinking(t, 1.9),
          front,
          back: PRIYA_LEAN.back,
          breathe: (Math.sin(tt * 1.6 + 1) + 1) / 2,
        }}
      >
        {ps > 0.02 && <Phone pc={pc} ps={ps} screenOn={screenOn} />}
      </BalconyStage>
      {grow > 0 && (
        <div style={{ position: 'absolute', left: ov.x, top: ov.y, width: ov.w, height: ov.h, borderRadius: lerp(6 * ps * z, 0, grow), overflow: 'hidden' }}>
          <AppScreen w={ov.w} h={ov.h} url={prog(t, D1, D1 + 0.3)} />
        </div>
      )}
    </>
  );
};
