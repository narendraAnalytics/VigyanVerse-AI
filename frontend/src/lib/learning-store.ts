'use client';

import { createStore } from './store';
import { askTopUp, canAfford, hasCredits, isLocked, priceOf, rupees, wallet } from './wallet-store';
import {
  api, ApiError, createQuiz, deleteQuiz, fetchMastery, fetchQuizHistory, fetchRevisions, rpc, searchTopic,
  type Advice, type Chapter, type Graded, type Lang, type MasteryRow, type Quiz, type QuizHistoryRow, type QuizReview,
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

/** A quiz is paid per batch of 5 questions (quiz_batch each). */
export function quizCost(size: number): number {
  return priceOf('quiz_batch') * Math.ceil(size / BATCH);
}
/** Unknown balance counts as affordable (the server decides). */
export function quizAffordable(size: number, balancePaise = wallet.get().balancePaise): boolean {
  return balancePaise === null || balancePaise >= quizCost(size);
}
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
  /** The topic this quiz is on (null = whole chapter), for the paper's heading. */
  topicUsed: null as string | null,
  /** Topic mode: looking the topic up in the textbook. */
  checking: false,
  error: null as string | null,
});

/**
 * Open the setup card. "Practise" opens a whole-chapter quiz for one chapter;
 * "Quiz me on a topic" opens topic mode: the student only types a topic and
 * `findTopicChapter` finds its chapter.
 */
export function openQuizSetup(chapterId: string | null, mode: 'chapter' | 'topic' = 'chapter') {
  // Not enough even for the smallest quiz (5 questions = one batch): ask "Top up now?" instead
  // of opening the setup card. The full cost is still checked in startQuiz.
  if (isLocked(wallet.get(), 'quiz_batch')) { hasCredits('quiz_batch', 'take a quiz'); return; }
  generation++;
  // Start on a size the balance covers (the biggest one at or below the last choice).
  const fits = QUIZ_SIZES.filter((n) => quizAffordable(n));
  quiz.set((p) => ({
    phase: 'setup', chapterId, setup: { ...p.setup, mode, size: quizAffordable(p.setup.size) ? p.setup.size : (fits[fits.length - 1] ?? p.setup.size) }, quiz: null, answers: {}, graded: null, error: null,
    partial: null, deadline: null, limitSeconds: null, review: null, topicUsed: null, checking: false,
  }));
}

const norm = (s: string) => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
/** Same rule as the backend's assessContext: the best of the top 3 hits must hold half the query's weight. */
const NONE_COVERAGE = 0.5;

export type TopicMatch =
  | { ok: true; chapter: Chapter; wholeChapter: boolean }
  | { ok: false; error: string };

/**
 * Find the chapter for a typed topic, without any AI call:
 * a chapter's own name -> that whole chapter; otherwise the textbook keyword search, and the
 * chapter whose passages match best. quiz-generate checks the topic again inside that chapter.
 */
export async function findTopicChapter(topic: string, chapters: Chapter[]): Promise<TopicMatch> {
  const byTitle = chapters.find((c) => norm(c.title_en) === norm(topic));
  if (byTitle) {
    return byTitle.assessment_scope === 'summative'
      ? { ok: true, chapter: byTitle, wholeChapter: true }
      : { ok: false, error: `“${byTitle.title_en}” has no exam-style quizzes this year (it is for classwork only).` };
  }
  if (/[ఀ-౿]/.test(topic)) return { ok: false, error: 'Type the topic in English words, for example: reflex action.' };
  const hits = await searchTopic(topic);
  const weights = hits[0]?.query_weights ?? {};
  const total = Object.values(weights).reduce((s, w) => s + w, 0);
  const coverage = Math.max(0, ...hits.slice(0, 3).map((h) => {
    const m = new Set(h.matched_lexemes ?? []);
    return total ? Object.entries(weights).filter(([k]) => m.has(k)).reduce((s, [, w]) => s + w, 0) / total : 0;
  }));
  // A many-word topic must appear as a phrase-ish (its words close together), so "black holes"
  // does not match a passage with "black" in one place and "holes" in another.
  const close = hits.filter((h) => wordsClose(topic, h.content));
  if (!close.length || coverage < NONE_COVERAGE) return { ok: false, error: friendlyNotFound(topic) };
  // The chapter with the most matching weight among those passages.
  const score = new Map<string, number>();
  for (const h of close) score.set(h.chapter_id, (score.get(h.chapter_id) ?? 0) + h.rank);
  const bestId = [...score.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const chapter = chapters.find((c) => c.id === bestId);
  if (!chapter) return { ok: false, error: friendlyNotFound(topic) };
  if (chapter.assessment_scope !== 'summative') {
    return { ok: false, error: `“${topic}” is in “${chapter.title_en}”, which has no exam-style quizzes this year (it is for classwork only).` };
  }
  return { ok: true, chapter, wholeChapter: false };
}

const STOP_WORDS = new Set(['and', 'the', 'of', 'in', 'on', 'to', 'an', 'for', 'its', 'is', 'how', 'do', 'what', 'with']);
/** Loose stem: "holes" ~ "hole", "experiments" ~ "experiment". */
const stemOf = (w: string) => (w.length > 5 ? w.slice(0, -2) : w.replace(/s$/, ''));
const NEAR_WINDOW = 4;

/** True when all the topic's words occur within a few words of each other in the passage. */
export function wordsClose(topic: string, content: string): boolean {
  const stems = [...new Set(topic.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 2 && !STOP_WORDS.has(w)))].map(stemOf);
  if (stems.length <= 1) return true;
  const toks = content.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  for (let i = 0; i < toks.length; i++) {
    if (!toks[i].startsWith(stems[0])) continue;
    const win = toks.slice(Math.max(0, i - NEAR_WINDOW), i + NEAR_WINDOW + 1);
    if (stems.every((s) => win.some((t) => t.startsWith(s)))) return true;
  }
  return false;
}

const friendlyNotFound = (topic: string) => `“${topic}” is not in your Class 10 science textbook. Try other words, or use Practise for a whole-chapter quiz.`;

/** Expected time limit for questions of these types (the server decides the real one). */
export function limitFor(questions: { type: 'mcq' | 'numeric' }[]): number {
  return questions.reduce((s, q) => s + (q.type === 'numeric' ? SECONDS_PER_NUMERIC : SECONDS_PER_MCQ), 0);
}

let generation = 0;

export async function startQuiz(language: Lang, chapters: Chapter[]) {
  const s = quiz.get();
  if (s.checking) return;
  let chapterId = s.chapterId;
  let topic = '';
  if (s.setup.mode === 'topic') {
    const typed = s.setup.topic.trim().slice(0, 80);
    if (typed.length < 2) {
      quiz.set({ error: 'Type a topic, for example: reflex action.' });
      return;
    }
    const run = ++generation;
    quiz.set({ checking: true, error: null });
    let found: TopicMatch;
    try {
      found = await findTopicChapter(typed, chapters);
    } catch (e) {
      found = { ok: false, error: e instanceof ApiError ? e.message : 'Could not look up the topic. Try again.' };
    }
    if (generation !== run) return;
    if (!found.ok) {
      quiz.set({ checking: false, error: found.error });
      return;
    }
    chapterId = found.chapter.id;
    topic = found.wholeChapter ? '' : typed;
    quiz.set({ chapterId, checking: false });
  }
  if (!chapterId) return;
  const planned = s.setup.size;
  // Each batch of 5 is paid separately: check the whole quiz is affordable before making any.
  const cost = quizCost(planned);
  if (!canAfford(cost)) {
    const have = wallet.get().balancePaise ?? 0;
    askTopUp(`take a ${planned}-question quiz`, cost, have);
    quiz.set({ error: `A ${planned}-question quiz costs ${rupees(cost)} and you have ${rupees(have)} in credits. Top up, or pick fewer questions.` });
    return;
  }
  const run = ++generation;
  quiz.set({ phase: 'generating', quiz: null, answers: {}, graded: null, error: null, partial: null, deadline: null, limitSeconds: null, topicUsed: topic || null, progress: { ready: 0, planned } });

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
