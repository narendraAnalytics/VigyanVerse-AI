// Agent 7: Assessment Validation (projectOverview.txt §7, Phase 4b). Model: MODEL_ROUTES.validator
// (Sarvam 105B: a different model from the quiz writer, DeepSeek, on purpose).
//
// The quiz agent's questions carry an answer key. Here a second model answers EVERY question
// WITHOUT seeing the key, the explanation or which option is "right", using only the cited
// textbook passages. CODE then decides (the model never decides):
//   keep a question only if the validator
//     - says it can be answered from the passages,
//     - says it is not ambiguous (one clear right answer),
//     - and its own answer equals the key (MCQ: same option; numeric: calculator comparison).
// Fails closed: no model / invalid JSON / a question with no verdict => nothing is kept. An
// unchecked question is never served to a student.
// One call checks up to MAX_BATCH questions (minimum tokens, one round trip).
import { z } from 'zod';
import type { ChunkHit } from '../shared/retrieval.ts';
import { compareNumericAnswer } from '../verify/numeric.ts';
import { DATA_RULE, runJsonAgent, type AgentContext, type AgentRun, type JsonAgentSpec } from './kit.ts';
import type { QuizQuestion } from './quiz.ts';
import { formatPassages } from './tutor.ts';

export const MAX_BATCH = 10;

export interface ValidatorInput {
  questions: QuizQuestion[];
  /** The passages the questions were written from; each question's sourceChunkIds point into this. */
  passages: ChunkHit[];
}

export interface ValidatedQuiz {
  accepted: QuizQuestion[];
  rejected: { stem: string; reason: string }[];
}

const bool = z.preprocess((v) => (typeof v === 'string' ? ['true', 'yes'].includes(v.trim().toLowerCase()) : v), z.boolean());
const Verdict = z.object({
  id: z.coerce.number().int(),
  /** MCQ: option number 1-4 the validator picked; null when it cannot answer. */
  choice: z.union([z.number(), z.string().max(10)]).nullable().default(null),
  /** Numeric: its answer, number and unit, e.g. "3 A". */
  value: z.union([z.number(), z.string().max(60)]).nullable().default(null),
  answerable: bool,
  ambiguous: bool.default(false),
  /** A short quote copied from the passages that proves the answer. */
  evidence: z.string().max(300).default(''),
  note: z.string().max(200).default(''),
});
const ModelOutput = z.object({ verdicts: z.array(Verdict).max(MAX_BATCH + 2) });
type ModelOutput = z.infer<typeof ModelOutput>;

/** What the validator is shown: the stem and options only, never the key or the explanation. */
function renderQuestion(q: QuizQuestion, n: number, passageNumbers: number[]): string {
  const head = `Q${n} (${q.type}; passages ${passageNumbers.join(', ')}): ${q.stem}`;
  if (q.type === 'mcq') return `${head}\n${(q.options ?? []).map((o, i) => `  ${i + 1}) ${o}`).join('\n')}`;
  return head;
}

const SYSTEM = [
  'You are a strict examiner checking Class 10 Science (NCERT) practice questions. You do NOT have the answer key: solve each question yourself, using ONLY the numbered textbook passages.',
  'For each question return:',
  '"answerable": true only if the passages contain what is needed to answer it; otherwise false.',
  '"ambiguous": true if two or more options could be called correct, if none is correct, or if the question can be read in more than one way; otherwise false.',
  '"choice" (mcq): the number 1-4 of the option you pick, or null if you cannot answer.',
  '"value" (numeric): your final answer, number and unit only, e.g. "3 A", or null if you cannot answer.',
  '"evidence": a short quote (5 to 20 words) copied EXACTLY from the passages that proves your answer. If the passages do not contain it, answerable is false and evidence is empty, EVEN IF you know the answer from other knowledge.',
  '"note": at most 12 words, only when answerable or ambiguous is a problem.',
  'Return only JSON: {"verdicts": [{"id": 1, "choice": 2, "value": null, "answerable": true, "ambiguous": false, "evidence": "<exact words from the passage>", "note": ""}]} with "id" = the question number Q.',
  DATA_RULE,
].join('\n');

interface Prepared { questions: QuizQuestion[]; passages: ChunkHit[]; numbers: number[][] }

/** Only the passages the questions cite, renumbered, so the prompt stays small. */
function prepare(input: ValidatorInput): Prepared {
  const byId = new Map(input.passages.map((p) => [p.chunk_id, p]));
  const used: ChunkHit[] = [];
  const numbers = input.questions.map((q) => {
    const ns: number[] = [];
    for (const id of q.sourceChunkIds) {
      const p = byId.get(id);
      if (!p) continue;
      let i = used.indexOf(p);
      if (i < 0) { used.push(p); i = used.length - 1; }
      ns.push(i + 1);
    }
    return ns;
  });
  return { questions: input.questions, passages: used, numbers };
}

const words = (s: string) => s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3 || /\d/.test(w));

/** The quote must really come from the cited passages: >= 70% of its words occur there. */
export function evidenceSupported(evidence: string, passageText: string): boolean {
  const quote = words(evidence);
  if (quote.length < 2) return false;
  const have = new Set(words(passageText));
  return quote.filter((w) => have.has(w)).length / quote.length >= 0.7;
}

export function judge(out: ModelOutput, input: ValidatorInput): ValidatedQuiz {
  const accepted: QuizQuestion[] = [];
  const rejected: ValidatedQuiz['rejected'] = [];
  const byId = new Map(input.passages.map((p) => [p.chunk_id, p.content]));
  const verdicts = new Map(out.verdicts.map((v) => [v.id, v]));
  input.questions.forEach((q, i) => {
    const v = verdicts.get(i + 1);
    const reject = (reason: string) => rejected.push({ stem: q.stem.slice(0, 200), reason });
    if (!v) return reject('validator gave no verdict');
    if (!v.answerable) return reject(`not answerable from the passages${v.note ? `: ${v.note}` : ''}`);
    const cited = q.sourceChunkIds.map((id) => byId.get(id) ?? '').join(' ');
    if (!evidenceSupported(v.evidence, cited)) return reject('no supporting quote from the cited passages');
    if (v.ambiguous) return reject(`ambiguous${v.note ? `: ${v.note}` : ''}`);
    if (q.type === 'mcq') {
      const picked = Number(v.choice) - 1;
      if (!Number.isInteger(picked) || picked < 0 || picked > 3) return reject('validator gave no valid option');
      if (picked !== q.answerIndex) return reject(`validator picked option ${'ABCD'[picked]}, key is ${'ABCD'[q.answerIndex ?? 0]}`);
    } else {
      if (v.value === null || String(v.value).trim() === '') return reject('validator gave no answer');
      if (!compareNumericAnswer(String(v.value).replace(/\s*\(.*$/, ''), q.answer).match) return reject(`validator got ${v.value}, key is ${q.answer}`);
    }
    accepted.push(q);
  });
  return { accepted, rejected };
}

const validatorSpec: JsonAgentSpec<ValidatorInput, ValidatedQuiz, ModelOutput> = {
  name: 'validator',
  task: 'validator',
  schema: ModelOutput,
  buildMessages: (input) => {
    const p = prepare(input);
    return [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: `Textbook passages:\n${formatPassages(p.passages)}\n\nQuestions:\n${p.questions.map((q, i) => renderQuestion(q, i + 1, p.numbers[i])).join('\n\n')}` },
    ];
  },
  // ~45 output tokens per verdict, plus room.
  callOverrides: (input) => ({ maxTokens: 150 + 90 * input.questions.length }),
  postProcess: judge,
  // Fail closed: nothing is kept when the check could not run.
  fallback: (input) => ({ accepted: [], rejected: input.questions.map((q) => ({ stem: q.stem.slice(0, 200), reason: 'validator unavailable' })) }),
};

export async function runValidator(input: ValidatorInput, ctx?: AgentContext): Promise<AgentRun<ValidatedQuiz>> {
  if (!input.questions.length) return { output: { accepted: [], rejected: [] }, source: 'model' };
  if (input.questions.length > MAX_BATCH) {
    // Callers batch (quiz sizes are <= 5); extra questions are not checked, so not kept.
    const head = await runValidator({ ...input, questions: input.questions.slice(0, MAX_BATCH) }, ctx);
    const extra = input.questions.slice(MAX_BATCH).map((q) => ({ stem: q.stem.slice(0, 200), reason: 'over the batch limit, not checked' }));
    return { ...head, output: { accepted: head.output.accepted, rejected: [...head.output.rejected, ...extra] } };
  }
  return runJsonAgent(validatorSpec, input, ctx);
}
