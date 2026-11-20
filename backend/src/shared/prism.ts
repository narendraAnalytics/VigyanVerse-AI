// Sarvam Prism (`sarvam-prism`): a decision model. It returns probabilities for options we give it, no text.
// Docs checked 2026-11-20 (docs.sarvam.ai/api/token-factory/models/sarvam-prism):
//   POST https://api.sarvam.ai/v2/systemone  { model, state, questions: { id: { type: noul|choice|score,
//   instructions, criteria } } }  ->  { answers: { id: { type, choice, confidence, probabilities } | { noul } },
//   usage: { input_tokens, output_tokens: 0 } }.  Rs 4 per 1M input tokens, output free.
// Spike 2026-11-20 (scripts/spike-prism.ts, 34 English router cases): intent 97%, subject 100%, unsafe 100%,
// p50 143 ms, p95 434 ms, ~Rs 0.002 a question.
import { readEnv, requireEnv } from './env.ts';

export const PRISM_MODEL = 'sarvam-prism';
export const PRISM_INR_PER_M_INPUT = 4;

export type PrismQuestion =
  | { type: 'choice'; instructions: string; criteria: Record<string, string> }
  | { type: 'noul'; instructions: string };
export interface PrismRequest { state: unknown; questions: Record<string, PrismQuestion> }
export type PrismAnswer =
  | { type: 'choice'; choice: string; confidence: number; probabilities?: Record<string, number> }
  | { type: 'noul'; noul: number };
export interface PrismResult { answers: Record<string, PrismAnswer>; inputTokens: number; latencyMs: number; costInr: number }

/** Injectable for tests (TurnDeps.decide). */
export type DecideFn = (request: PrismRequest, timeoutMs: number) => Promise<PrismResult>;

export const prismCostInr = (inputTokens: number) => (Math.max(0, inputTokens) / 1e6) * PRISM_INR_PER_M_INPUT;

/** One Prism call. Throws on HTTP errors, timeouts and malformed answers (the caller falls back). */
export async function prismDecide(request: PrismRequest, timeoutMs: number, fetchFn: typeof fetch = fetch): Promise<PrismResult> {
  const base = readEnv('SARVAM_BASE_URL_V2') ?? 'https://api.sarvam.ai/v2';
  const key = requireEnv('SARVAM_API_KEY');
  const started = Date.now();
  const res = await fetchFn(`${base}/systemone`, {
    method: 'POST',
    headers: { 'api-subscription-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: PRISM_MODEL, ...request }),
    signal: AbortSignal.timeout(Math.max(200, timeoutMs)),
  });
  const latencyMs = Date.now() - started;
  if (!res.ok) throw new Error(`prism HTTP ${res.status}`);
  const body = (await res.json()) as { answers?: Record<string, PrismAnswer>; usage?: { input_tokens?: number } };
  if (!body.answers || typeof body.answers !== 'object') throw new Error('prism: no answers');
  const inputTokens = body.usage?.input_tokens ?? 0;
  return { answers: body.answers, inputTokens, latencyMs, costInr: prismCostInr(inputTokens) };
}
