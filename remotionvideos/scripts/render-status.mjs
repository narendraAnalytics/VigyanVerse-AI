// How far the intro render is: node scripts/render-status.mjs
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const DIR = 'out/intro-parts', FRAMES = 3900, CHUNK = 300;
if (!existsSync(DIR)) { console.log('not started'); process.exit(0); }
let done = 0, current = '';
for (let a = 0, i = 0; a < FRAMES; a += CHUNK, i++) {
  const n = Math.min(FRAMES, a + CHUNK) - a, name = `part-${String(i).padStart(2, '0')}`, base = path.join(DIR, name);
  if (existsSync(base + '.mp4.done')) { done += n; continue; }
  if (existsSync(base + '.log')) {
    const log = readFileSync(base + '.log', 'utf8'), m = [...log.matchAll(/Rendered (\d+)\/(\d+)/g)].pop();
    if (m) { done += Number(m[1]); current = `${name}: ${m[1]}/${m[2]}`; } else current = `${name}: starting`;
  }
  break;
}
const pct = (100 * done / FRAMES).toFixed(1);
console.log(`video frames: ${done} / ${FRAMES} done (${pct}%), ${FRAMES - done} remaining${current ? `  [now ${current}]` : ''}`);
const started = existsSync(path.join(DIR, 'props.json')) ? statSync(path.join(DIR, 'props.json')).mtimeMs : null;
if (started && done > 0 && done < FRAMES) {
  const perFrame = (Date.now() - started) / done, left = (FRAMES - done) * perFrame / 60000;
  console.log(`about ${left.toFixed(0)} min of video frames left (${(perFrame / 1000).toFixed(1)} s per frame so far), then audio + join (~10-20 min)`);
}
for (const [label, f] of [['audio', 'audio.wav.done'], ['join', '../intro-720p-web.mp4.done'], ['poster', '../intro-poster.jpg.done']]) console.log(`${label}: ${existsSync(path.join(DIR, f)) ? 'done' : 'not yet'}`);
