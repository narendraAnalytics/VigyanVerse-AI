// Answer evaluation (Phase 4d). CODE grades; the Mistake Classification agent only explains.
//   MCQ     : chosen option index === the key's index.
//   numeric : the calculator compares the typed answer with the key (2% tolerance, units converted).
// Unanswered questions score 0. The model never sees marks and cannot change a grade; it is
// called once for all wrong answers, and only if there is time (else the key's own explanation).
// A numeric answer with the right number but no unit is graded wrong with type 'incomplete'
// set by code (CBSE marks the unit).
import { compareNumericAnswer } from '../verify/numeric.ts';
import type { AgentContext, AgentUsage } from './kit.ts';
import { ERROR_TYPES, runMistakeClassifier, type ErrorType, type MistakeItem } from './mistake.ts';
import type { Language } from './tutor.ts';

export const MAX_ANSWERS = 50;
/** One classifier call (GLM, ~1-3 s) must still leave time to save. */
export const CLASSIFY_MIN_MS = 6_000;

export interface EvalQuestion {
  id: string;
  position: number;
  marks: number;
  type: 'mcq' | 'numeric';
  stem: string;
  options: string[] | null;
  key: { answerIndex: number | null; answer: string; explanation: string; work: { expression: string } | null };
}

export interface SubmittedAnswer { questionId: string; selectedIndex?: number; answerText?: string }

export interface QuestionResult {
  questionId: string;
  position: number;
  answered: boolean;
  isCorrect: boolean;
  marksAwarded: number;
  errorType: ErrorType | null;
  feedback: string;
  correctAnswer: string;
  explanation: string;
  selectedIndex: number | null;
  answerText: string | null;
}

export interface Evaluation {
  results: QuestionResult[];
  score: number;
  maxScore: number;
  usage: ({ agent: 'mistake'; usedFallback: boolean; error?: string } & Partial<AgentUsage>)[];
  model: string | null;
}

/** null = the answer is acceptable as sent; otherwise why the request is invalid. */
export function answerProblem(q: EvalQuestion, a: SubmittedAnswer): string | null {
  const hasIndex = a.selectedIndex !== undefined;
  const hasText = a.answerText !== undefined && a.answerText.trim() !== '';
  if (hasIndex === hasText) return 'send either selectedIndex (MCQ) or answerText (numeric)';
  if (q.type === 'mcq') {
    if (!hasIndex || !Number.isInteger(a.selectedIndex) || a.selectedIndex! < 0 || a.selectedIndex! > 3) return 'an MCQ needs selectedIndex 0-3';
  } else if (!hasText) return 'a numeric question needs answerText';
  return null;
}

/** Marks and the reason (numeric only) from the key. */
export function gradeAnswer(q: EvalQuestion, a: SubmittedAnswer): { isCorrect: boolean; check: string | null } {
  if (q.type === 'mcq') return { isCorrect: a.selectedIndex === q.key.answerIndex, check: null };
  const cmp = compareNumericAnswer(String(a.answerText).trim(), q.key.answer);
  return { isCorrect: cmp.match, check: cmp.match ? null : cmp.reason };
}

const studentText = (q: EvalQuestion, a: SubmittedAnswer): string =>
  q.type === 'mcq' ? `${'ABCD'[a.selectedIndex!]}) ${q.options?.[a.selectedIndex!] ?? ''}` : String(a.answerText).trim();

export async function evaluateSubmission(
  questions: EvalQuestion[], answers: SubmittedAnswer[], language: Language,
  deps: { ctx?: AgentContext; timeLeft?: () => number } = {},
): Promise<Evaluation> {
  const byQuestion = new Map(answers.map((a) => [a.questionId, a]));
  const ordered = [...questions].sort((x, y) => x.position - y.position);

  const results: QuestionResult[] = ordered.map((q) => {
    const a = byQuestion.get(q.id);
    const base = { questionId: q.id, position: q.position, correctAnswer: q.key.answer, explanation: q.key.explanation };
    if (!a) return { ...base, answered: false, isCorrect: false, marksAwarded: 0, errorType: null, feedback: q.key.explanation, selectedIndex: null, answerText: null };
    const g = gradeAnswer(q, a);
    return {
      ...base, answered: true, isCorrect: g.isCorrect, marksAwarded: g.isCorrect ? q.marks : 0,
      // Right number, no unit: code decides this one; the model only words the feedback.
      errorType: g.check === 'missing_unit' ? 'incomplete' : null,
      feedback: '', selectedIndex: a.selectedIndex ?? null, answerText: a.answerText?.trim() ?? null,
    } satisfies QuestionResult;
  });

  // Right answers get no feedback text. Wrong ones: one model call, if there is time.
  const wrong = ordered.map((q, i) => ({ q, r: results[i], a: byQuestion.get(q.id) })).filter((x) => x.a && !x.r.isCorrect);
  const usage: Evaluation['usage'] = [];
  let model: string | null = null;
  if (wrong.length) {
    const items: MistakeItem[] = wrong.map(({ q, a }, i) => ({
      id: i + 1, type: q.type, stem: q.stem, options: q.options, studentAnswer: studentText(q, a!),
      correctAnswer: q.key.answer, explanation: q.key.explanation, expression: q.key.work?.expression ?? null,
      check: q.type === 'numeric' ? gradeAnswer(q, a!).check : null,
    }));
    const enoughTime = !deps.timeLeft || deps.timeLeft() >= CLASSIFY_MIN_MS;
    if (enoughTime) {
      const run = await runMistakeClassifier({ items, language }, deps.ctx);
      if (run.usage || run.error) usage.push({ agent: 'mistake', ...run.usage, usedFallback: run.source === 'fallback', error: run.error?.slice(0, 300) });
      if (run.source === 'model') model = run.usage?.model ?? null;
      wrong.forEach(({ r }, i) => {
        const v = run.output.verdicts.find((x) => x.id === i + 1);
        r.feedback = v?.feedback ?? r.explanation;
        // Only code may override: 'incomplete' (missing unit) stays; otherwise the model's type.
        if (r.errorType === null && v && ERROR_TYPES.includes(v.errorType as ErrorType)) r.errorType = v.errorType;
      });
    } else {
      wrong.forEach(({ r }) => { r.feedback = r.explanation; });
    }
  }

  const score = results.reduce((n, r) => n + r.marksAwarded, 0);
  return { results, score, maxScore: ordered.reduce((n, q) => n + q.marks, 0), usage, model };
}
