// Runs a STAGE-kit style inside Remotion. The kit already works frame by frame: stage.seek(t) builds and renders
// the whole picture for time t (motion blur, depth of field and soft shadows come from averaging `samples`
// sub-renders), so Remotion only has to call seek() for the current frame.
//   Studio preview: `previewSamples` (2-4) so it plays smoothly. Final render: `renderSamples` (16-64).
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AbsoluteFill, cancelRender, continueRender, delayRender, getRemotionEnvironment, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Fredoka';
import { loadFont as loadFraunces } from '@remotion/google-fonts/Fraunces';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { loadFont as loadPlexMono } from '@remotion/google-fonts/IBMPlexMono';
import { loadFont as loadGrotesk } from '@remotion/google-fonts/SpaceGrotesk';
import { loadFont as loadOswald } from '@remotion/google-fonts/Oswald';
import { loadFont as loadPlayfair } from '@remotion/google-fonts/PlayfairDisplay';
import { loadFont as loadKalam } from '@remotion/google-fonts/Kalam';
import { K } from './kit';

const fredoka = loadFont('normal', { weights: ['500', '600', '700'], subsets: ['latin'] });
const fraunces = loadFraunces('normal', { weights: ['900'], subsets: ['latin'] });
const inter = loadInter('normal', { weights: ['600', '700'], subsets: ['latin'] });
// the Exploded View style (biology): labels in IBM Plex Mono, headings in Space Grotesk
const plexMono = loadPlexMono('normal', { weights: ['500', '600'], subsets: ['latin'] });
const grotesk = loadGrotesk('normal', { weights: ['700'], subsets: ['latin'] });
// the Spotlight Stage style (sign-in): easel cards in Oswald, the cover title in Playfair Display
const oswald = loadOswald('normal', { weights: ['500', '700'], subsets: ['latin'] });
const playfair = loadPlayfair('normal', { weights: ['800'], subsets: ['latin'] });
const playfairItalic = loadPlayfair('italic', { weights: ['800'], subsets: ['latin'] });
// hand-written lettering (owner 2026-11-19), the same Kalam the website uses for its pencil notes
const kalam = loadKalam('normal', { weights: ['400', '700'], subsets: ['latin'] });

export type ClayProps = {
  previewSamples: number;
  renderSamples: number;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
type Stage = { seek: (t: number, samples?: number) => void; renderer: { dispose: () => void } };

export const ClayVideo: React.FC<ClayProps & { clayStyle: any; storyTime?: (videoT: number) => number }> = ({ clayStyle, previewSamples, renderSamples, storyTime }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stage, setStage] = useState<Stage | null>(null);
  const [initHandle] = useState(() => delayRender('Building the clay set', { timeoutInMilliseconds: 120000 }));
  const initDone = useRef(false);
  const samples = getRemotionEnvironment().isRendering ? renderSamples : previewSamples;

  useEffect(() => {
    let S: Stage | null = null;
    let cancelled = false;
    (async () => {
      await Promise.all([fredoka.waitUntilDone(), fraunces.waitUntilDone(), inter.waitUntilDone(), plexMono.waitUntilDone(), grotesk.waitUntilDone(), oswald.waitUntilDone(), playfair.waitUntilDone(), playfairItalic.waitUntilDone(), kalam.waitUntilDone()]);
      S = await K.run(canvasRef.current, clayStyle, { samples, width, height });
      if (cancelled) S?.renderer.dispose();
      else setStage(S);
    })().catch((err) => cancelRender(err));
    return () => {
      cancelled = true;
      S?.renderer.dispose();
    };
  }, [clayStyle, samples, width, height]);

  // seek in a layout effect so the canvas is drawn before Remotion takes the frame
  useLayoutEffect(() => {
    if (!stage) return;
    stage.seek(storyTime ? storyTime(frame / fps) : frame / fps);
    if (!initDone.current) {
      initDone.current = true;
      continueRender(initHandle);
    }
  }, [stage, frame, fps, initHandle, storyTime]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#121518' }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ width: '100%', height: '100%' }} />
    </AbsoluteFill>
  );
};
