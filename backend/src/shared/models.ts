// Central model registry. Changing a model, its API version or a price must be a
// one-line edit here, never a code change in an agent or edge function.
// Verify IDs/prices against https://docs.sarvam.ai/api/token-factory before release.

export type ModelTask =
  | 'router'
  | 'query_rewrite'
  | 'tutor'
  | 'socratic'
  | 'quiz'
  | 'validator'
  | 'math'
  | 'mistake'
  | 'vision'
  | 'voice_dialogue';

export interface ModelRoute {
  model: string;
  /** Sarvam API version the model is served on ('v2' = Token Factory, OpenAI-compatible). */
  api: 'v1' | 'v2';
  maxTokens: number;
  temperature: number;
  /** Ask the model for a JSON object response (structured agents). */
  json?: boolean;
  /**
   * Hybrid-reasoning models (sarvam-105b) think by default and the hidden reasoning
   * counts toward max_tokens: in the 2026-11-12 smoke test, 1000 reasoning tokens
   * took ~13 s and returned empty content. 'none' = answer directly (<1 s).
   * Only sent to the primary model, never to the fallback.
   */
  reasoningEffort?: 'none' | 'low' | 'medium' | 'high';
  /** Tried once if the primary model errors or times out. */
  fallback?: string;
  /**
   * Timeout for the PRIMARY model when a fallback exists, so a hung call still leaves time
   * for the fallback inside the 30 s Edge Function limit (tutor eval 2026-11-13: 2/36
   * sarvam-105b calls hung for the full 22 s).
   */
  timeoutMs?: number;
}

export const MODEL_ROUTES: Record<ModelTask, ModelRoute> = {
  // Router eval 2026-11-13 (44 cases + 28 Telugu retrieval, prompt v2, all pass the bar):
  // deepseek (reasoning off) p50 547 ms ₹0.0110/call; glm5.3-flash p50 926 ms ₹0.0113 (24
  // hidden reasoning tokens, cannot be turned off); gemma4 p50 271 ms but ₹0.0246;
  // sarvam-105b failed (empty Telugu keywords, invalid JSON). See backendplan.txt 3b.
  router: { model: 'deepseekv4.1-flash-1017', api: 'v2', maxTokens: 300, temperature: 0, json: true, reasoningEffort: 'none', fallback: 'glm5.3-flash' },
  // Question (EN/TE) -> English textbook keywords for full-text retrieval. No model
  // fallback: on failure retrieval falls back to the question's own words (retrieval.ts).
  query_rewrite: { model: 'glm5.3-flash', api: 'v2', maxTokens: 200, temperature: 0, json: true },
  // JSON mode on: without it sarvam-105b answered 5/8 Telugu questions as plain prose (tutor
  // eval 2026-11-13). max_tokens is set per call by the agent (600 short / 1100 detail).
  tutor: { model: 'sarvam-105b', api: 'v2', maxTokens: 1200, temperature: 0.3, json: true, reasoningEffort: 'none', fallback: 'glm5.3-flash', timeoutMs: 9_000 },
  // Same lessons as tutor: JSON mode (Telugu), 9 s primary timeout so the fallback fits in 30 s.
  // max_tokens set per call by the agent (500). Temperature 0.2 (was 0.4): eval 2026-11-14
  // results swung by several turns between identical runs. Timeout 6 s (was 9): replies are
  // ~120 tokens and the slowest normal call was ~1.6 s, but 4/43 calls hung in run 7 and the
  // 9 s wait + GLM put p95 at 10.3 s.
  socratic: { model: 'sarvam-105b', api: 'v2', maxTokens: 600, temperature: 0.2, json: true, reasoningEffort: 'none', fallback: 'glm5.3-flash', timeoutMs: 6_000 },
  quiz: { model: 'deepseekv4.1-flash-1017', api: 'v2', maxTokens: 2500, temperature: 0.5, json: true, fallback: 'sarvam-105b' },
  // Correctness matters more than speed here, but reasoning at ~75 tokens/s cannot fit
  // the 30 s limit with a useful budget. Benchmark 'low' + 2000 tokens in Phase 4.
  validator: { model: 'sarvam-105b', api: 'v2', maxTokens: 800, temperature: 0, json: true, reasoningEffort: 'none' },
  math: { model: 'deepseekv4.1-flash-1017', api: 'v2', maxTokens: 1500, temperature: 0, fallback: 'sarvam-105b' },
  mistake: { model: 'glm5.3-flash', api: 'v2', maxTokens: 400, temperature: 0, json: true },
  vision: { model: 'gemma4', api: 'v2', maxTokens: 1500, temperature: 0 },
  voice_dialogue: { model: 'sarvam-105b-conversations', api: 'v2', maxTokens: 400, temperature: 0.4 },
};

/**
 * INR per 1M tokens, excluding GST. Hidden reasoning tokens are billed as output.
 * Checked against docs.sarvam.ai/api/token-factory/models on 2026-11-13. Recheck before budgeting.
 */
export const MODEL_PRICING_INR: Record<string, { input: number; output: number }> = {
  'sarvam-105b': { input: 15, output: 60 },
  'sarvam-105b-conversations': { input: 15, output: 60 },
  'deepseekv4.1-flash-1017': { input: 14, output: 55 },
  gemma4: { input: 35, output: 90 },
  'glm5.3-flash': { input: 13.5, output: 45 },
  'glm5.3': { input: 126, output: 390 },
};

export function estimateCostInr(model: string, inputTokens: number, outputTokens: number): number {
  const price = MODEL_PRICING_INR[model];
  if (!price) return 0;
  return (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
}

// Embeddings: NOT IN USE YET (2026-11-12). Retrieval is keyword-first (query_rewrite +
// match_chunks_keyword). document_chunks.embedding is vector(768) to match Sarvam
// embeddinggemma-2, which needs provisioned access requested from Sarvam. Enabling it
// later = backfill embeddings + HNSW index + hybrid RPC; no table change.
export const EMBEDDING = {
  dimensions: 768,
  plannedModel: 'embeddinggemma-2',
} as const;
