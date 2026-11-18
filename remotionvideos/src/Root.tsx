import { AbsoluteFill, Composition, Sequence, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { ClayVideo, type ClayProps } from './ClayVideo';
import { ohmStyle, SOUND_CUES } from './styles/ohm.js';
import { toStory, toVideo, VIDEO_SECONDS, VOICE_CUES } from './timeline';

const FPS = 30;
type Props = ClayProps & { voice: boolean; sounds: boolean };

const OhmsLaw: React.FC<Props> = ({ voice, sounds, ...clay }) => (
  <AbsoluteFill>
    <ClayVideo clayStyle={ohmStyle} storyTime={toStory} {...clay} />
    {/* narration: Edge TTS (npm run voice), one file per beat */}
    {voice &&
      VOICE_CUES.map((v) => (
        <Sequence key={v.file} from={Math.round(v.at * FPS)} layout="none" name={`voice ${v.file.split('/').pop()}`}>
          <Audio src={staticFile(v.file)} volume={1} />
        </Sequence>
      ))}
    {/* gentle Remotion sound effects, on the same schedule as the picture (story time -> video time) */}
    {sounds &&
      (SOUND_CUES as [number, string, number][]).map(([t, name, volume], i) => (
        <Sequence key={i} from={Math.round(toVideo(t) * FPS)} layout="none" name={`sfx ${name}`}>
          <Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} />
        </Sequence>
      ))}
  </AbsoluteFill>
);

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Chapter 11, Electricity: Ohm's law. Soft Clay style, narrated. Render at 1920x1080, ship 1280x720. */}
      <Composition
        id="OhmsLaw"
        component={OhmsLaw}
        durationInFrames={Math.ceil(VIDEO_SECONDS * FPS)}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ previewSamples: 2, renderSamples: 32, voice: true, sounds: true }}
      />
    </>
  );
};
