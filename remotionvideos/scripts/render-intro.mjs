// Full render of the home-page intro, in chunks (each chunk a fresh browser: one long render ran out of memory on the
// SignIn video). Resumable: a finished chunk has a .done file and is skipped on the next run.
//   node scripts/render-intro.mjs          (run with Remotion Studio CLOSED)
//   node scripts/render-status.mjs         (frames done / remaining, from another terminal)
// Steps: video chunks (muted, 24 samples) -> the audio as a wav (1 sample, small scale: an audio render still steps
// every frame) -> join with ffmpeg (video copied, audio aac 96k, faststart) -> poster from frame 0.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, openSync, closeSync, statSync } from 'node:fs';
import path from 'node:path';

const COMP = 'Intro', FRAMES = 3900, CHUNK = 300, SCALE = '0.6666666666666666';
const DIR = 'out/intro-parts';
mkdirSync(DIR, { recursive: true });
const props = path.join(DIR, 'props.json'), propsAudio = path.join(DIR, 'props-audio.json');
writeFileSync(props, JSON.stringify({ previewSamples: 2, renderSamples: 24, voice: true, sounds: true }));
writeFileSync(propsAudio, JSON.stringify({ previewSamples: 1, renderSamples: 1, voice: true, sounds: true }));

const run = (args, log) => {
  const fd = openSync(log, 'w');
  const r = spawnSync('npx', ['remotion', ...args], { stdio: ['ignore', fd, fd], shell: true });
  closeSync(fd);
  return r.status;
};
const step = (name, done, args, log) => {
  if (existsSync(done)) { console.log(`skip ${name} (done)`); return; }
  const t0 = Date.now();
  console.log(`${new Date().toLocaleTimeString()} ${name} ...`);
  for (let attempt = 1; attempt <= 2; attempt++) {
    const code = run(args, log);
    if (code === 0) { writeFileSync(done, String(Date.now())); console.log(`  ok in ${((Date.now() - t0) / 60000).toFixed(1)} min`); return; }
    console.log(`  failed (exit ${code}), see ${log}${attempt === 1 ? '; retrying once' : ''}`);
  }
  process.exit(1);
};

const parts = [];
for (let a = 0, i = 0; a < FRAMES; a += CHUNK, i++) {
  const b = Math.min(FRAMES, a + CHUNK) - 1, name = `part-${String(i).padStart(2, '0')}`, file = path.join(DIR, `${name}.mp4`);
  parts.push(file);
  step(`${name} frames ${a}-${b}`, file + '.done',
    ['render', COMP, file, `--frames=${a}-${b}`, '--muted', '--concurrency=2', `--scale=${SCALE}`, '--crf=26', `--props=${props}`],
    path.join(DIR, `${name}.log`));
}
const wav = path.join(DIR, 'audio.wav');
step('audio', wav + '.done', ['render', COMP, wav, '--codec=wav', '--scale=0.25', `--props=${propsAudio}`], path.join(DIR, 'audio.log'));

const list = path.join(DIR, 'list.txt');
writeFileSync(list, parts.map((f) => `file '${path.basename(f)}'`).join('\n') + '\n');
const out = 'out/intro-720p-web.mp4';
step('join', out + '.done', ['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-i', wav, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', '-shortest', out], path.join(DIR, 'join.log'));
step('poster', 'out/intro-poster.jpg.done', ['still', COMP, 'out/intro-poster.jpg', '--frame=0', `--scale=${SCALE}`, '--image-format=jpeg', '--jpeg-quality=85', `--props=${props}`], path.join(DIR, 'poster.log'));
console.log(`done: ${out} (${(statSync(out).size / 1e6).toFixed(1)} MB), out/intro-poster.jpg`);
