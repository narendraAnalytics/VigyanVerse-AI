// Quiz pipeline (Phase 4c): the quiz agent writes questions, the validation agent checks them,
// and only questions that pass both are returned. No database here: quiz-generate saves them.
// Fails closed: a question that was not validated is never returned (time ran out, the
// validator was down, a verdict was missing...).
import type { ChunkHit } from '../shared/retrieval.ts';
import type { AgentContext, AgentRun, AgentUsage } from './kit.ts';
import { MAX_QUESTIONS, MAX_WRITTEN, runQuiz, type QuestionType, type QuizQuestion } from './quiz.ts';
import type { Language } from './tutor.ts';
import { runValidator } from './validator.ts';

export interface QuizRequest {
  passages: ChunkHit[];
  /** 1..MAX_QUESTIONS questions the student wants. */
  count: number;
  language: Language;
  assessmentScope: 'summative' | 'formative_only';
  difficulty?: 1 | 2 | 3;
  types?: QuestionType[];
}

export interface QuizUsage extends Partial<AgentUsage> { agent: 'quiz' | 'validator'; usedFallback: boolean; error?: string }

export type QuizPipelineResult =
  | { ok: true; questions: QuizQuestion[]; generated: number; dropped: { stem: string; reason: string }[]; usage: QuizUsage[]; models: { generated: string | null; validated: string | null } }
  | { ok: false; reason: 'refused' | 'quiz_failed' | 'no_time' | 'nothing_validated'; message: string; usage: QuizUsage[] };

/** Time needed for one validator call (p95 5.6 s in the 4b eval) plus saving to the database. */
export const VALIDATION_MIN_MS = 9_000;

const usageOf = (agent: QuizUsage['agent'], run: AgentRun<unknown>): QuizUsage[] =>
  !run.usage && !run.error ? [] : [{ agent, ...run.usage, usedFallback: run.source === 'fallback', error: run.error?.slice(0, 300) }];

export async function generateValidatedQuiz(req: QuizRequest, deps: { ctx?: AgentContext; timeLeft?: () => number } = {}): Promise<QuizPipelineResult> {
  const want = Math.max(1, Math.min(MAX_QUESTIONS, Math.round(req.count)));
  // One spare question: the validator rejects roughly 1 in 7.
  const written = await runQuiz({ ...req, count: Math.min(MAX_WRITTEN, want + 1) }, deps.ctx);
  const usage = usageOf('quiz', written);
  if (written.output.refused) return { ok: false, reason: 'refused', message: written.output.refused, usage };
  if (!written.output.questions.length) return { ok: false, reason: 'quiz_failed', message: 'The quiz writer returned no usable questions.', usage };
  if (deps.timeLeft && deps.timeLeft() < VALIDATION_MIN_MS) return { ok: false, reason: 'no_time', message: 'Not enough time left to check the questions.', usage };

  const checked = await runValidator({ questions: written.output.questions, passages: req.passages }, deps.ctx);
  usage.push(...usageOf('validator', checked));
  const questions = checked.output.accepted.slice(0, want);
  if (!questions.length) return { ok: false, reason: 'nothing_validated', message: 'No question passed the answer check.', usage };
  return {
    ok: true, questions,
    generated: written.output.questions.length + written.output.rejected.length,
    dropped: [...written.output.rejected, ...checked.output.rejected],
    usage,
    models: { generated: written.usage?.model ?? null, validated: checked.usage?.model ?? null },
  };
}

// ---------------------------------------------------------------------------
// Database rows (pure: the function inserts them)
// ---------------------------------------------------------------------------
export interface QuestionRows {
  question: Record<string, unknown>;
  key: Record<string, unknown>;
}

/** Rows for `questions` (what a student may see) and `question_keys` (the secret key). */
export function toQuestionRows(
  questions: QuizQuestion[],
  meta: { chapterId: string; language: Language; generatedBy: string | null; validatedBy: string | null; newId: () => string },
): QuestionRows[] {
  return questions.map((q) => {
    const id = meta.newId();
    return {
      question: {
        id, chapter_id: meta.chapterId, type: q.type, difficulty: q.difficulty,
        // te_latn quizzes are not made: Telugu-in-English-letters students get English questions.
        language: meta.language === 'te' ? 'te' : 'en',
        stem: q.stem, options: q.options, source_chunk_ids: q.sourceChunkIds, citations: q.citations,
        verified_numeric: q.verifiedNumeric, generated_by_model: meta.generatedBy, validated_by_model: meta.validatedBy,
        validation_status: 'validated',
      },
      key: { question_id: id, answer_index: q.answerIndex, answer: q.answer, explanation: q.explanation, work: q.work },
    };
  });
}

/** What the student gets back: the question, never the key or the explanation. */
export function publicQuestion(row: QuestionRows['question'], position: number, marks: number) {
  return {
    id: row.id as string, position, marks, type: row.type as QuestionType, difficulty: row.difficulty as number,
    stem: row.stem as string, options: (row.options as string[] | null) ?? null, citations: row.citations as unknown[],
  };
}
