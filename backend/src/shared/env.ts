// Runtime-agnostic env access: works in InsForge Edge Functions (Deno) and in
// local Node scripts (ingestion, evals, tests).
const g = globalThis as unknown as {
  Deno?: { env: { get(key: string): string | undefined } };
  process?: { env: Record<string, string | undefined> };
};

export function readEnv(name: string): string | undefined {
  const value = g.Deno?.env.get(name) ?? g.process?.env[name];
  return value === '' ? undefined : value;
}

export function requireEnv(name: string): string {
  const value = readEnv(name);
  if (value === undefined) throw new Error(`Missing required env var: ${name}`);
  return value;
}
