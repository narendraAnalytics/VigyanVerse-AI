import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { MODEL_ROUTES, estimateCostInr, type ModelTask } from './models.ts';
import { readEnv, requireEnv } from './env.ts';

// Edge Functions are capped at 30s. Leave headroom for retrieval and DB writes.
const REQUEST_TIMEOUT_MS = 22_000;

const clients = new Map<string, OpenAI>();

function sarvamClient(api: 'v1' | 'v2'): OpenAI {
  const cached = clients.get(api);
  if (cached) return cached;
  const apiKey = requireEnv('SARVAM_API_KEY');
  const client = new OpenAI({
    apiKey,
    baseURL: readEnv(`SARVAM_BASE_URL_${api.toUpperCase()}`) ?? `https://api.sarvam.ai/${api}`,
    defaultHeaders: { 'api-subscription-key': apiKey },
    timeout: REQUEST_TIMEOUT_MS,
    maxRetries: 0, // retries are handled by the fallback model, within the time budget
  });
  clients.set(api, client);
  return client;
}

export interface ChatResult {
  content: string;
  model: string;
  usedFallback: boolean;
  inputTokens: number;
  outputTokens: number;
  costInr: number;
  latencyMs: number;
}

export async function chat(
  task: ModelTask,
  messages: ChatCompletionMessageParam[],
  overrides: { maxTokens?: number; temperature?: number } = {},
): Promise<ChatResult> {
  const route = MODEL_ROUTES[task];
  const candidates = route.fallback ? [route.model, route.fallback] : [route.model];
  const started = Date.now();
  let lastError: unknown;

  for (const [i, model] of candidates.entries()) {
    try {
      const response = await sarvamClient(route.api).chat.completions.create({
        model,
        messages,
        max_tokens: overrides.maxTokens ?? route.maxTokens,
        temperature: overrides.temperature ?? route.temperature,
        ...(route.json ? { response_format: { type: 'json_object' as const } } : {}),
        ...(i === 0 && route.reasoningEffort ? { reasoning_effort: route.reasoningEffort } : {}),
      });
      const content = response.choices[0]?.message?.content ?? '';
      if (!content.trim()) {
        // Typically finish_reason "length" after the budget went to hidden reasoning.
        throw new Error(`Empty completion from ${model} (finish_reason: ${response.choices[0]?.finish_reason})`);
      }
      const inputTokens = response.usage?.prompt_tokens ?? 0;
      const outputTokens = response.usage?.completion_tokens ?? 0;
      return {
        content,
        model,
        usedFallback: i > 0,
        inputTokens,
        outputTokens,
        costInr: estimateCostInr(model, inputTokens, outputTokens),
        latencyMs: Date.now() - started,
      };
    } catch (error) {
      lastError = error;
      // Not enough time left for a second full call inside the 30s function limit.
      if (Date.now() - started > 12_000) break;
    }
  }
  throw lastError;
}
