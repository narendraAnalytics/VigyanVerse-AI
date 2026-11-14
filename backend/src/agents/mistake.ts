// Agent 8: Mistake Classification (projectOverview.txt §7, Phase 4d). Model: MODEL_ROUTES.mistake (GLM).
//
// Code has ALREADY graded the answers (src/agents/evaluate.ts): this agent never decides what
// is right or wrong, and never sees how many marks were given. For the WRONG answers of one
// submission it returns, in ONE call (minimum tokens), a mistake type and a short, kind
// explanation in the student's language. If the model fails, each item falls back to the
// answer key's own explanation with no mistake type (never an invented one).
import { z } from 'zod';
import { DATA_RULE, fence, runJsonAgent, type AgentContext, type AgentRun, type JsonAgentSpec } from './kit.ts';
import { LANGUAGE_RULE, type Language } from './tutor.ts';

/** Types the agent may choose for a quiz answer (the table also allows 'diagram_label' for later). */
export const ERROR_TYPES = ['conceptual', 'calculation', 'formula_selection', 'interpretation', 'incomplete', 'terminology'] as const;
export type ErrorType = (typeof ERROR_TYPES)[number];

export interface MistakeItem {
  /** 1-based, echoed back by the model. */
  id: number;
  type: 'mcq' | 'numeric';
  stem: string;
  /** MCQ options as shown to the student. */
  options: string[] | null;
  /** What the student chose / typed (student data). */
  studentAnswer: string;
  correctAnswer: string;
  /** From the answer key (written when the question was made, already validated). */
  explanation: string;
  /** Numeric only: the formula the calculator used. */
  expression: string | null;
  /** Numeric only: why the calculator did not accept it ('value_mismatch', 'missing_unit', ...). */
  check: string | null;
}

export interface MistakeInput { items: MistakeItem[]; language: Language }
export interface MistakeVerdict { id: number; errorType: ErrorType | null; feedback: string }
export interface MistakeOutput { verdicts: MistakeVerdict[] }

/** Most wrong answers classified in one call (a quiz has <= 5 questions; allow headroom). */
export const MAX_ITEMS = 8;

const ModelOutput = z.object({
  items: z.array(z.object({
    id: z.coerce.number().int(),
    error_type: z.preprocess((v) => (typeof v === 'string' ? v.trim().toLowerCase().replace(/[\s-]+/g, '_') : v), z.enum(ERROR_TYPES)),
    feedback: z.string().max(600),
  })).max(MAX_ITEMS + 2),
});
type ModelOutput = z.infer<typeof ModelOutput>;

const SYSTEM = (language: Language) => [
  'You are a kind Class 10 Science teacher (CBSE / Andhra Pradesh, NCERT). Code has already marked each answer below as WRONG. For each one:',
  '"error_type": the main kind of mistake, exactly one of: ' + ERROR_TYPES.join(', ') + '.',
  '  conceptual = the idea itself is misunderstood or not known; calculation = right method but an arithmetic / rounding / unit-conversion slip; formula_selection = used a wrong formula or law; interpretation = misread what the question asked or gave; incomplete = a missing part such as the unit; terminology = confused two terms or names.',
  '"feedback": 1 or 2 short, kind sentences: what went wrong in the student\'s thinking, then the right idea. Use ONLY the facts in "Correct answer" and "Why" given; do not add new facts. Simple Class 10 words. ' + LANGUAGE_RULE[language].replace('Write the answer', 'Write the feedback'),
  'Return only JSON: {"items": [{"id": 1, "error_type": "conceptual", "feedback": ""}]} with "id" = the number of the item.',
  DATA_RULE,
].join('\n');

function renderItem(it: MistakeItem): string {
  return [
    `Item ${it.id} (${it.type})`,
    `Question: ${it.stem}`,
    it.options ? `Options: ${it.options.map((o, i) => `${'ABCD'[i]}) ${o}`).join('  ')}` : '',
    `Student's answer:\n${fence(it.studentAnswer)}`,
    `Correct answer: ${it.correctAnswer}`,
    it.expression ? `Formula used: ${it.expression}` : '',
    it.check ? `Check result: ${it.check}` : '',
    `Why: ${it.explanation || '(none)'}`,
  ].filter(Boolean).join('\n');
}

function fallbackFor(input: MistakeInput): MistakeOutput {
  return { verdicts: input.items.map((it) => ({ id: it.id, errorType: null, feedback: it.explanation })) };
}

export function finalizeMistakes(out: ModelOutput, input: MistakeInput): MistakeOutput {
  const byId = new Map(out.items.map((i) => [i.id, i]));
  return {
    verdicts: input.items.map((it) => {
      const v = byId.get(it.id);
      const feedback = v?.feedback.trim();
      // A missing or empty verdict never blocks the student: use the key's explanation.
      return v && feedback ? { id: it.id, errorType: v.error_type, feedback } : { id: it.id, errorType: null, feedback: it.explanation };
    }),
  };
}

export const mistakeSpec: JsonAgentSpec<MistakeInput, MistakeOutput, ModelOutput> = {
  name: 'mistake',
  task: 'mistake',
  schema: ModelOutput,
  buildMessages: (input) => [
    { role: 'system', content: SYSTEM(input.language) },
    { role: 'user', content: input.items.map(renderItem).join('\n\n') },
  ],
  // ~70 output tokens per item (feedback in Telugu script costs more), plus room.
  callOverrides: (input) => ({ maxTokens: 300 + 220 * input.items.length }),
  postProcess: finalizeMistakes,
  fallback: fallbackFor,
};

export async function runMistakeClassifier(input: MistakeInput, ctx?: AgentContext): Promise<AgentRun<MistakeOutput>> {
  if (!input.items.length) return { output: { verdicts: [] }, source: 'model' };
  const items = input.items.slice(0, MAX_ITEMS);
  const run = await runJsonAgent(mistakeSpec, { ...input, items }, ctx);
  // Items past the limit (never in practice) get the key's explanation.
  const extra = input.items.slice(MAX_ITEMS).map((it) => ({ id: it.id, errorType: null, feedback: it.explanation }));
  return extra.length ? { ...run, output: { verdicts: [...run.output.verdicts, ...extra] } } : run;
}
