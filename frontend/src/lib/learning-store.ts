'use client';

import { createStore } from './store';
import {
  api, ApiError, createQuiz, deleteQuiz, fetchMastery, fetchQuizHistory, fetchRevisions, rpc,
  type Advice, type Graded, type Lang, type MasteryRow, type Quiz, type QuizHistoryRow, type QuizReview,
} from './api';

export const learning = createStore({
  loaded: false,
  mastery: [] as MasteryRow[],
  revisions: [] as { chapter_id: string; due_at: string; interval_days: number }[],
  advice: null as Advice | null,
  adviceError: null as string | null,
  /** Submitted quizzes, newest first ("Your quizzes" on the left page). */
  history: [] as QuizHistoryRow[],
});

let inflight: { key: string; at: number; p: Promise<void> } | null = null;

/** Several components ask at once: one request per language per minute (advice may use the AI). */
export function loadLearning(language: Lang, force = false): Promise<void> {
  if (!force && inflight && inflight.key === language && Date.now() - inflight.at < 60_000) return inflight.p;
  inflight = { key: language, at: Date.now(), p: doLoad(language) };
  return inflight.p;
}

async function doLoad(language: Lang) {
  const [mastery, revisions, history] = await Promise.all([
    fetchMastery().catch(() => []), fetchRevisions().catch(() => []), fetchQuizHistory().catch(() => []),
  ]);
  learning.set({ mastery, revisions, history, loaded: true });
  try {
    learning.set({ advice: await api.learningAdvice(language), adviceError: null });
  } catch (e) {
    learning.set({ adviceError: e instanceof ApiError ? e.message : 'Could not load your next step.' });
  }
}

// ---------------------------------------------------------------------------
// Quizzes (owner 2026-11-16): whole chapter or a topic, 5 / 10 / 15 questions, timed or not,
// and a review of every submitted quiz.
// ---------------------------------------------------------------------------
export type QuizPhase = 'idle' | 'setup' | 'generating' | 'ready' | 'answering' | 'grading' | 'graded' | 'error' | 'review';
export interface AnswerDraft { selectedIndex?: number; answerText?: string }

/** Quiz sizes the student can pick (15 at most). Each batch of 5 is one quiz-generate call. */
export const QUIZ_SIZES = [5, 10, 15] as const;
export type QuizSize = (typeof QUIZ_SIZES)[number];
const BATCH = 5;
/** The server sets the real limit (begin_quiz_timer); these are for the preview. */
export const SECONDS_PER_MCQ = 60;
export const SECONDS_PER_NUMERIC = 120;

export const quiz = createStore({
  phase: 'idle' as QuizPhase,
  chapterId: null as string | null,
  /** The student's choices (kept between quizzes). */
  setup: { size: 5 as QuizSize, mode: 'chapter' as 'chapter' | 'topic', topic: '', timed: true },
  progress: { ready: 0, planned: 0 },
  quiz: null as Quiz | null,
  /** Set when some batches failed: fewer questions than asked for. */
  partial: null as string | null,
  answers: {} as Record<string, AnswerDraft>,
  graded: null as Graded | null,
  /** Timed quiz: local deadline (ms), from the server's limit when the timer started. */
  deadline: null as number | null,
  limitSeconds: null as number | null,
  review: null as QuizReview | null,
  error: null as string | null,
});

/** Open the setup card for a chapter. */
export function openQuizSetup(chapterId: string) {
  generation++;
  quiz.set({ phase: 'setup', chapterId, quiz: null, answers: {}, graded: null, error: null, partial: null, deadline: null, limitSeconds: null, review: null });
}

/** Expected time limit for questions of these types (the server decides the real one). */
export function limitFor(questions: { type: 'mcq' | 'numeric' }[]): number {
  return questions.reduce((s, q) => s + (q.type === 'numeric' ? SECONDS_PER_NUMERIC : SECONDS_PER_MCQ), 0);
}

let generation = 0;

export async function startQuiz(language: Lang) {
  const s = quiz.get();
  const chapterId = s.chapterId;
  if (!chapterId) return;
  const topic = s.setup.mode === 'topic' ? s.setup.topic.trim().slice(0, 80) : '';
  if (s.setup.mode === 'topic' && topic.length < 2) {
    quiz.set({ error: 'Type a topic from this chapter, or choose the whole chapter.' });
    return;
  }
  const planned = s.setup.size;
  const run = ++generation;
  quiz.set({ phase: 'generating', quiz: null, answers: {}, graded: null, error: null, partial: null, deadline: null, limitSeconds: null, progress: { ready: 0, planned } });

  let assessmentId: string;
  try {
    assessmentId = await createQuiz({ chapterId, language, topic: topic || null, planned, timed: s.setup.timed });
  } catch (e) {
    if (generation === run) quiz.set({ phase: 'error', error: e instanceof ApiError ? e.message : 'Could not make a quiz. Try again.' });
    return;
  }
  // Batches of 5 in parallel: each fits the 30 s function limit and fills its own question numbers.
  const batches = Array.from({ length: Math.ceil(planned / BATCH) }, (_, b) =>
    api.quizGenerate({ chapterId, language, assessmentId, batch: b }).then((q) => {
      if (generation === run) quiz.set((p) => ({ progress: { ...p.progress, ready: p.progress.ready + q.questions.length } }));
      return q;
    }));
  const settled = await Promise.allSettled(batches);
  const made = settled.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
  const questions = made.flatMap((q) => q.questions).sort((a, b) => a.position - b.position);
  if (!questions.length) {
    void deleteQuiz(assessmentId);
    if (generation !== run) return;
    const failed = settled.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
    quiz.set({ phase: 'error', error: failed?.reason instanceof ApiError ? failed.reason.message : 'No questions passed the checks this time. Try again.' });
    return;
  }
  if (generation !== run) return; // closed, or another quiz started (the empty-ish row stays unsubmitted)
  const full: Quiz = { ...made[0], assessmentId, requested: planned, questions };
  const partial = questions.length < planned ? `${questions.length} of ${planned} questions passed every check this time.` : null;
  quiz.set({ quiz: full, partial, phase: s.setup.timed ? 'ready' : 'answering' });
}

/** Timed quiz: the server starts the clock and fixes the limit; the page counts down locally. */
export async function beginTimer() {
  const s = quiz.get();
  if (!s.quiz) return;
  try {
    const r = await rpc<{ started_at: string; limit_seconds: number }>('begin_quiz_timer', { p_assessment: s.quiz.assessmentId });
    // Count from now on this device (no clock-skew surprises); the server checks against its own start.
    const elapsed = Math.max(0, (Date.now() - Date.parse(r.started_at)) / 1000);
    const left = elapsed < 5 ? r.limit_seconds : Math.max(0, r.limit_seconds - elapsed);
    quiz.set({ phase: 'answering', limitSeconds: r.limit_seconds, deadline: Date.now() + left * 1000, error: null });
  } catch (e) {
    quiz.set({ error: e instanceof ApiError ? e.message : 'Could not start the timer. Try again.' });
  }
}

export async function submitQuiz(language: Lang) {
  const s = quiz.get();
  if (!s.quiz || s.phase === 'grading' || s.phase === 'graded') return;
  quiz.set({ phase: 'grading', error: null });
  try {
    const answers = s.quiz.questions
      .map((q) => ({ questionId: q.id, ...s.answers[q.id] }))
      .filter((a) => a.selectedIndex !== undefined || (a.answerText && a.answerText.trim()));
    const graded = await api.answerEvaluate({ assessmentId: s.quiz.assessmentId, answers });
    quiz.set({ phase: 'graded', graded, deadline: null });
    void loadLearning(language, true);
  } catch (e) {
    quiz.set({ phase: 'answering', error: e instanceof ApiError ? e.message : 'Could not submit. Try again.' });
  }
}

/** Read back a submitted quiz: questions, your answers, right answers, marks and feedback. */
export async function openReview(assessmentId: string) {
  generation++;
  quiz.set({ phase: 'review', review: null, error: null, quiz: null, graded: null, deadline: null });
  try {
    const review = await rpc<QuizReview>('quiz_review', { p_assessment: assessmentId });
    if (quiz.get().phase === 'review') quiz.set({ review });
  } catch (e) {
    quiz.set({ error: e instanceof ApiError ? e.message : 'Could not open this quiz. Try again.' });
  }
}

export function closeQuiz() {
  generation++;
  const setup = quiz.get().setup;
  quiz.reset();
  quiz.set({ setup });
}
