// Render a few frames as PNGs to check framing, light and legibility.
// node scripts/stills.mjs <outDir> <samples> <frame> [frame...]
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';

const [outDir, samples, ...frames] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
const inputProps = { previewSamples: 2, renderSamples: Number(samples) };
const chromiumOptions = { gl: 'angle' };
const composition = await selectComposition({ serveUrl, id: 'OhmsLaw', inputProps, chromiumOptions });
for (const f of frames) {
  const t0 = Date.now();
  await renderStill({ composition, serveUrl, frame: Number(f), output: path.join(outDir, `f${f}.png`), inputProps, chromiumOptions, scale: 0.5, timeoutInMilliseconds: 120000 });
  console.log(`frame ${f} in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
