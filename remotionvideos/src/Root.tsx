import { AbsoluteFill, Composition, Sequence, Still, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { ClayVideo, type ClayProps } from './ClayVideo';
import { ohmStyle, SOUND_CUES as OHM_SOUNDS } from './styles/ohm.js';
import { rainbowStyle, SOUND_CUES as RAINBOW_SOUNDS } from './styles/rainbow.js';
import { chemistryStyle, SOUND_CUES as CHEMISTRY_SOUNDS } from './styles/chemistry.js';
import { signinStyle, SOUND_CUES as SIGNIN_SOUNDS, BEATS as SIGNIN_BEATS } from './styles/signin.js';
import { biologyStyle, SOUND_CUES as BIOLOGY_SOUNDS, BEATS as BIOLOGY_BEATS } from './styles/biology.js';
import { introStyle, SOUND_CUES as INTRO_SOUNDS, BEATS as INTRO_BEATS } from './styles/intro.js';
import { makeTimeline } from './timeline';
import { Captions, type CaptionLine } from './Captions';
import ohmVoice from './voice/ohms-law.json';
import rainbowVoice from './voice/rainbow.json';
import chemistryVoice from './voice/chemistry.json';
import biologyVoice from './voice/biology.json';
import signinVoice from './voice/signin.json';
import introVoice from './voice/intro.json';
import { Demo, DEMO_SECONDS } from './demo/Demo';
import { Thumb } from './demo/Thumb';
import { LifeProcesses, LIFE_SECONDS } from './life/Life';

const FPS = 30;
type Props = ClayProps & { voice: boolean; sounds: boolean };
type Timeline = ReturnType<typeof makeTimeline>;

// Optional music bed (intro, 2026-11-22): `volume`, ducked to `duck` while a narration line plays, faded in and out.
type Music = { file: string; volume: number; duck: number };
const musicVolume = (m: Music, tl: Timeline, seconds: number, voiceLengths: number[]) => (f: number) => {
  const t = f / FPS;
  const talking = tl.voiceCues.some((v, i) => t > v.at - 0.15 && t < v.at + voiceLengths[i] + 0.25);
  const fade = Math.min(1, t / 0.8, Math.max(0, (seconds - t) / 1.5));
  return (talking ? m.duck : m.volume) * fade;
};

// One explainer: the 3D scene (story time mapped onto video time), its narration and its sound effects.
const explainer = (style: unknown, cues: [number, string, number][], tl: Timeline, music?: Music, voiceLengths: number[] = [], captions?: CaptionLine[]) => {
  const Video: React.FC<Props> = ({ voice, sounds, ...rest }) => (
    <AbsoluteFill>
      <ClayVideo clayStyle={style} storyTime={tl.toStory} {...rest} />
      {/* gentle music bed, synthesized by scripts/synth.mjs */}
      {music && sounds && <Audio src={staticFile(music.file)} volume={musicVolume(music, tl, tl.seconds, voiceLengths)} />}
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
      {/* word-by-word captions (intro): Edge TTS word timings, video time */}
      {captions && <Captions lines={captions} />}
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
// sign-in page: beats fitted to the four short lines, so story time is video time
const signinTl = makeTimeline(signinVoice, SIGNIN_BEATS, [0.3, 0.05, 0.1, 1.6]);
const SignIn = explainer(signinStyle, SIGNIN_SOUNDS as [number, string, number][], signinTl);
const Rainbow = explainer(rainbowStyle, RAINBOW_SOUNDS as [number, string, number][], rainbowTl);
// home-page introduction: Paper Pop-Up, built scene by scene (BEATS grows as scenes are added); music bed under it
// pads: 0.4 s after each line; beat 4 (the friend's short line) may end inside the silent tail of its mp3
const introPads = INTRO_BEATS.map((_, i) => (i === 4 ? -0.6 : 0.4));
const introTl = makeTimeline(introVoice, INTRO_BEATS, introPads);
const Intro = explainer(introStyle, INTRO_SOUNDS as [number, string, number][], introTl, { file: 'music/intro-bed.wav', volume: 0.16, duck: 0.1 }, introVoice.lines.map((l) => l.seconds),
  introTl.voiceCues.map((c, i) => ({ at: c.at, text: introVoice.lines[i].text, words: introVoice.lines[i].words as [string, number, number][] })));
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
      {/* Sign-in page welcome: two students sign in with Google or GitHub. Spotlight Stage style. */}
      <Composition id="SignIn" component={SignIn} durationInFrames={Math.ceil(signinTl.seconds * FPS)} fps={FPS} width={1920} height={1080} defaultProps={defaults} />
      {/* Home-page introduction: what VigyanVerse AI is, told by a student. Paper Pop-Up style. Built scene by scene. */}
      {/* LinkedIn demo (2026-11-24): two mothers + the real website recording. Mid-century cartoon. Built scene by scene. */}
      <Composition id="Demo" component={Demo} durationInFrames={Math.ceil(DEMO_SECONDS * FPS)} fps={FPS} width={1920} height={1080} defaultProps={{ voice: true, sounds: true }} />
      {/* LinkedIn thumbnail for the demo video */}
      <Still id="DemoThumb" component={Thumb} width={1920} height={1080} />
      {/* Life Processes study video (2026-11-28): Scale Zoom style (lemo-opuscar). Built scene by scene. */}
      <Composition id="LifeProcesses" component={LifeProcesses} durationInFrames={Math.ceil(LIFE_SECONDS * FPS)} fps={FPS} width={1920} height={1080} defaultProps={{ voice: true, sounds: true }} />
      <Composition id="Intro" component={Intro} durationInFrames={Math.ceil(introTl.seconds * FPS)} fps={FPS} width={1920} height={1080} defaultProps={{ ...defaults, renderSamples: 24 }} />
    </>
  );
};
