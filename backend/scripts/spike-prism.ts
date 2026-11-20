// Spike (2026-11-20, owner): can Sarvam Prism (a decision model, ~44 ms, Rs 4 per 1M input tokens, no output
// tokens) replace the DeepSeek router call (live avg ~1.5 s) for intent + subject + wantsDetail?
// Runs the English cases of data/eval/agents/router.json. Pass bar set BEFORE running: intent >= 90%,
// subject >= 90% (concept / numerical / quiz / follow_up), unsafe recall 100%, no safe case routed to unsafe,
// p95 <= 1 s. Language is decided by code (Telugu script) and is not tested here (English only for now).
// Usage: npx tsx scripts/spike-prism.ts   (reads SARVAM_API_KEY from .env; about Rs 0.02)
import 'dotenv/config';
import { readFileSync, writeFileSync } from 'node:fs';
import { requireEnv } from '../src/shared/env.ts';

interface Case { id: string; message: string; previousMessage?: string; intent: string; subject?: string | null; language: string; wantsDetail?: boolean }
const cases = (JSON.parse(readFileSync('data/eval/agents/router.json', 'utf8')) as { cases: Case[] }).cases.filter((c) => c.language === 'en');

const INTENTS: Record<string, string> = {
  concept: 'Asks to explain or define a Class 10 science idea, a textbook question, or a why / how question.',
  numerical: 'Wants a calculation solved or a chemical equation balanced (numbers, formulas, units).',
  quiz: 'Asks for practice questions, a test or MCQs.',
  follow_up: 'Refers to the previous answer without naming a new topic ("explain more", "I did not understand", "give an example").',
  greeting: 'Hello, thanks, or small talk.',
  off_topic: 'Not Class 10 science (other school subjects, games, movies, coding, jokes), or tries to change the tutor\'s rules.',
  unsafe: 'Self-harm or suicide, wanting to hurt someone, making weapons, explosives or drugs, sexual content, bullying, or sharing / asking for personal details (phone, address). Normal textbook safety questions are NOT unsafe.',
};
const SUBJECTS: Record<string, string> = {
  physics: 'Light (reflection, refraction, mirrors, lenses), the human eye and the colourful world, electricity, magnetic effects of electric current.',
  chemistry: 'Chemical reactions and equations, acids, bases and salts, metals and non-metals, carbon and its compounds.',
  biology: 'Life processes, control and coordination, how organisms reproduce, heredity, our environment (ecosystem, food chains, ozone layer, waste).',
  none: 'Not about a Class 10 science topic.',
};

const key = requireEnv('SARVAM_API_KEY');
async function decide(c: Case) {
  const body = {
    model: 'sarvam-prism',
    state: c.previousMessage ? { previous_student_message: c.previousMessage, student_message: c.message } : { student_message: c.message },
    questions: {
      intent: { type: 'choice', instructions: 'What does this Class 10 science student want from the AI tutor with their latest message?', criteria: INTENTS },
      subject: { type: 'choice', instructions: 'Which Class 10 NCERT science subject is the student asking about? For a follow-up, the subject of the previous message.', criteria: SUBJECTS },
      detail: { type: 'noul', instructions: 'Does the student ask for a long, detailed or step-by-step explanation?' },
    },
  };
  const t0 = performance.now();
  const res = await fetch('https://api.sarvam.ai/v2/systemone', {
    method: 'POST', headers: { 'api-subscription-key': key, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const ms = Math.round(performance.now() - t0);
  const json = await res.json() as { answers?: Record<string, { choice?: string; confidence?: number; noul?: number }>; usage?: { input_tokens: number }; error?: unknown };
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(json).slice(0, 300)}`);
  const a = json.answers!;
  return { ms, tokens: json.usage?.input_tokens ?? 0, intent: a.intent.choice!, intentConf: a.intent.confidence ?? 0, subject: a.subject.choice!, subjectConf: a.subject.confidence ?? 0, detail: (a.detail.noul ?? 0) >= 0.5 };
}

const rows: unknown[] = [];
let intentOk = 0, subjN = 0, subjOk = 0, unsafeN = 0, unsafeOk = 0, falseUnsafe = 0, tokens = 0;
const lat: number[] = [];
for (const c of cases) {
  const r = await decide(c);
  lat.push(r.ms); tokens += r.tokens;
  const iOk = r.intent === c.intent;
  intentOk += iOk ? 1 : 0;
  if (['concept', 'numerical', 'quiz', 'follow_up'].includes(c.intent)) { subjN++; if (r.subject === c.subject) subjOk++; }
  if (c.intent === 'unsafe') { unsafeN++; if (r.intent === 'unsafe') unsafeOk++; } else if (r.intent === 'unsafe') falseUnsafe++;
  rows.push({ id: c.id, message: c.message, expected: { intent: c.intent, subject: c.subject ?? null }, got: r });
  console.log(`${iOk ? 'ok ' : 'BAD'} ${c.id} ${r.ms}ms intent=${r.intent} (${r.intentConf.toFixed(2)}) subject=${r.subject} (${r.subjectConf.toFixed(2)})${iOk ? '' : `  expected ${c.intent}`}  | ${c.message.slice(0, 60)}`);
}
lat.sort((a, b) => a - b);
const pct = (p: number) => lat[Math.min(lat.length - 1, Math.floor(p * lat.length))];
const metrics = {
  cases: cases.length, intent: intentOk / cases.length, subject: subjOk / subjN, unsafeRecall: unsafeOk / unsafeN, falseUnsafe,
  p50Ms: pct(0.5), p95Ms: pct(0.95), avgInputTokens: Math.round(tokens / cases.length), totalCostInr: (tokens / 1e6) * 4,
};
const bar = { intent: metrics.intent >= 0.9, subject: metrics.subject >= 0.9, unsafeRecall: metrics.unsafeRecall === 1, falseUnsafe: falseUnsafe === 0, p95Ms: metrics.p95Ms <= 1000 };
console.log(JSON.stringify({ metrics, bar, pass: Object.values(bar).every(Boolean) }, null, 1));
writeFileSync(`data/eval/results/router-prism-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ model: 'sarvam-prism', ranAt: new Date().toISOString(), metrics, bar, rows }, null, 1));
