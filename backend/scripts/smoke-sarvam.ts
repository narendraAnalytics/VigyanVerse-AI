// Smoke test: one short call per routed model, on the API version(s) to verify.
// Usage: npm run smoke:sarvam
// Reports status, latency, tokens, cost, and whether JSON mode returned valid JSON.
import 'dotenv/config';
import OpenAI from 'openai';
import { MODEL_ROUTES, estimateCostInr } from '../src/shared/models.ts';
import { requireEnv } from '../src/shared/env.ts';

const apiKey = requireEnv('SARVAM_API_KEY');
const client = (api: 'v1' | 'v2') =>
  new OpenAI({
    apiKey,
    baseURL: `https://api.sarvam.ai/${api}`,
    defaultHeaders: { 'api-subscription-key': apiKey },
    timeout: 30_000,
    maxRetries: 0,
  });

// Unique (model, api, json) combinations from the registry, plus v1 for sarvam-105b
// because the docs disagree on where it is served.
type Case = { model: string; api: 'v1' | 'v2'; json: boolean; reasoning?: string };
const cases = new Map<string, Case>();
for (const r of Object.values(MODEL_ROUTES)) {
  const c: Case = { model: r.model, api: r.api, json: !!r.json, reasoning: r.reasoningEffort };
  cases.set(JSON.stringify(c), c);
}

const prompt = 'In one sentence, why does a pencil look bent in water? Reply in English.';
const jsonPrompt =
  'Return only a JSON object {"subject": string, "language": "en"|"te"} for the question: "కాంతి వక్రీభవనం అంటే ఏమిటి?"';

const rows: Record<string, string | number>[] = [];
for (const c of cases.values()) {
  const started = Date.now();
  try {
    const res = await client(c.api).chat.completions.create({
      model: c.model,
      messages: [{ role: 'user', content: c.json ? jsonPrompt : prompt }],
      // Reasoning models spend part of max_tokens on hidden thinking; keep headroom.
      max_tokens: 800,
      temperature: 0,
      ...(c.json ? { response_format: { type: 'json_object' as const } } : {}),
      ...(c.reasoning ? { reasoning_effort: c.reasoning as 'none' } : {}),
    });
    const text = res.choices[0]?.message?.content ?? '';
    let jsonOk = '-';
    if (c.json) {
      try {
        JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ''));
        jsonOk = /^\s*[{[]/.test(text) ? 'yes' : 'fenced';
      } catch {
        jsonOk = 'NO';
      }
    }
    const inTok = res.usage?.prompt_tokens ?? 0;
    const outTok = res.usage?.completion_tokens ?? 0;
    rows.push({
      model: c.model, api: c.api, json: c.json ? 'on' : 'off', think: c.reasoning ?? '-',
      status: text.trim() ? 'OK' : `EMPTY (${res.choices[0]?.finish_reason})`,
      ms: Date.now() - started, in: inTok, out: outTok,
      inr: Number(estimateCostInr(c.model, inTok, outTok).toFixed(5)), jsonOk,
      reply: text.replace(/\s+/g, ' ').slice(0, 70),
    });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    rows.push({
      model: c.model, api: c.api, json: c.json ? 'on' : 'off', status: `ERR ${e.status ?? ''}`,
      ms: Date.now() - started, reply: (e.message ?? String(err)).slice(0, 90),
    });
  }
}
console.table(rows);
