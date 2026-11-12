// Central model registry. Changing a model, its API version or a price must be a
// one-line edit here, never a code change in an agent or edge function.
// Verify IDs/prices against https://docs.sarvam.ai/api/token-factory before release.

export type ModelTask =
  | 'router'
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
}

export const MODEL_ROUTES: Record<ModelTask, ModelRoute> = {
  router: { model: 'glm5.3-flash', api: 'v2', maxTokens: 300, temperature: 0, json: true },
  tutor: { model: 'sarvam-105b', api: 'v2', maxTokens: 1200, temperature: 0.3, reasoningEffort: 'none', fallback: 'glm5.3-flash' },
  socratic: { model: 'sarvam-105b', api: 'v2', maxTokens: 600, temperature: 0.4, reasoningEffort: 'none', fallback: 'glm5.3-flash' },
  quiz: { model: 'deepseekv4.1-flash-1017', api: 'v2', maxTokens: 2500, temperature: 0.5, json: true, fallback: 'sarvam-105b' },
  // Correctness matters more than speed here, but reasoning at ~75 tokens/s cannot fit
  // the 30 s limit with a useful budget. Benchmark 'low' + 2000 tokens in Phase 4.
  validator: { model: 'sarvam-105b', api: 'v2', maxTokens: 800, temperature: 0, json: true, reasoningEffort: 'none' },
  math: { model: 'deepseekv4.1-flash-1017', api: 'v2', maxTokens: 1500, temperature: 0, fallback: 'sarvam-105b' },
  mistake: { model: 'glm5.3-flash', api: 'v2', maxTokens: 400, temperature: 0, json: true },
  vision: { model: 'gemma4', api: 'v2', maxTokens: 1500, temperature: 0 },
  voice_dialogue: { model: 'sarvam-105b-conversations', api: 'v2', maxTokens: 400, temperature: 0.4 },
};

/** INR per 1M tokens, excluding GST. Recheck before budgeting. */
export const MODEL_PRICING_INR: Record<string, { input: number; output: number }> = {
  'sarvam-105b': { input: 15, output: 60 },
  'sarvam-105b-conversations': { input: 15, output: 60 },
  'deepseekv4.1-flash-1017': { input: 25, output: 105 },
  gemma4: { input: 35, output: 90 },
  'glm5.3-flash': { input: 13.5, output: 45 },
  'glm5.3': { input: 126, output: 390 },
};

export function estimateCostInr(model: string, inputTokens: number, outputTokens: number): number {
  const price = MODEL_PRICING_INR[model];
  if (!price) return 0;
  return (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
}

// Embeddings: one model + one dimension per vector column. 768 dims is chosen on
// purpose: it matches EmbeddingGemma 2 (Sarvam, provisioned) and can be requested
// from hosted models that support Matryoshka truncation, so switching provider
// later means re-embedding, not a schema migration.
export const EMBEDDING = {
  dimensions: 768,
  defaultModel: 'openai/text-embedding-3-small',
} as const;
