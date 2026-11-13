// Shared helpers for live evals (scripts/eval-agent.ts, scripts/eval-retrieval.ts).
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { createAdminClient } from '@insforge/sdk';

export function adminClient() {
  const project = JSON.parse(readFileSync(new URL('../../.insforge/project.json', import.meta.url), 'utf8'));
  return createAdminClient({
    baseUrl: process.env.INSFORGE_BASE_URL ?? project.oss_host,
    apiKey: process.env.INSFORGE_API_KEY ?? project.api_key,
  });
}

/**
 * Sarvam pay-as-you-go allows 50 req/min (gemma4 / glm5.3-flash / deepseek) and 60 req/min
 * (sarvam-105b), account-wide. Space model calls 1.5 s apart (40/min).
 */
export function makeThrottle(intervalMs = 1500) {
  let nextSlot = 0;
  return async () => {
    const wait = Math.max(0, nextSlot - Date.now());
    nextSlot = Math.max(nextSlot, Date.now()) + intervalMs;
    if (wait) await new Promise((r) => setTimeout(r, wait));
  };
}

/** Run tasks with a small worker pool, preserving result order. */
export async function pool<T, R>(items: readonly T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
      process.stdout.write('.');
    }
  }));
  process.stdout.write('\n');
  return out;
}

/** "12.1" matches "12.1 Magnetic..." and "... > 12.1.2 ...", never "2.1" inside "12.1". */
export function matchesGold(sectionPath: string | null, gold: readonly string[]): boolean {
  if (!sectionPath) return false;
  return gold.some((g) => new RegExp(`(^|> )${g.replace(/\./g, '\\.')}[ .]`).test(sectionPath));
}

export const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
export const percentile = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : 0;
};
export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

