// Bundles each src/functions/<slug>/index.ts into one file at dist/functions/<slug>.js,
// because `insforge functions deploy --file` takes a single file.
// Local imports (src/shared, src/verify) are inlined; npm packages are rewritten to
// pinned Deno `npm:` specifiers so the edge runtime fetches them itself.
//
// Usage: node scripts/build-functions.mjs [slug...]
import { build } from 'esbuild';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const deps = pkg.dependencies ?? {};

function installedVersion(name) {
  return JSON.parse(readFileSync(join(root, 'node_modules', name, 'package.json'), 'utf8')).version;
}

const npmSpecifiers = {
  name: 'npm-specifiers',
  setup(b) {
    b.onResolve({ filter: /.*/ }, (args) => {
      const p = args.path;
      if (args.kind === 'entry-point' || p.startsWith('.') || p.startsWith('/') || /^[A-Za-z]:[\\/]/.test(p)) {
        return undefined; // local file: let esbuild inline it
      }
      if (/^(npm|node|jsr|https?):/.test(p)) return { path: p, external: true };
      const name = p.startsWith('@') ? p.split('/').slice(0, 2).join('/') : p.split('/')[0];
      if (!(name in deps)) {
        return { errors: [{ text: `"${name}" is imported by an edge function but is not in package.json dependencies` }] };
      }
      return { path: `npm:${name}@${installedVersion(name)}${p.slice(name.length)}`, external: true };
    });
  },
};

const fnRoot = join(root, 'src', 'functions');
const requested = process.argv.slice(2);
const slugs = requested.length
  ? requested
  : readdirSync(fnRoot, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);

for (const slug of slugs) {
  const entry = join(fnRoot, slug, 'index.ts');
  if (!existsSync(entry)) throw new Error(`No entry file for function "${slug}" at ${entry}`);
  const outfile = join(root, 'dist', 'functions', `${slug}.js`);
  await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    target: 'es2022',
    legalComments: 'none',
    plugins: [npmSpecifiers],
    logLevel: 'warning',
  });
  console.log(`built ${slug} -> dist/functions/${slug}.js`);
}
