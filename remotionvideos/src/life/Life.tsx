// Life Processes study video (script.txt, 2026-11-28), composition "LifeProcesses". Built scene by scene: the owner
// reviews each scene in Remotion Studio before the next one is made. Style: Scale Zoom Explainer (lemo-opuscar).
import React from 'react';
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { Audio } from '@remotion/media';
import { loadFont } from '@remotion/google-fonts/Jost';
import { LogoBadge, Subtitles } from './Hud';
import { Scene1, SCENE1_END, SFX1 } from './Scene1';
import { S2_FROM, Scene2, SCENE2_END, SFX2 } from './Scene2';
import { S3_FROM, Scene3, SCENE3_END, SFX3 } from './Scene3';
import { FPS, LINES } from './theme';

loadFont('normal', { weights: ['400', '500', '600', '700'], subsets: ['latin', 'latin-ext'] });

export const LIFE_SECONDS = SCENE3_END;
const SFX = [...SFX1, ...SFX2, ...SFX3];

// music: a gentle bed, about 10 dB under the narration, ducked while she speaks, faded in and out
const musicVolume = (f: number) => {
  const t = f / FPS;
  const talking = LINES.some((l) => t > l.at - 0.25 && t < l.at + l.seconds + 0.1);
  const fade = Math.min(1, t / 1.2, Math.max(0, (LIFE_SECONDS - t) / 2.0));
  return (talking ? 0.09 : 0.17) * fade;
};

const SubtitleLayer: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080">
        <Subtitles t={t} />
      </svg>
    </AbsoluteFill>
  );
};

export type LifeProps = { voice: boolean; sounds: boolean };

export const LifeProcesses: React.FC<LifeProps> = ({ voice, sounds }) => (
  <AbsoluteFill>
    <Sequence durationInFrames={Math.ceil(SCENE1_END * FPS)} name="Scene 1 · the mystery of life">
      <Scene1 />
    </Sequence>
    <Sequence from={Math.ceil(S2_FROM * FPS)} durationInFrames={Math.ceil(SCENE2_END * FPS) - Math.ceil(S2_FROM * FPS)} name="Scene 2 · what are life processes?">
      <Scene2 />
    </Sequence>
    <Sequence from={Math.ceil(S3_FROM * FPS)} durationInFrames={Math.ceil(SCENE3_END * FPS) - Math.ceil(S3_FROM * FPS)} name="Scene 3 · nutrition">
      <Scene3 />
    </Sequence>
    <SubtitleLayer />
    <LogoBadge />
    {sounds && <Audio src={staticFile('music/life-bed.wav')} volume={musicVolume} />}
    {voice &&
      LINES.map((l) => (
        <Sequence key={l.file} from={Math.round(l.at * FPS)} layout="none" name={`voice ${l.file.split('/').pop()}`}>
          <Audio src={staticFile(l.file)} />
        </Sequence>
      ))}
    {sounds &&
      SFX.map(([t, name, v], i) => (
        <Sequence key={i} from={Math.max(0, Math.round(t * FPS))} layout="none" name={`sfx ${name}`}>
          <Audio src={staticFile(`sfx/${name}.wav`)} volume={v} />
        </Sequence>
      ))}
  </AbsoluteFill>
);
