// Agent 5: Maths & Science Reasoning (projectOverview.txt §7). Model: MODEL_ROUTES.math (DeepSeek).
//
// For router intent "numerical": calculations (Ohm's law, power, energy, mirror/lens formula,
// resistivity...) and balancing chemical equations. Program-aided: the model writes the givens,
// the formula and a mathjs expression; CODE computes the answer (src/verify/numeric.ts) or
// balances the equation (src/verify/chemistry.ts). The student only sees a number code checked:
//   verified  - the model's answer and code agree
//   corrected - they disagree: code's answer is shown, with steps code builds from the formula
//   unchecked - code could not compute it: the model's answer, clearly marked "not checked"
//   none      - an explanation with nothing to compute
import { z } from 'zod';
import type { ChunkHit } from '../shared/retrieval.ts';
import { balanceEquation, checkBalanced, parseEquation } from '../verify/chemistry.ts';
import { compareNumericAnswer, computeAnswer, normalizeUnits } from '../verify/numeric.ts';
import { DATA_RULE, fence, runJsonAgent, type AgentContext, type AgentRun, type JsonAgentSpec } from './kit.ts';
import type { ContextAssessment } from './retrieval.ts';
import { finalize, formatPassages, LANGUAGE_RULE, tutorSpec, type Citation, type Language, type Turn } from './tutor.ts';

export interface MathInput {
  question: string;
  language: Language;
  passages: ChunkHit[];
  status: ContextAssessment['status'];
  history?: Turn[];
}

export type Check = 'verified' | 'corrected' | 'unchecked' | 'none';

export interface MathOutput {
  type: 'numeric' | 'balance' | 'explain';
  /** Short explanation in the student's language (no final number in it). */
  explanation: string;
  /** Formula and working, one line each. */
  steps: string[];
  /** The final answer shown to the student ("3.82 A", "3Fe + 4H2O → Fe3O4 + 4H2"); null for explain. */
  answer: string | null;
  /** Same answer in mathjs syntax for checking ("3.82 A"); null when not numeric. */
  answerValue: string | null;
  check: Check;
  /** The model's own final answer, for logs and evals (not shown when it was not checked as right). */
  modelAnswer: string;
  /** The model's working as the calculator saw it, for logs and evals. */
  work: { given: Record<string, string>; formula: string; expression: string; unit: string };
  /** Everything the student sees, built by code. */
  reply: string;
  citations: Citation[];
}

const ModelOutput = z.object({
  type: z.preprocess((v) => (typeof v === 'string' ? v.trim().toLowerCase() : v), z.enum(['numeric', 'balance', 'explain'])),
  given: z.record(z.string(), z.union([z.string(), z.number()]).transform(String)).default({}),
  find: z.string().default(''),
  formula: z.string().default(''),
  expression: z.string().default(''),
  unit: z.string().default(''),
  steps: z.array(z.string()).max(10).default([]),
  answer: z.string().default(''),
  equation: z.string().default(''),
  balanced: z.string().default(''),
  explanation: z.string().max(1500).default(''),
  sources: z.array(z.number().int()).max(5).default([]),
});
type ModelOutput = z.infer<typeof ModelOutput>;

const ANSWER_LABEL: Record<Language, { answer: string; unchecked: string }> = {
  en: { answer: 'Answer', unchecked: '(not checked by the calculator)' },
  te: { answer: 'జవాబు', unchecked: '(కాలిక్యులేటర్‌తో సరిచూడలేదు)' },
  te_latn: { answer: 'Answer', unchecked: '(calculator tho check cheyyaledu)' },
};

const SYSTEM = (language: Language) => [
  'You solve Class 10 science numericals (CBSE / Andhra Pradesh, NCERT textbook) and balance chemical equations.',
  'A calculator program checks your work, so write it in the exact JSON fields below.',
  'For a calculation ("type": "numeric"):',
  '- "given": every known quantity with its unit as text, using short symbols, e.g. {"V": "12 V", "R": "4 ohm", "t": "10 minute"}. Convert nothing: write values as the question gives them.',
  '- "find": the symbol asked for; "formula": the textbook formula, e.g. "I = V / R";',
  '- "expression": the right side solved for "find", using ONLY the symbols in "given", numbers, + - * / ^ ( ) and pi, e.g. "V / R" or "1 / (1/f - 1/u)". No units and no unit conversions (like *60 or /1000) inside "expression": the calculator converts units itself;',
  '- "unit": the unit for the answer, e.g. "A", "ohm", "J", "kWh", "cm", "ohm m", "m/s"; write lens power in "D".',
  '- Mirrors and lenses use the NCERT sign convention: distances measured from the pole / optical centre, against the incident light are negative (object distance u is negative; a concave mirror and a concave lens have negative f, a convex mirror and a convex lens positive f).',
  'For balancing ("type": "balance"): "equation" = the unbalanced equation with formulas only, e.g. "Fe + H2O -> Fe3O4 + H2"; "balanced" = your balanced equation.',
  'For a question with nothing to compute ("type": "explain"): leave the calculation fields empty.',
  '"steps": 2 to 5 short lines of working (formula, substitution, result). "answer": ONLY the final number and unit, e.g. "3 A" or "-30 cm": no words, no brackets (say "behind the mirror" in "explanation").',
  '"explanation": 1 or 2 simple sentences on the idea (which law or formula and why), WITHOUT the final number. ' + LANGUAGE_RULE[language].replace('Write the answer', 'Write the explanation'),
  '"sources": numbers of the textbook passages you used (or []). Never invent page numbers.',
  'Return only JSON: {"type": "numeric", "given": {}, "find": "", "formula": "", "expression": "", "unit": "", "steps": [], "answer": "", "equation": "", "balanced": "", "explanation": "", "sources": []}',
  DATA_RULE,
].join('\n');

function buildUser(input: MathInput): string {
  const history = (input.history ?? []).slice(-4).map((t) => `${t.role === 'student' ? 'Student' : 'Tutor'}: ${t.text.slice(0, 400)}`).join('\n');
  return [
    `Textbook passages:\n${formatPassages(input.passages.slice(0, 3))}`,
    history ? `Earlier in this conversation:\n${fence(history)}` : '',
    `Question:\n${fence(input.question)}`,
  ].filter(Boolean).join('\n\n');
}

// Lens power: mathjs has no dioptre; 1 D = 1 m^-1.
const toMathUnit = (unit: string) => (/^(D|dioptre|diopter)$/i.test(unit.trim()) ? 'm^-1' : unit);
const toDisplayUnit = (answer: string, unit: string) => (toMathUnit(unit) !== unit ? answer.replace(/m\^-1$/, 'D') : answer);

/** Substitute the givens into the expression for code-built steps: "V / R" -> "(12 V) / (4 Ω)". */
function substitute(expression: string, given: Record<string, string>): string {
  const names = Object.keys(given).sort((a, b) => b.length - a.length);
  if (!names.length) return expression;
  const re = new RegExp(`\\b(${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'g');
  return expression.replace(re, (name) => `(${given[name].replace(/\bohm\b/g, 'Ω')})`);
}

/** Compute, or null when the calculator cannot. */
function tryCompute(expression: string, out: ModelOutput) {
  if (!expression.trim()) return null;
  try {
    return computeAnswer(expression, out.given, toMathUnit(out.unit) || undefined);
  } catch {
    return null;
  }
}

/**
 * Up to three independent values: the model's answer, code's value of the model's expression,
 * and code's value of the textbook formula when it is written as "find = ..." (e.g. Q = I * t).
 * An answer counts as checked only when two of them agree (eval 2026-11-14 run 1: the
 * expression "I * t * 60" converted minutes twice; the model's own answer was right).
 */
function numeric(out: ModelOutput): Pick<MathOutput, 'answer' | 'answerValue' | 'check' | 'steps'> {
  const find = out.find || 'x';
  // Read only the leading quantity: "+30 cm (on the other side)" -> "30 cm".
  const quantity = (a: string) => a.replace(/\s*\(.*$/, '').replace(/^\s*\+\s*/, '').replace(/\bD\b/, 'm^-1');
  const same = (a: string | undefined, b: string | undefined) =>
    !!a && !!b && compareNumericAnswer(normalizeUnits(quantity(a)), b).match;
  const fromExpression = tryCompute(out.expression, out);
  // "Q = I * t" -> "I * t"; a chained "rho = R*A/l = R*pi*d^2/(4*l)" -> its last part.
  const parts = out.formula.split('=').map((s) => s.trim());
  const rhs = parts.length >= 2 && parts[0] === find ? parts.at(-1) : undefined;
  const fromFormula = rhs ? tryCompute(rhs, out) : null;
  const shown = (c: { display: string; value: string }) => ({ answer: toDisplayUnit(c.display, out.unit), answerValue: c.value });

  if (fromExpression && same(out.answer, fromExpression.value)) return { ...shown(fromExpression), check: 'verified', steps: out.steps };
  if (fromFormula && same(out.answer, fromFormula.value)) return { ...shown(fromFormula), check: 'verified', steps: out.steps };
  if (fromExpression && fromFormula && same(fromFormula.value, fromExpression.value)) {
    // Both code values agree; only the model's arithmetic was wrong: show code's working.
    const answer = shown(fromExpression).answer;
    const steps = [out.formula, `${find} = ${substitute(out.expression, out.given)}`, `${find} = ${answer}`].filter(Boolean);
    return { ...shown(fromExpression), check: 'corrected', steps };
  }
  // Nothing agrees: show the model's answer, clearly marked as not checked.
  return { answer: out.answer || null, answerValue: null, check: 'unchecked', steps: out.steps };
}

function balance(out: ModelOutput): Pick<MathOutput, 'answer' | 'answerValue' | 'check' | 'steps'> {
  try {
    const code = balanceEquation(out.equation);
    let agrees = false;
    try {
      const mine = parseEquation(out.balanced);
      const coeffs = [...mine.reactants, ...mine.products].map((s) => s.coefficient ?? 1);
      agrees = checkBalanced(out.balanced).balanced && coeffs.join() === code.coefficients.join();
    } catch { /* the model's balanced equation did not parse: use code's */ }
    return {
      answer: code.balancedEquation, answerValue: null, check: agrees ? 'verified' : 'corrected',
      steps: agrees ? out.steps : [out.equation.replace(/->/g, '→'), code.balancedEquation],
    };
  } catch {
    return { answer: out.balanced || null, answerValue: null, check: 'unchecked', steps: out.steps };
  }
}

function compose(language: Language, explanation: string, steps: string[], answer: string | null, check: Check): string {
  const label = ANSWER_LABEL[language];
  return [
    explanation.trim(),
    steps.length ? steps.join('\n') : '',
    answer ? `${label.answer}: ${answer}${check === 'unchecked' ? ` ${label.unchecked}` : ''}` : '',
  ].filter(Boolean).join('\n\n');
}

export function finalizeMath(out: ModelOutput, input: MathInput): MathOutput {
  const part = out.type === 'numeric' ? numeric(out) : out.type === 'balance' ? balance(out) : { answer: null, answerValue: null, check: 'none' as const, steps: out.steps };
  // Citations only from our passages (the tutor's rule). No "not in textbook" label here:
  // a numerical on a syllabus topic is rarely printed word for word in the book.
  const { citations } = finalize({ answer: out.explanation || '-', inTextbook: true, sources: out.sources, relatedPassage: null }, input);
  const steps = part.steps.map((s) => s.replace(/\bohm\b/g, 'Ω')).slice(0, 6);
  return {
    type: out.type, explanation: out.explanation.trim(), steps, answer: part.answer, answerValue: part.answerValue,
    check: part.check, modelAnswer: out.answer || out.balanced,
    work: { given: out.given, formula: out.formula, expression: out.expression, unit: out.unit },
    reply: compose(input.language, out.explanation, steps, part.answer, part.check), citations,
  };
}

const NO_WORK = { given: {}, formula: '', expression: '', unit: '' };

/** A chemical equation typed in the question ("Balance: Fe + H2O -> Fe3O4 + H2"), or null. */
export function equationIn(question: string): string | null {
  const m = question.match(/((?:\d*[A-Z][A-Za-z0-9().·]*\s*\+\s*)*\d*[A-Z][A-Za-z0-9().·]*\s*(?:->|→|=)\s*(?:\d*[A-Z][A-Za-z0-9().·]*\s*\+\s*)*\d*[A-Z][A-Za-z0-9().·]*)/);
  return m ? m[1] : null;
}

export const mathSpec: JsonAgentSpec<MathInput, MathOutput, ModelOutput> = {
  name: 'math',
  task: 'math',
  schema: ModelOutput,
  buildMessages: (input) => [
    { role: 'system', content: SYSTEM(input.language) },
    { role: 'user', content: buildUser(input) },
  ],
  postProcess: finalizeMath,
  // Model down: a typed equation can still be balanced by code; anything else gets the
  // tutor's textbook quote (no invented numbers).
  fallback: (input) => {
    const equation = equationIn(input.question);
    if (equation) {
      try {
        const { balancedEquation } = balanceEquation(equation);
        return {
          type: 'balance', explanation: '', steps: [], answer: balancedEquation, answerValue: null, check: 'verified', modelAnswer: '', work: NO_WORK,
          reply: compose(input.language, '', [], balancedEquation, 'verified'), citations: [],
        };
      } catch { /* not a balanceable equation */ }
    }
    const t = tutorSpec.fallback({ question: input.question, language: input.language, wantsDetail: false, passages: input.passages, status: input.status });
    return { type: 'explain', explanation: t.answer, steps: [], answer: null, answerValue: null, check: 'none', modelAnswer: '', work: NO_WORK, reply: t.answer, citations: t.citations };
  },
};

export function runMath(input: MathInput, ctx?: AgentContext): Promise<AgentRun<MathOutput>> {
  return runJsonAgent(mathSpec, input, ctx);
}