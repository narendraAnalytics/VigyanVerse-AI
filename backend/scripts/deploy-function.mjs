// Build then deploy one edge function to the linked InsForge project.
// Usage: npm run fn:deploy -- <slug>
import { execSync } from 'node:child_process';

const slug = process.argv[2];
if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
  console.error('Usage: npm run fn:deploy -- <slug>   (lowercase letters, digits, hyphens)');
  process.exit(1);
}
execSync(`node scripts/build-functions.mjs ${slug}`, { stdio: 'inherit' });
execSync(`npx -y @insforge/cli functions deploy ${slug} --file dist/functions/${slug}.js`, { stdio: 'inherit' });
