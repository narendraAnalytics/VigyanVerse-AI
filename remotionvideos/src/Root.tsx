import { AbsoluteFill, Composition, Sequence, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { ClayVideo, type ClayProps } from './ClayVideo';
import { ohmStyle, SOUND_CUES as OHM_SOUNDS } from './styles/ohm.js';
import { rainbowStyle, SOUND_CUES as RAINBOW_SOUNDS } from './styles/rainbow.js';
import { chemistryStyle, SOUND_CUES as CHEMISTRY_SOUNDS } from './styles/chemistry.js';
import { biologyStyle, SOUND_CUES as BIOLOGY_SOUNDS, BEATS as BIOLOGY_BEATS } from './styles/biology.js';
import { makeTimeline } from './timeline';
import ohmVoice from './voice/ohms-law.json';
import rainbowVoice from './voice/rainbow.json';
import chemistryVoice from './voice/chemistry.json';
import biologyVoice from './voice/biology.json';

const FPS = 30;
type Props = ClayProps & { voice: boolean; sounds: boolean };
type Timeline = ReturnType<typeof makeTimeline>;

// One explainer: the 3D scene (story time mapped onto video time), its narration and its sound effects.
const explainer = (style: unknown, cues: [number, string, number][], tl: Timeline) => {
  const Video: React.FC<Props> = ({ voice, sounds, ...rest }) => (
    <AbsoluteFill>
      <ClayVideo clayStyle={style} storyTime={tl.toStory} {...rest} />
      {/* narration: Edge TTS (npm run voice -- <video>), one file per beat */}
      {voice &&
        tl.voiceCues.map((v) => (
          <Sequence key={v.file} from={Math.round(v.at * FPS)} layout="none" name={`voice ${v.file.split('/').pop()}`}>
            <Audio src={staticFile(v.file)} volume={1} />
          </Sequence>
        ))}
      {/* gentle Remotion sound effects, on the same schedule as the picture (story time -> video time) */}
      {sounds &&
        cues.map(([t, name, volume], i) => (
          <Sequence key={i} from={Math.round(tl.toVideo(t) * FPS)} layout="none" name={`sfx ${name}`}>
            <Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} />
          </Sequence>
        ))}
    </AbsoluteFill>
  );
  return Video;
};

// story-time beats (and the end) for each video; the last pad holds the ending
const ohmTl = makeTimeline(ohmVoice, [0, 5.4, 12.4, 18.2, 25.0, 30], [0.5, 0.5, 0.5, 0.5, 1.8]);
const rainbowTl = makeTimeline(rainbowVoice, [0, 6, 13, 22, 29, 35], [0.5, 0.5, 0.5, 0.5, 1.8]);
const OhmsLaw = explainer(ohmStyle, OHM_SOUNDS as [number, string, number][], ohmTl);
const chemistryTl = makeTimeline(chemistryVoice, [0, 7, 13, 20, 27, 30], [0.5, 0.5, 0.5, 0.5, 1.8]);
const Chemistry = explainer(chemistryStyle, CHEMISTRY_SOUNDS as [number, string, number][], chemistryTl);
// biology: the story beats already match the narration lengths, so story time is (almost) video time
const biologyTl = makeTimeline(biologyVoice, BIOLOGY_BEATS, [0.5, 0.5, 0.5, 0.5, 1.8]);
const Biology = explainer(biologyStyle, BIOLOGY_SOUNDS as [number, string, number][], biologyTl);
const Rainbow = explainer(rainbowStyle, RAINBOW_SOUNDS as [number, string, number][], rainbowTl);
const defaults = { previewSamples: 2, renderSamples: 32, voice: true, sounds: true };

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Chapter 11, Electricity: Ohm's law. Soft Clay style. Physics page. */}
      <Composition id="OhmsLaw" component={OhmsLaw} durationInFrames={Math.ceil(ohmTl.seconds * FPS)} fps={FPS} width={1920} height={1080} defaultProps={defaults} />
      {/* Chapter 10, The Human Eye and the Colourful World: dispersion of light. Toy Blocks style. Home page. */}
      <Composition id="Rainbow" component={Rainbow} durationInFrames={Math.ceil(rainbowTl.seconds * FPS)} fps={FPS} width={1920} height={1080} defaultProps={defaults} />
      {/* Chemistry overview: reactions, acids and bases, metals, carbon. Glass and Light style. Chemistry page. */}
      <Composition id="Chemistry" component={Chemistry} durationInFrames={Math.ceil(chemistryTl.seconds * FPS)} fps={FPS} width={1920} height={1080} defaultProps={defaults} />
      {/* Biology overview: cell, life processes, control, reproduction and heredity, environment. Exploded View style. Biology page. */}
      <Composition id="Biology" component={Biology} durationInFrames={Math.ceil(biologyTl.seconds * FPS)} fps={FPS} width={1920} height={1080} defaultProps={defaults} />
    </>
  );
};
