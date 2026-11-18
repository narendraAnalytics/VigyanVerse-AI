// Fits a picture to its narration. Each scene is written in "story time" (its own beats); every beat is stretched
// in video time so its narration line fits with a little breathing room. Picture, captions and sound cues all use
// story time; a timeline maps between the two. Re-run `npm run voice -- <video>` and the timing follows.
export type VoiceFile = { lines: { file: string; at: number; seconds: number; text: string }[] };

export function makeTimeline(voice: VoiceFile, story: number[], pad: number[]) {
  const lengths = story.slice(0, -1).map((s0, i) => {
    const line = voice.lines[i];
    return line ? Math.max(story[i + 1] - s0, line.at - s0 + line.seconds + pad[i]) : story[i + 1] - s0;
  });
  const video = lengths.reduce((acc, len) => [...acc, acc[acc.length - 1] + len], [0]);
  const map = (from: number[], to: number[], t: number) => {
    if (t <= from[0]) return to[0];
    for (let i = 1; i < from.length; i++) if (t <= from[i]) return to[i - 1] + ((t - from[i - 1]) / (from[i] - from[i - 1])) * (to[i] - to[i - 1]);
    return to[to.length - 1];
  };
  return {
    seconds: video[video.length - 1],
    toStory: (videoT: number) => map(video, story, videoT),
    toVideo: (storyT: number) => map(story, video, storyT),
    // each narration line starts at its beat's video start plus the same lead it has in story time
    voiceCues: voice.lines.map((l, i) => ({ file: l.file, at: video[i] + (l.at - story[i]) })),
  };
}
