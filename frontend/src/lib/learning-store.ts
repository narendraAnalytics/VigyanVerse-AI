'use client';

import { createStore } from './store';
import { api, ApiError, fetchMastery, fetchRevisions, type Advice, type Graded, type Lang, type MasteryRow, type Quiz } from './api';

export const learning = createStore({
  loaded: false,
  mastery: [] as MasteryRow[],
  revisions: [] as { chapter_id: string; due_at: string; interval_days: number }[],
  advice: null as Advice | null,
  adviceError: null as string | null,
});

let inflight: { key: string; at: number; p: Promise<void> } | null = null;

/** Several components ask at once: one request per language per minute (advice may use the AI). */
export function loadLearning(language: Lang, force = false): Promise<void> {
  if (!force && inflight && inflight.key === language && Date.now() - inflight.at < 60_000) return inflight.p;
  inflight = { key: language, at: Date.now(), p: doLoad(language) };
  return inflight.p;
}

async function doLoad(language: Lang) {
  const [mastery, revisions] = await Promise.all([fetchMastery().catch(() => []), fetchRevisions().catch(() => [])]);
  learning.set({ mastery, revisions, loaded: true });
  try {
    learning.set({ advice: await api.learningAdvice(language), adviceError: null });
  } catch (e) {
    learning.set({ adviceError: e instanceof ApiError ? e.message : 'Could not load your next step.' });
  }
}

export type QuizPhase = 'idle' | 'generating' | 'answering' | 'grading' | 'graded' | 'error';
export interface AnswerDraft { selectedIndex?: number; answerText?: string }

export const quiz = createStore({
  phase: 'idle' as QuizPhase,
  chapterId: null as string | null,
  quiz: null as Quiz | null,
  answers: {} as Record<string, AnswerDraft>,
  graded: null as Graded | null,
  error: null as string | null,
});

export async function startQuiz(chapterId: string, language: Lang) {
  quiz.set({ phase: 'generating', chapterId, quiz: null, answers: {}, graded: null, error: null });
  try {
    const q = await api.quizGenerate({ chapterId, count: 5, language });
    if (!q.questions.length) throw new ApiError('empty', 'No questions passed the checks this time. Try again.', 0);
    quiz.set({ phase: 'answering', quiz: q });
  } catch (e) {
    quiz.set({ phase: 'error', error: e instanceof ApiError ? e.message : 'Could not make a quiz. Try again.' });
  }
}

export async function submitQuiz(language: Lang) {
  const s = quiz.get();
  if (!s.quiz) return;
  quiz.set({ phase: 'grading', error: null });
  try {
    const answers = s.quiz.questions
      .map((q) => ({ questionId: q.id, ...s.answers[q.id] }))
      .filter((a) => a.selectedIndex !== undefined || (a.answerText && a.answerText.trim()));
    const graded = await api.answerEvaluate({ assessmentId: s.quiz.assessmentId, answers });
    quiz.set({ phase: 'graded', graded });
    void loadLearning(language, true);
  } catch (e) {
    quiz.set({ phase: 'answering', error: e instanceof ApiError ? e.message : 'Could not submit. Try again.' });
  }
}

export function closeQuiz() {
  quiz.reset();
}
