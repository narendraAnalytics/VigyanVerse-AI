// LinkedIn demo video (script.txt, 2026-11-24): mid-century cartoon scenes around the owner's screen recording.
// Built scene by scene; the owner reviews each in Remotion Studio (composition "Demo"). NOT uploaded to InsForge.
import React from 'react';
import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { Audio } from '@remotion/media';
import { loadFont as loadFraunces } from '@remotion/google-fonts/Fraunces';
import { loadFont as loadKalam } from '@remotion/google-fonts/Kalam';
import { Captions } from '../Captions';
import { Scene1 } from './Scene1';
import { Scene2, SCENE2_END, S2_FROM, W2 } from './Scene2';
import { CLIPS, Scene3, SCENE3_END, S3_FROM } from './Scene3';
import { IRIS, Scene4, SCENE4_END, S4_FROM, W4_ANIKA, W4_LIVE } from './Scene4';
import { S5_CUES, S5_FROM, Scene5, SCENE5_END } from './Scene5';
import { C, FPS, LINES, prog, wordAt } from './theme';

loadFraunces('normal', { weights: ['700'], subsets: ['latin'] });
loadKalam('normal', { weights: ['700'], subsets: ['latin'] });

export const DEMO_SECONDS = SCENE5_END;

// sound effects (video seconds): door, formula pops, page flips
const SFX: [number, string, number][] = [
  [0.4, 'whoosh', 0.12],
  [wordAt(1, 'equations'), 'card-pop', 0.18],
  [wordAt(1, 'acids'), 'card-pop', 0.18],
  [wordAt(1, 'bases'), 'card-pop', 0.18],
  [wordAt(1, 'reads') + 0.1, 'paper-tick', 0.3],
  [wordAt(1, 'reads') + 0.55, 'paper-tick', 0.3],
  [wordAt(1, 'three') + 0.05, 'paper-tick', 0.3],
  // scene 2: the phone lights up, the dive into it
  [W2.vv - 0.05, 'switch', 0.15],
  [W2.look + 0.25, 'whoosh', 0.2],
  // scene 3: a soft swish at each new section
  ...CLIPS.slice(1).map((c) => [c.from, 'whoosh', 0.1] as [number, string, number]),
  // scene 4: out of the phone, the website sign, Anika happy, the iris
  [SCENE3_END, 'whoosh', 0.18],
  [W4_LIVE - 0.1, 'card-pop', 0.22],
  [W4_ANIKA + 0.3, 'ding', 0.18],
  [IRIS, 'whoosh', 0.15],
  // scene 5: work with us, then the final card
  ...S5_CUES.chips.map((c) => [c, 'card-pop', 0.14] as [number, string, number]),
  [S5_CUES.mail, 'ding', 0.14],
  [S5_CUES.final, 'whoosh', 0.18],
];

// music: soft bed, ducked under the voices, faded in and out
const musicVolume = (f: number) => {
  const t = f / FPS;
  const talking = LINES.some((l) => t > l.at - 0.2 && t < l.at + l.seconds + 0.2);
  const fade = Math.min(1, t / 1.0, Math.max(0, (DEMO_SECONDS - t) / 1.5));
  return (talking ? 0.07 : 0.14) * fade;
};

/** Printed-paper grain over everything (mid-century print look). */
const Grain: React.FC = () => (
  <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, mixBlendMode: 'multiply', opacity: 0.16, pointerEvents: 'none' }}>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={4} stitchTiles="stitch" />
      <feColorMatrix type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.36  0 0 0 0 0.25  0 0 0 0.9 0" />
    </filter>
    <rect width={1920} height={1080} filter="url(#grain)" />
  </svg>
);

/** Title card top left for the first seconds (the first frame is never empty). */
const TitleChip: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const k = 1 - prog(t, 2.6, 3.2);
  return k > 0 ? (
    <div style={{ position: 'absolute', left: 48, top: 40, display: 'flex', alignItems: 'center', gap: 16, padding: '12px 26px 12px 14px', borderRadius: 40, background: C.cream, boxShadow: '0 6px 0 rgba(20,12,4,0.25)', opacity: k, transform: `translateY(${(1 - k) * -10}px)` }}>
      <Img src={staticFile('logo.png')} style={{ width: 58, height: 58, objectFit: 'contain' }} />
      <span style={{ fontFamily: 'Fraunces', fontWeight: 700, fontSize: 34, color: C.navy }}>VigyanVerse AI</span>
    </div>
  ) : null;
};

/** Logo badge bottom right, on every shot. */
const LogoBadge: React.FC<{ hideFrom: number }> = ({ hideFrom }) => (useCurrentFrame() / FPS >= hideFrom ? null :
  <div style={{ position: 'absolute', right: 40, bottom: 40, width: 104, height: 104, borderRadius: '50%', background: C.cream, boxShadow: '0 5px 0 rgba(20,12,4,0.25)', display: 'grid', placeItems: 'center' }}>
    <Img src={staticFile('logo.png')} style={{ width: 82, height: 82, objectFit: 'contain' }} />
  </div>
);

export type DemoProps = { voice: boolean; sounds: boolean };

export const Demo: React.FC<DemoProps> = ({ voice, sounds }) => (
  <AbsoluteFill style={{ background: C.paper }}>
    <Sequence durationInFrames={S2_FROM} name="Scene 1 · the worry">
      <Scene1 />
    </Sequence>
    <Sequence from={S2_FROM} durationInFrames={Math.ceil(SCENE2_END * FPS) - S2_FROM} name="Scene 2 · the tip">
      <Scene2 />
    </Sequence>
    <Sequence from={S3_FROM} durationInFrames={Math.ceil(SCENE3_END * FPS) - S3_FROM} name="Scene 3 · how it works">
      <Scene3 />
    </Sequence>
    <Sequence from={S4_FROM} durationInFrames={Math.ceil(SCENE4_END * FPS) - S4_FROM} name="Scene 4 · the smile + end card">
      <Scene4 />
    </Sequence>
    <Sequence from={S5_FROM} durationInFrames={Math.ceil(SCENE5_END * FPS) - S5_FROM} name="Scene 5 · work with us + final card">
      <Scene5 />
    </Sequence>
    <Grain />
    <TitleChip />
    <LogoBadge hideFrom={SCENE4_END} />
    <Captions lines={LINES} />
    {sounds && <Audio src={staticFile('music/demo-bed.wav')} volume={musicVolume} />}
    {voice &&
      LINES.map((l) => (
        <Sequence key={l.file} from={Math.round(l.at * FPS)} layout="none" name={`voice ${l.file.split('/').pop()}`}>
          <Audio src={staticFile(l.file)} />
        </Sequence>
      ))}
    {sounds &&
      SFX.map(([t, name, v], i) => (
        <Sequence key={i} from={Math.round(t * FPS)} layout="none" name={`sfx ${name}`}>
          <Audio src={staticFile(`sfx/${name}.wav`)} volume={v} />
        </Sequence>
      ))}
  </AbsoluteFill>
);
