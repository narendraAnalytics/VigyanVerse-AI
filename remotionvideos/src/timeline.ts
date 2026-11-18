// Fits the picture to the narration. The clay scene is written in "story time" (30 s, five beats); each beat is
// stretched in video time so its narration line fits with a little breathing room. Picture, captions and
// sound cues all use story time; this maps between the two. Re-run `npm run voice` and this follows.
import voice from './voice.json';

// story-time start of each beat (and the end), matching the line start times in scripts/voice.mjs
const STORY = [0, 5.4, 12.4, 18.2, 25.0, 30];
const PAD = [0.5, 0.5, 0.5, 0.5, 1.8]; // silence after each line; the last one holds the ending

const lengths = STORY.slice(0, -1).map((s0, i) => {
  const line = voice.lines[i], lead = line.at - s0;
  return Math.max(STORY[i + 1] - s0, lead + line.seconds + PAD[i]);
});
const VIDEO = lengths.reduce((acc, len) => [...acc, acc[acc.length - 1] + len], [0]);

export const VIDEO_SECONDS = VIDEO[VIDEO.length - 1];

const map = (from: number[], to: number[], t: number) => {
  if (t <= from[0]) return to[0];
  for (let i = 1; i < from.length; i++) if (t <= from[i]) return to[i - 1] + ((t - from[i - 1]) / (from[i] - from[i - 1])) * (to[i] - to[i - 1]);
  return to[to.length - 1];
};
export const toStory = (videoT: number) => map(VIDEO, STORY, videoT);
export const toVideo = (storyT: number) => map(STORY, VIDEO, storyT);

// each narration line starts at its beat's video start plus the same lead it has in story time
export const VOICE_CUES = voice.lines.map((l, i) => ({ file: l.file, at: VIDEO[i] + (l.at - STORY[i]), seconds: l.seconds }));
