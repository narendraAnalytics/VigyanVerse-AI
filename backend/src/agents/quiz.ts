// Agent 6: Quiz Generation (projectOverview.txt §7, Phase 4a). Model: MODEL_ROUTES.quiz (DeepSeek).
//
// Writes CBSE Class 10 practice questions from textbook passages. One JSON call; then CODE
// gates every question (research 2026: LLM-written MCQs often have item-writing flaws, and
// rule-based checks catch the common ones):
//   - MCQ: exactly 4 distinct options, a valid answer index, no "all / none of the above",
//     and the right option must not stand out by length (an answer giveaway);
//   - numeric: the calculator (verify/numeric) must reproduce the answer from the givens;
//   - every question cites at least one of OUR passages (source chunk ids come from code);
//   - duplicates are dropped; options are shuffled by code (models put the key in the same
//     place too often);
//   - formative-only chapters get no year-end-exam-style quiz (CBSE 2026-27 rule).
// Whether each question is actually right and unambiguous is checked next by the Assessment
// Validation agent (4b), with a different model.
import { z } from 'zod';
import type { ChunkHit } from '../shared/retrieval.ts';
import { compareNumericAnswer, computeAnswer } from '../verify/numeric.ts';
import { DATA_RULE, runJsonAgent, type AgentContext, type AgentRun, type JsonAgentSpec } from './kit.ts';
import { citationOf, formatPassages, LANGUAGE_RULE, type Citation, type Language } from './tutor.ts';

export type QuestionType = 'mcq' | 'numeric';

export interface QuizInput {
  passages: ChunkHit[];
  /** 1..MAX_WRITTEN questions per call (fits the 30 s Edge Function limit). */
  count: number;
  language: Language;
  /** From the chapter / topic row. */
  assessmentScope: 'summative' | 'formative_only';
  difficulty?: 1 | 2 | 3;
  types?: QuestionType[];
}

export interface QuizQuestion {
  type: QuestionType;
  stem: string;
  /** MCQ only, after code shuffled them. */
  options: string[] | null;
  answerIndex: number | null;
  /** The correct answer as text (MCQ: the option; numeric: "3 A"). */
  answer: string;
  explanation: string;
  difficulty: 1 | 2 | 3;
  sourceChunkIds: string[];
  citations: Citation[];
  /** Numeric answer reproduced by the calculator. */
  verifiedNumeric: boolean;
  /** Numeric only: what the calculator used (kept for the validator and audits). */
  work: { given: Record<string, string>; expression: string; unit: string } | null;
}

export interface QuizOutput {
  questions: QuizQuestion[];
  rejected: { stem: string; reason: string }[];
  /** Set when no quiz may be made (e.g. a formative-only chapter). */
  refused: string | null;
}

/** Most questions a student can ask for. */
export const MAX_QUESTIONS = 5;
/** Most the writer is asked for in one call: one spare for the question the validator may drop. */
export const MAX_WRITTEN = MAX_QUESTIONS + 1;

const ModelQuestion = z.object({
  type: z.preprocess((v) => (typeof v === 'string' ? v.trim().toLowerCase() : v), z.enum(['mcq', 'numeric'])),
  stem: z.string().max(600),
  options: z.array(z.string().max(200)).max(6).default([]),
  answer: z.union([z.number(), z.string().max(120)]),
  given: z.record(z.string().max(20), z.union([z.string().max(60), z.number()]).transform(String)).default({}),
  expression: z.string().max(200).default(''),
  unit: z.string().max(30).default(''),
  explanation: z.string().max(800).default(''),
  difficulty: z.coerce.number().int().min(1).max(3).catch(2),
  sources: z.array(z.number().int()).max(5).default([]),
});
const ModelOutput = z.object({ questions: z.array(ModelQuestion).max(8) });
type ModelOutput = z.infer<typeof ModelOutput>;
type ModelQuestion = z.infer<typeof ModelQuestion>;

const SYSTEM = (input: QuizInput) => [
  'You write practice questions for Class 10 Science students (CBSE / Andhra Pradesh, NCERT textbook), in the style of the CBSE board exam.',
  `Write exactly ${input.count} questions using ONLY facts in the numbered textbook passages. Difficulty ${input.difficulty ?? 2} on a 1-3 scale.`,
  `Question types allowed: ${(input.types ?? ['mcq']).join(', ')}.`,
  '"mcq": a clear stem and exactly 4 options with ONE correct answer; "answer" = the index (0-3) of the correct option. Wrong options must be plausible to a student, similar in length and style to the right one, and clearly wrong according to the passages. Never use "all of the above", "none of the above" or "both A and B".',
  '"numeric": a short calculation from the passages (e.g. Ohm\'s law, power, mirror formula) with all values given. Fill "given" (each quantity with its unit, e.g. {"V": "12 V", "R": "4 ohm"}), "expression" (the right side of the formula using only those symbols, numbers, + - * / ^ ( ), no unit conversions) and "unit" (the answer\'s unit); "answer" = number and unit only, e.g. "3 A". Use the NCERT sign convention for mirrors and lenses.',
  '"explanation": 1 or 2 simple sentences saying why the answer is right. "sources": the passage numbers the question comes from.',
  'Write simply, in plain Class 10 language. ' + LANGUAGE_RULE[input.language].replace('Write the answer', 'Write the questions, options and explanations'),
  'Return only JSON: {"questions": [{"type": "mcq", "stem": "", "options": ["", "", "", ""], "answer": 0, "explanation": "", "difficulty": 2, "sources": [1]}]}',
  DATA_RULE,
].join('\n');

// Item-writing flaws that code can catch (rule-based checks, cf. Moore et al.).
const BANNED_OPTION = /\b(all|none|both|neither) of (the )?(above|these)\b|\bboth (a|\(a\)) and (b|\(b\))\b/i;
const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** Deterministic shuffle (seeded by the stem), so the same question always shows the same order. */
export function shuffleOptions(options: string[], answerIndex: number, seed: string): { options: string[]; answerIndex: number } {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  const order = options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const j = h % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { options: order.map((i) => options[i]), answerIndex: order.indexOf(answerIndex) };
}

/** null = the question passes; otherwise why it was dropped. */
function mcqProblem(q: ModelQuestion): string | null {
  const options = q.options.map((o) => o.trim());
  const answer = typeof q.answer === 'number' ? q.answer : Number(q.answer);
  if (options.length !== 4 || options.some((o) => !o)) return 'needs exactly 4 non-empty options';
  if (new Set(options.map(norm)).size !== 4) return 'options repeat';
  if (!Number.isInteger(answer) || answer < 0 || answer > 3) return 'answer is not an option index 0-3';
  if (options.some((o) => BANNED_OPTION.test(o))) return 'uses "all/none of the above"';
  const others = options.filter((_, i) => i !== answer);
  const meanOther = others.reduce((n, o) => n + o.length, 0) / others.length;
  if (options[answer].length > 25 && options[answer].length >= 1.8 * meanOther) return 'right option is much longer than the others (answer giveaway)';
  return null;
}

export function finalizeQuiz(out: ModelOutput, input: QuizInput): QuizOutput {
  const questions: QuizQuestion[] = [];
  const rejected: QuizOutput['rejected'] = [];
  const seen = new Set<string>();
  const allowed = new Set(input.types ?? ['mcq']);
  for (const q of out.questions) {
    const stem = q.stem.trim();
    const reject = (reason: string) => rejected.push({ stem: stem.slice(0, 200), reason });
    if (stem.length < 15) { reject('stem too short'); continue; }
    if (!allowed.has(q.type)) { reject(`type ${q.type} was not asked for`); continue; }
    if (seen.has(norm(stem))) { reject('duplicate'); continue; }
    const sources = [...new Set(q.sources)].filter((n) => Number.isInteger(n) && n >= 1 && n <= input.passages.length);
    if (!sources.length) { reject('no textbook source'); continue; }
    const hits = sources.map((n) => input.passages[n - 1]);
    const base = {
      stem, explanation: q.explanation.trim(), difficulty: q.difficulty as 1 | 2 | 3,
      sourceChunkIds: hits.map((h) => h.chunk_id), citations: hits.map(citationOf),
    };

    if (q.type === 'mcq') {
      const problem = mcqProblem(q);
      if (problem) { reject(problem); continue; }
      const shuffled = shuffleOptions(q.options.map((o) => o.trim()), Number(q.answer), stem);
      questions.push({ ...base, type: 'mcq', options: shuffled.options, answerIndex: shuffled.answerIndex, answer: shuffled.options[shuffled.answerIndex], verifiedNumeric: false, work: null });
    } else {
      let computed: { value: string; display: string };
      try {
        computed = computeAnswer(q.expression, q.given, q.unit || undefined);
      } catch {
        reject('the calculator could not compute the answer'); continue;
      }
      const stated = String(q.answer);
      if (!compareNumericAnswer(stated.replace(/\s*\(.*$/, ''), computed.value).match) { reject(`the calculator gets ${computed.display}, not ${stated}`); continue; }
      questions.push({ ...base, type: 'numeric', options: null, answerIndex: null, answer: computed.display, verifiedNumeric: true, work: { given: q.given, expression: q.expression, unit: q.unit } });
    }
    seen.add(norm(stem));
  }
  return { questions: questions.slice(0, input.count), rejected, refused: null };
}

export const quizSpec: JsonAgentSpec<QuizInput, QuizOutput, ModelOutput> = {
  name: 'quiz',
  task: 'quiz',
  schema: ModelOutput,
  buildMessages: (input) => [
    { role: 'system', content: SYSTEM(input) },
    { role: 'user', content: `Textbook passages:\n${formatPassages(input.passages)}` },
  ],
  // ~250 output tokens per question, plus room.
  callOverrides: (input) => ({ maxTokens: 300 + 280 * input.count }),
  postProcess: finalizeQuiz,
  // No model -> no questions (never invent a quiz without the model and the checks).
  fallback: () => ({ questions: [], rejected: [], refused: null }),
};

export async function runQuiz(input: QuizInput, ctx?: AgentContext): Promise<AgentRun<QuizOutput>> {
  // Code rules first: no model call for a quiz that may not be made.
  if (input.assessmentScope === 'formative_only') {
    return { output: { questions: [], rejected: [], refused: 'This chapter is formative only: no exam-style quiz (CBSE 2026-27).' }, source: 'model' };
  }
  if (!input.passages.length) return { output: { questions: [], rejected: [], refused: 'No textbook passages for this topic.' }, source: 'model' };
  return runJsonAgent(quizSpec, { ...input, count: Math.max(1, Math.min(MAX_WRITTEN, Math.round(input.count))) }, ctx);
}
