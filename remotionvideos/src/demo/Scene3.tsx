// Scene 3 · HOW IT WORKS (script.txt). The owner's real screen recording (public/demo/demovideo.mp4, 1366x606) in a
// mid-century screen card: six sections, each zoomed onto the part that matters, with one label each. Priya explains,
// Meera asks in between; a round portrait of whoever is talking sits bottom left. Privacy: the header's account name is
// covered by an "Anika" pill; the Razorpay form (recording 6:00-6:20, phone + email) is never used.
import React from 'react';
import { OffthreadVideo, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { AppScreen, SCENE2_END } from './Scene2';
import { MEERA_LOOK, PRIYA_LOOK } from './Scene1';
import { Woman } from './Woman';
import { C, FPS, LINES, blinking, lerp, lineEnd, mouthOpen, pop, prog, twos, wordAt } from './theme';

export const S3_FROM = Math.ceil(SCENE2_END * FPS);
const S3_START = S3_FROM / FPS;
export const SCENE3_END = lineEnd(14) + 0.6;

const SRC = { w: 1366, h: 606 };
const CARD = { x: 140, y: 64, w: 1640, h: 800 };
type Crop = [number, number, number]; // x, y, width of the source region shown (height follows the card)
type Seg = { src: number; rate?: number; dur?: number; crop: [Crop, Crop]; signedIn?: boolean };
type Clip = { from: number; to: number; label: string; segs: Seg[] };

// screen windows follow Priya's lines (Meera's question plays over the end of the previous section)
export const CLIPS: Clip[] = [
  { from: S3_START, to: LINES[5].at, label: 'Every NCERT chapter · short explainer videos', segs: [{ src: 173.0, crop: [[62, 0, 1242], [20, 24, 1120]] }] },
  { from: LINES[5].at, to: LINES[7].at, label: 'Type or speak · answer with the NCERT page', segs: [{ src: 393.5, crop: [[366, 118, 1000], [366, 44, 1000]], signedIn: true }] },
  {
    from: LINES[7].at,
    to: LINES[9].at,
    label: 'Snap a photo of any question',
    segs: [
      { src: 453.5, dur: 3.3, crop: [[566, 60, 800], [600, 70, 740]], signedIn: true },
      // zoomed above the answer's equation line: the live site shows that line with missing-glyph boxes (owner 2026-11-24)
      { src: 471.6, crop: [[760, 58, 600], [790, 55, 560]], signedIn: true },
    ],
  },
  {
    from: LINES[9].at,
    to: LINES[10].at,
    label: 'Quizzes marked by code · revise next',
    segs: [
      { src: 570.0, dur: 3.0, crop: [[366, 40, 1000], [400, 50, 960]], signedIn: true },
      { src: 599.5, crop: [[546, 70, 820], [560, 74, 780]], signedIn: true },
    ],
  },
  { from: LINES[10].at, to: LINES[12].at, label: 'Bindu explains: whiteboard lessons', segs: [{ src: 432.5, rate: 1.45, crop: [[680, 120, 700], [700, 130, 660]], signedIn: true }] },
  { from: LINES[12].at, to: LINES[14].at, label: 'No subscription · credits from ₹10', segs: [{ src: 692.5, crop: [[600, 100, 760], [610, 110, 730]], signedIn: true }] },
  // owner 2026-11-24: safe payments. The top-up sheet's "Safe payments by Razorpay" box is still from 10:32.6 to
  // 10:34.4, so it plays very slowly while Priya explains (the sheet dims the header: no account name in view).
  { from: LINES[14].at, to: SCENE3_END, label: 'Safe payments by Razorpay · data kept private', segs: [{ src: 632.4, rate: 0.09, crop: [[360, 200, 620], [400, 280, 530]] }] },
];

/** Shield + padlock badge and a "Private · no ads" chip, popping on Priya's words in the safe-payments section. */
const SafeBadges: React.FC<{ t: number }> = ({ t }) => {
  if (t < LINES[14].at) return null;
  const a = pop(t, wordAt(14, 'never'), 0.4);
  const b = pop(t, wordAt(14, 'private'), 0.4);
  return (
    <>
      {a > 0 && (
        <div style={{ position: 'absolute', left: CARD.x + CARD.w - 250, top: CARD.y + 40, transform: `scale(${a}) rotate(-6deg)`, width: 200, height: 200, borderRadius: '50%', background: C.cream, boxShadow: `0 8px 0 ${C.tealDark}`, display: 'grid', placeItems: 'center' }}>
          <svg width={150} height={150} viewBox="-75 -75 150 150">
            <path d="M 0 -62 L 52 -42 L 48 10 Q 40 46 0 64 Q -40 46 -48 10 L -52 -42 Z" fill={C.teal} />
            <rect x={-24} y={-6} width={48} height={38} rx={6} fill={C.mustard} />
            <path d="M -15 -6 L -15 -20 Q -15 -36 0 -36 Q 15 -36 15 -20 L 15 -6" fill="none" stroke={C.mustard} strokeWidth={8} />
            <circle cx={0} cy={11} r={6} fill={C.tealDark} />
            <rect x={-3} y={11} width={6} height={12} fill={C.tealDark} />
          </svg>
        </div>
      )}
      {b > 0 && (
        <div style={{ position: 'absolute', left: CARD.x + CARD.w - 330, top: CARD.y + 270, transform: `scale(${b}) rotate(4deg)`, padding: '12px 26px', borderRadius: 40, background: C.coral, boxShadow: `0 6px 0 ${C.coralDark}`, fontFamily: 'Fraunces', fontWeight: 700, fontSize: 32, color: C.cream, whiteSpace: 'nowrap' }}>
          Private · no ads
        </div>
      )}
    </>
  );
};

/** The account pill drawn over the recording's header name (source coords x 1178-1312, y 12-48). */
const AccountPill: React.FC = () => (
  <div style={{ position: 'absolute', left: 1178, top: 12, width: 134, height: 36, borderRadius: 18, background: '#FBF6EC', border: '1.5px solid #D9CDB8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'Georgia, serif', fontSize: 16, color: '#3A3530' }}>
    <svg width={14} height={14} viewBox="0 0 14 14"><circle cx={7} cy={4.5} r={3} fill="none" stroke="#3A3530" strokeWidth={1.4} /><path d="M 1.5 13 Q 7 6.5 12.5 13" fill="none" stroke="#3A3530" strokeWidth={1.4} /></svg>
    Anika
    <svg width={10} height={10} viewBox="0 0 10 10"><path d="M 2 3.5 L 5 6.5 L 8 3.5" fill="none" stroke="#3A3530" strokeWidth={1.4} /></svg>
  </div>
);

/** One segment of the recording, panned/zoomed from crop[0] to crop[1] over its time on screen. */
const Segment: React.FC<{ seg: Seg; len: number }> = ({ seg, len }) => {
  const f = useCurrentFrame();
  const k = prog(f / FPS, 0, len);
  const [x, y, w] = seg.crop[0].map((v, i) => lerp(v, seg.crop[1][i], k));
  const s = CARD.w / w;
  return (
    <div style={{ position: 'absolute', left: -x * s, top: -y * s, width: SRC.w * s, height: SRC.h * s }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: SRC.w, height: SRC.h, transform: `scale(${s})`, transformOrigin: '0 0' }}>
        <OffthreadVideo src={staticFile('demo/demovideo.mp4')} trimBefore={Math.round(seg.src * FPS)} playbackRate={seg.rate ?? 1} muted style={{ width: SRC.w, height: SRC.h }} />
        {seg.signedIn && <AccountPill />}
      </div>
    </div>
  );
};

/** Mid-century backdrop: teal with drifting boomerangs and starbursts. */
const Backdrop: React.FC<{ t: number }> = ({ t }) => {
  const drift = twos(t) * 12;
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
      <rect width={1920} height={1080} fill={C.teal} />
      {Array.from({ length: 28 }, (_, i) => {
        const x = ((i % 7) * 300 + (Math.floor(i / 7) % 2) * 150 + drift) % 2100 - 90;
        const y = Math.floor(i / 7) * 290 + 40;
        return i % 3 === 0 ? (
          <path key={i} transform={`translate(${x} ${y}) rotate(${(i * 37) % 360})`} d="M 0 -26 L 6 -6 L 26 0 L 6 6 L 0 26 L -6 6 L -26 0 L -6 -6 Z" fill={C.cream} opacity={0.35} />
        ) : (
          <path key={i} transform={`translate(${x} ${y}) rotate(${(i * 53) % 360})`} d="M -50 0 Q 0 -40 50 0 Q 0 -18 -50 0 Z" fill={i % 2 ? C.mustard : C.coral} opacity={0.45} />
        );
      })}
    </svg>
  );
};

/** Round portrait of whoever is talking (bottom left). */
const Cameo: React.FC<{ t: number }> = ({ t }) => {
  let i = -1;
  for (let k = 3; k < LINES.length; k++) if (t >= LINES[k].at - 0.15) i = k;
  if (i < 0) return null;
  const meera = LINES[i].file.includes('meera');
  const k = pop(t, LINES[i].at - 0.15, 0.3);
  const look = meera ? MEERA_LOOK : PRIYA_LOOK;
  const s = 1.0;
  return (
    <div style={{ position: 'absolute', left: 52, top: 870, transform: `scale(${k})`, transformOrigin: '50% 50%' }}>
      <div style={{ width: 168, height: 168, borderRadius: '50%', background: meera ? C.pink : C.mustardLight, border: `8px solid ${C.cream}`, overflow: 'hidden', boxShadow: '0 6px 0 rgba(20,12,4,0.3)' }}>
        <svg width={152} height={152} viewBox="0 0 152 152">
          <Woman
            x={meera ? 72 : 90}
            y={72 + 292 * s}
            s={s}
            flip={!meera}
            {...look}
            headTilt={meera ? 4 : -2}
            look={0.6}
            brow={meera ? 'worried' : 'happy'}
            mouth={mouthOpen(i, t) ? 'open' : meera ? 'neutral' : 'smile'}
            blink={blinking(t, meera ? 0.7 : 1.9)}
            front={{ elbow: [74, -70], hand: [30, -22] }}
            back={{ elbow: [-62, -70], hand: [0, -30] }}
          />
        </svg>
      </div>
      <div style={{ position: 'absolute', left: 150, top: 12, padding: '4px 16px', borderRadius: 20, background: C.cream, fontFamily: 'Fraunces', fontWeight: 700, fontSize: 26, color: C.navy, whiteSpace: 'nowrap' }}>{meera ? 'Meera' : 'Priya'}</div>
    </div>
  );
};

export const Scene3: React.FC = () => {
  const frame = useCurrentFrame();
  const t = (S3_FROM + frame) / FPS;

  // entry: scene 2's full-frame app screen shrinks into the screen card and fades into the recording
  // exit (last 0.6 s): it grows back to the full frame as the app screen, which scene 4 shrinks into Priya's phone
  const exit = prog(t, SCENE3_END - 0.65, SCENE3_END - 0.1);
  const enter = prog(t, S3_START, S3_START + 0.8) * (1 - exit);
  const box = { x: lerp(0, CARD.x, enter), y: lerp(0, CARD.y, enter), w: lerp(1920, CARD.w, enter), h: lerp(1080, CARD.h, enter) };
  const appFade = Math.max(1 - prog(t, S3_START + 0.25, S3_START + 0.8), prog(t, SCENE3_END - 0.65, SCENE3_END - 0.3));

  const ci = CLIPS.findIndex((c) => t >= c.from && t < c.to);
  const clip = CLIPS[Math.max(0, ci)];
  // a mustard band sweeps across the card at each section change
  const sinceSwitch = t - clip.from;
  const wipe = ci > 0 && sinceSwitch < 0.35 ? sinceSwitch / 0.35 : -1;
  const labelK = pop(t, clip.from + (ci === 0 ? 0.6 : 0.1), 0.35);

  return (
    <>
      <Backdrop t={t} />
      <div style={{ position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, borderRadius: lerp(0, 28, enter), overflow: 'hidden', background: C.cream, boxShadow: `0 ${lerp(0, 16, enter)}px 0 ${C.tealDark}`, outline: `${lerp(0, 10, enter)}px solid ${C.cream}` }}>
        <div style={{ position: 'absolute', left: (box.w - CARD.w) / 2, top: (box.h - CARD.h) / 2, width: CARD.w, height: CARD.h, overflow: 'hidden' }}>
          {CLIPS.map((c, n) => {
            let at = c.from;
            return c.segs.map((seg, m) => {
              const end = seg.dur ? Math.min(c.to, at + seg.dur) : c.to;
              const from = Math.round(at * FPS) - S3_FROM;
              const len = Math.max(1, Math.round(end * FPS) - Math.round(at * FPS));
              at = end;
              return (
                <Sequence key={`${n}-${m}`} from={from} durationInFrames={len} layout="none" name={`rec ${c.label.slice(0, 14)} ${m + 1}`}>
                  <Segment seg={seg} len={len / FPS} />
                </Sequence>
              );
            });
          })}
          {wipe >= 0 && (
            <div style={{ position: 'absolute', top: -200, bottom: -200, width: 260, left: lerp(-400, CARD.w + 140, wipe), background: C.mustard, transform: 'skewX(-18deg)', boxShadow: `-40px 0 0 ${C.coral}` }} />
          )}
        </div>
        {appFade > 0 && (
          <div style={{ position: 'absolute', inset: 0, opacity: appFade }}>
            <AppScreen w={box.w} h={box.h} url={1} />
          </div>
        )}
      </div>
      {labelK > 0 && exit < 0.3 && (
        <div style={{ position: 'absolute', left: CARD.x + 36, top: CARD.y - 34, transform: `scale(${labelK})`, transformOrigin: '0 50%', display: 'flex', alignItems: 'center', gap: 14, padding: '12px 30px 12px 20px', borderRadius: 40, background: C.mustard, boxShadow: `0 6px 0 ${C.coralDark}`, fontFamily: 'Fraunces', fontWeight: 700, fontSize: 36, color: C.navy, whiteSpace: 'nowrap' }}>
          <svg width={30} height={30} viewBox="-15 -15 30 30"><path d="M 0 -14 L 4 -4 L 14 0 L 4 4 L 0 14 L -4 4 L -14 0 L -4 -4 Z" fill={C.cream} /></svg>
          {clip.label}
        </div>
      )}
      {exit < 0.3 && <SafeBadges t={t} />}
      {exit < 0.3 && <Cameo t={t} />}
    </>
  );
};
