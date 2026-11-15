// Agent 9: Learning Intelligence advice (Phase 5d). Model: MODEL_ROUTES.advice (GLM).
//
// CODE chose the activity (SQL next_activity(), 5c). This agent only WORDS it: 1-2 short, kind
// sentences to the student. It never picks a chapter, a number or a state. Its words are checked
// by code (length, language, the exact chapter title, no invented numbers); if the model fails or
// breaks a rule, a fixed template sentence for the activity kind is used instead, so the student
// always gets advice and it never costs more than one small GLM call.
import { z } from 'zod';
import { DATA_RULE, runJsonAgent, type AgentContext, type AgentRun, type JsonAgentSpec } from './kit.ts';

export type AdviceLanguage = 'en' | 'te';
export const ACTIVITY_KINDS = ['revise_due', 'practise_weakest', 'start_new', 'keep_going', 'none'] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

/** The jsonb returned by public.next_activity() (migration M6c). */
export const NextActivity = z.object({
  kind: z.enum(ACTIVITY_KINDS),
  chapter_id: z.string().uuid().nullable(),
  chapter_title: z.string().nullable(),
  state: z.string().nullable(),
  score: z.coerce.number().nullable(),
  due_at: z.string().nullable(),
  due_count: z.coerce.number().int().default(0),
  top_errors: z.array(z.object({ error_type: z.string(), count: z.coerce.number().int() })).default([]),
});
export type NextActivity = z.infer<typeof NextActivity>;

export interface AdviceInput { activity: NextActivity; language: AdviceLanguage }
export interface AdviceOutput { message: string }

const ModelOutput = z.object({ message: z.string().min(1).max(600) });
type ModelOutput = z.infer<typeof ModelOutput>;

const ERROR_MEANING: Record<string, string> = {
  conceptual: 'the idea itself',
  calculation: 'calculation slips',
  formula_selection: 'choosing the right formula',
  interpretation: 'reading the question carefully',
  incomplete: 'giving the full answer (for example the unit)',
  terminology: 'science terms and names',
  diagram_label: 'labelling diagrams',
};

const TASK: Record<Exclude<ActivityKind, 'none'>, string> = {
  revise_due: 'It is time to REVISE this chapter (a revision is due). Suggest a short revision quiz on it.',
  practise_weakest: 'This is the chapter that needs the MOST PRACTICE now. Encourage a short practice quiz on it.',
  start_new: 'The student has NOT started this chapter yet. Invite them to begin it with a short quiz.',
  keep_going: 'The student is doing well in every chapter practised. Praise them briefly and suggest one more quiz on this chapter to stay sharp.',
};

const SYSTEM = (language: AdviceLanguage) => [
  'You are a kind Class 10 Science coach (CBSE / Andhra Pradesh). Write the student\'s next-step advice in 1 or 2 SHORT sentences, in plain words.',
  language === 'te'
    ? 'Write in simple Telugu (Telugu script). Write the chapter title EXACTLY as given, in English, in brackets or as is.'
    : 'Write in simple English.',
  'Use ONLY the facts given. Mention the chapter by its exact title. Do not name any other chapter, do not promise marks or exam results, do not invent numbers or facts. Be encouraging, never scolding. Never promise a result (not "you will surely improve", not marks). Keep it under 30 words. Do not list topics inside the chapter. Do not write any digits or numbers (no question counts).',
  'If "Mistakes to work on" is given, you may mention the first one in plain words.',
  'Return only JSON: {"message": ""}',
  DATA_RULE,
].join('\n');

function facts(a: NextActivity): string {
  const errors = a.top_errors.slice(0, 2).map((e) => ERROR_MEANING[e.error_type]).filter(Boolean);
  return [
    `Task: ${a.kind === 'none' ? '' : TASK[a.kind]}`,
    `Chapter title: ${a.chapter_title}`,
    a.state ? `Level in this chapter: ${a.state}` : '',
    a.score !== null && a.state !== 'not_started' ? `Score in this chapter: ${Math.round(a.score)} out of 100` : '',
    errors.length ? `Mistakes to work on: ${errors.join('; ')}` : '',
  ].filter(Boolean).join('\n');
}

/** Fixed sentences used when the model is not called (consent, limits, no model) or fails the checks. */
export function templateMessage(a: NextActivity, language: AdviceLanguage): string {
  const t = a.chapter_title ?? '';
  if (language === 'te') {
    switch (a.kind) {
      case 'revise_due': return `${t} పునశ్చరణ చేసే సమయం వచ్చింది. ఒక చిన్న క్విజ్ రాసి చూడండి.`;
      case 'practise_weakest': return `${t} అధ్యాయంలో ఇంకా కొంచెం సాధన అవసరం. ఒక చిన్న క్విజ్ రాయండి.`;
      case 'start_new': return `${t} అధ్యాయాన్ని ప్రారంభిద్దాం. ఒక చిన్న క్విజ్‌తో మొదలుపెట్టండి.`;
      case 'keep_going': return `చాలా బాగా చేస్తున్నారు! ${t} అధ్యాయంలో మరొక క్విజ్ రాసి సాధన కొనసాగించండి.`;
      default: return 'ఇప్పుడే ప్రారంభిద్దాం: ఒక అధ్యాయం ఎంచుకుని చిన్న క్విజ్ రాయండి.';
    }
  }
  switch (a.kind) {
    case 'revise_due': return `It is time to revise ${t}. Try a short revision quiz.`;
    case 'practise_weakest': return `${t} needs a little more practice. Try a short quiz on it.`;
    case 'start_new': return `Let's start ${t}. Begin with a short quiz.`;
    case 'keep_going': return `You are doing well! Keep going with one more quiz on ${t}.`;
    default: return "Let's get started: pick a chapter and try a short quiz.";
  }
}

const TELUGU = /[ఀ-౿]/g;
const LETTER = /\p{L}/gu;
const sentenceCount = (t: string) => t.split(/(?<=[.?!।])\s+|\n+/).map((s) => s.trim()).filter((s) => s.length > 2).length;

/** The reason a model message must not be used, or null if it is fine. Pure: unit-tested. */
export function adviceProblem(message: string, a: NextActivity, language: AdviceLanguage): string | null {
  const m = message.trim();
  if (!m) return 'empty';
  if (m.length > 320) return 'too long';
  if (sentenceCount(m) > 3) return 'too many sentences';
  if (a.chapter_title && !m.toLowerCase().includes(a.chapter_title.toLowerCase())) return 'chapter title missing';
  const te = (m.match(TELUGU) ?? []).length;
  const letters = (m.match(LETTER) ?? []).length || 1;
  if (language === 'te' ? te / letters < 0.3 : te / letters > 0.1) return 'wrong language';
  // Numbers: only ones that come from the facts (score, due count, error counts). Digits inside the title are fine.
  const allowed = new Set<string>();
  if (a.score !== null) { allowed.add(String(Math.round(a.score))); allowed.add(a.score.toFixed(1)); }
  allowed.add(String(a.due_count));
  for (const e of a.top_errors) allowed.add(String(e.count));
  const body = a.chapter_title ? m.replace(new RegExp(a.chapter_title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' ') : m;
  for (const n of body.match(/\d+(?:\.\d+)?/g) ?? []) if (!allowed.has(n) && n !== '100') return `invented number ${n}`;
  if (/\bmarks?\b.*\b(will|guarantee)|guarantee/i.test(m)) return 'promise';
  return null;
}

export const adviceSpec: JsonAgentSpec<AdviceInput, AdviceOutput, ModelOutput> = {
  name: 'advice',
  task: 'advice',
  schema: ModelOutput,
  buildMessages: (input) => [
    { role: 'system', content: SYSTEM(input.language) },
    { role: 'user', content: facts(input.activity) },
  ],
  // GLM spends some hidden reasoning tokens before the ~60-token answer.
  callOverrides: () => ({ maxTokens: 500 }),
  postProcess: (out, input) => {
    const problem = adviceProblem(out.message, input.activity, input.language);
    if (problem) throw new Error(`message rejected: ${problem}`);
    return { message: out.message.trim() };
  },
  fallback: (input) => ({ message: templateMessage(input.activity, input.language) }),
};

/** Words the advice. kind 'none' (no chapter to name) never calls the model. */
export async function runAdvice(input: AdviceInput, ctx?: AgentContext): Promise<AgentRun<AdviceOutput>> {
  if (input.activity.kind === 'none' || !input.activity.chapter_title) {
    return { output: { message: templateMessage(input.activity, input.language) }, source: 'fallback' };
  }
  return runJsonAgent(adviceSpec, input, ctx);
}

