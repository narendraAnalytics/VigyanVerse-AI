'use client';

// Typed calls to the nine deployed Edge Functions and the database. The backend decides
// identity from the session token, consent, limits and grading; the app only displays results.
import { insforge, publicClient } from './insforge';
import { askTopUp, noteBalance, rupees } from './wallet-store';

export type Lang = 'en' | 'te';
export type Subject = 'physics' | 'chemistry' | 'biology';

export interface Citation {
  chunkId: string;
  chapterNumber: number | null;
  chapterTitle: string;
  section: string | null;
  pageStart: number;
  pageEnd: number;
}

/** Added by the backend's code-only Diagram agent when the student asks to draw something. */
export type Diagram =
  | {
      kind: 'ray';
      element: 'mirror' | 'lens';
      type: 'concave' | 'convex';
      focalLength: number;
      objectDistance: number;
      /** Signed, NCERT sign convention (cm). v is ±Infinity (null after JSON) for an object at F. */
      f: number;
      u: number | null;
      v: number | null;
      m: number | null;
      nature: 'real' | 'virtual';
      orientation: 'inverted' | 'erect';
      size: 'point-sized' | 'highly magnified' | 'magnified' | 'same size' | 'diminished';
      position: 'infinity' | 'beyond_2f' | 'at_2f' | 'between_f_2f' | 'at_f' | 'inside_f' | 'finite';
      /** The question gave no numbers: a representative drawing. */
      assumed: boolean;
    }
  | { kind: 'ask'; element: 'mirror' | 'lens'; type: 'concave' | 'convex' }
  | { kind: 'figure'; figure: string; caption: string | null; chapterNumber: number | null; chapterTitle: string; pageStart: number; pageEnd: number };

export interface TutorReply {
  conversationId: string;
  reply: string;
  agent: string;
  language: string;
  citations: Citation[];
  label: string | null;
  related: unknown;
  meta: Record<string, unknown>;
  mode: 'tutor' | 'socratic';
  socraticOpen: boolean;
  saved: boolean;
}

export interface QuizQuestion {
  id: string;
  position: number;
  marks: number;
  type: 'mcq' | 'numeric';
  difficulty: number;
  stem: string;
  options: string[] | null;
  citations: unknown[];
}

export interface Quiz {
  assessmentId: string;
  chapter: { id: string; number: number | null; title: string; subject: Subject };
  language: Lang;
  requested: number;
  /** Which batch of 5 this call filled (quizzes of 10 / 15 are made in parallel batches). */
  batch?: number;
  questions: QuizQuestion[];
  dropped: number;
}

export interface GradeResult {
  questionId: string;
  position: number;
  answered: boolean;
  isCorrect: boolean;
  marks: number;
  errorType: string | null;
  feedback: string | null;
  correctAnswer: string;
  explanation: string;
}

export interface Graded {
  assessmentId: string;
  score: number;
  maxScore: number;
  /** Timed quizzes only: seconds from the timer start, and whether it was handed in late. */
  timeTakenSeconds: number | null;
  overtime: boolean | null;
  results: GradeResult[];
}

/** One past quiz, for the "Your quizzes" list. */
export interface QuizHistoryRow {
  id: string;
  chapter_id: string | null;
  topic: string | null;
  submitted_at: string;
  score: number;
  max_score: number;
  timed: boolean;
  overtime: boolean | null;
}

/** quiz_review(): a submitted quiz read back question by question. */
export interface QuizReview {
  assessment_id: string;
  chapter_id: string | null;
  topic: string | null;
  submitted_at: string;
  score: number;
  max_score: number;
  timed: boolean;
  time_limit_seconds: number | null;
  time_taken_seconds: number | null;
  overtime: boolean | null;
  questions: {
    position: number; marks: number; type: 'mcq' | 'numeric'; stem: string; options: string[] | null;
    selected_index: number | null; answer_text: string | null; answered: boolean; is_correct: boolean; marks_awarded: number;
    feedback: string | null; error_type: string | null; correct_answer: string | null; correct_index: number | null; explanation: string | null;
  }[];
}

export interface Advice {
  kind: 'revise_due' | 'practise_weakest' | 'start_new' | 'keep_going' | 'none';
  chapter: { id: string; title: string } | null;
  state: string | null;
  score: number | null;
  dueCount: number;
  dueAt: string | null;
  topErrors: { errorType: string; count: number }[];
  message: string;
  messageSource: 'model' | 'template';
}

export interface DocAnswer {
  documentId: string;
  answer: string;
  found: boolean;
  needsReview: boolean;
  label: string | null;
  /** The image's saved conversation (null if saving failed; the answer is still shown). */
  conversationId: string | null;
  saved: boolean;
}

/** An error with a plain-language message the student can act on. */
export class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
  }
}

const MESSAGES: Record<string, string> = {
  Unauthorized: 'Please sign in first.',
  consent_required: 'A parent needs to give permission before this feature can be used. Ask them to open the parent permission page.',
  slow_down: 'That was quick. Wait a few seconds and try again.',
  daily_limit: 'You have reached today’s limit for this feature. It resets tomorrow.',
  try_again: 'The AI service is busy right now. Try again in a moment.',
  tutor_failed: 'The tutor could not answer this time. Try again.',
  conversation_failed: 'Only student accounts can chat with the tutor.',
  assessment_failed: 'Only student accounts can take quizzes.',
  formative_only: 'This chapter is formative only, so there are no exam-style quizzes for it.',
  topic_not_found: 'That topic is not in your Class 10 science textbook. Try other words, or use Practise for a whole-chapter quiz.',
  assessment_closed: 'This quiz has already started or finished. Start a new one.',
  already_submitted: 'This quiz was already submitted.',
  no_speech: 'No speech was heard. Hold the button and speak a little closer.',
  audio_too_large: 'That recording is too long. Keep it under 30 seconds.',
  document_not_ready: 'This document has not been read yet.',
  in_progress: 'This document is still being read.',
  REQUEST_TIMEOUT: 'This took too long. Try again.',
  NETWORK_ERROR: 'You seem to be offline. Check your connection.',
  no_credits: 'You have no credits left. Top up to keep learning.',
  wallet_failed: 'Could not check your wallet. Try again in a moment.',
};

export function friendly(code: string, fallback = 'Something went wrong. Try again.'): string {
  return MESSAGES[code] ?? fallback;
}

function toApiError(error: unknown): ApiError {
  const e = error as { error?: string; code?: string; message?: string; statusCode?: number; balancePaise?: number; pricePaise?: number };
  const code = e?.error ?? e?.code ?? 'unknown';
  // Paid functions send the balance after a refund, and the numbers when the wallet is short.
  noteBalance(e?.balancePaise);
  if (code === 'no_credits' && typeof e.pricePaise === 'number' && typeof e.balancePaise === 'number') {
    askTopUp('do this', e.pricePaise, e.balancePaise);
    const msg = e.balancePaise > 0
      ? `This needs ${rupees(e.pricePaise)} and you have ${rupees(e.balancePaise)} in credits. Top up to keep learning.`
      : `This costs ${rupees(e.pricePaise)} and you have no credits left. Top up to keep learning.`;
    return new ApiError(code, msg, 402);
  }
  return new ApiError(code, friendly(code, e?.message && e.message.length < 140 ? e.message : undefined), e?.statusCode ?? 0);
}

async function call<T>(slug: string, body: unknown): Promise<T> {
  const { data, error } = await insforge().functions.invoke<T>(slug, { body });
  if (error) throw toApiError(error);
  noteBalance((data as { balancePaise?: unknown } | null)?.balancePaise);
  return data as T;
}

export const api = {
  tutorChat: (body: { message: string; conversationId?: string; mode?: 'tutor' | 'socratic'; subject?: Subject; newTopic?: boolean; title?: string; documentId?: string }) =>
    call<TutorReply>('tutor-chat', body),
  quizGenerate: (body: { chapterId: string; count?: number; language?: Lang; difficulty?: 1 | 2 | 3; assessmentId?: string; batch?: number }) =>
    call<Quiz>('quiz-generate', body),
  answerEvaluate: (body: { assessmentId: string; answers: { questionId: string; selectedIndex?: number; answerText?: string }[] }) =>
    call<Graded>('answer-evaluate', body),
  learningAdvice: (language: Lang) => call<Advice>('learning-advice', { language }),
  documentProcess: (documentId: string) =>
    call<{ documentId: string; status: 'ready'; text: string; confidence: number; needsReview: boolean; uncertain: string[] }>('document-process', { documentId }),
  documentAsk: (body: { documentId: string; question: string; language: Lang; wantsDetail?: boolean; title?: string }) =>
    call<DocAnswer>('document-ask', body),
  voiceTranscribe: (body: { audioBase64: string; mime: string; seconds: number; language: Lang | 'auto' }) =>
    call<{ transcript: string; languageCode: string | null }>('voice-transcribe', body),
  voiceSpeak: (body: { text: string; language: Lang }) =>
    call<{ audioBase64: string; mime: string; chars: number; spokenText: string }>('voice-speak', body),
};

// ---------------------------------------------------------------------------
// Database reads (RLS decides what each account can see)
// ---------------------------------------------------------------------------
export interface Chapter {
  id: string;
  subject_code: Subject;
  number: number | null;
  title_en: string;
  title_te: string | null;
  assessment_scope: 'summative' | 'formative_only';
  sort_order: number;
}

export async function fetchChapters(): Promise<Chapter[]> {
  const { data, error } = await publicClient().database.from('chapters')
    .select('id, subject_code, number, title_en, title_te, assessment_scope, sort_order')
    .eq('board_code', 'CBSE').order('sort_order', { ascending: true }).limit(60);
  if (error) throw toApiError(error);
  return (data as Chapter[] | null) ?? [];
}

export interface MasteryRow {
  chapter_id: string;
  state: 'not_started' | 'learning' | 'developing' | 'proficient' | 'mastered';
  score: number;
  attempts: number;
  correct: number;
  last_practiced_at: string | null;
}

export async function fetchMastery(): Promise<MasteryRow[]> {
  const { data, error } = await insforge().database.from('chapter_mastery')
    .select('chapter_id, state, score, attempts, correct, last_practiced_at').limit(60);
  if (error) throw toApiError(error);
  return ((data as MasteryRow[] | null) ?? []).map((r) => ({ ...r, score: Number(r.score) }));
}

export async function fetchRevisions(): Promise<{ chapter_id: string; due_at: string; interval_days: number }[]> {
  const { data, error } = await insforge().database.from('revision_schedule')
    .select('chapter_id, due_at, interval_days').order('due_at', { ascending: true }).limit(60);
  if (error) throw toApiError(error);
  return (data as { chapter_id: string; due_at: string; interval_days: number }[] | null) ?? [];
}

/** Create the quiz row first (RLS "create own"); quiz-generate then fills it batch by batch. */
export async function createQuiz(input: { chapterId: string; language: Lang; topic: string | null; planned: number; timed: boolean }): Promise<string> {
  const { data, error } = await insforge().database.from('assessments')
    .insert([{ kind: 'practice', chapter_id: input.chapterId, language: input.language, topic: input.topic, planned_questions: input.planned, timed: input.timed }])
    .select('id');
  if (error) throw toApiError(error);
  const id = (data as { id: string }[] | null)?.[0]?.id;
  if (!id) throw new ApiError('assessment_failed', friendly('assessment_failed'), 0);
  return id;
}

/** Remove a quiz that could not be made (no questions); a student may delete their own. */
export async function deleteQuiz(id: string): Promise<void> {
  await insforge().database.from('assessments').delete().eq('id', id);
}

export async function fetchQuizHistory(): Promise<QuizHistoryRow[]> {
  const { data, error } = await insforge().database.from('assessments')
    .select('id, chapter_id, topic, submitted_at, score, max_score, timed, overtime')
    .not('submitted_at', 'is', null).order('submitted_at', { ascending: false }).limit(20);
  if (error) throw toApiError(error);
  return ((data as QuizHistoryRow[] | null) ?? []).map((r) => ({ ...r, score: Number(r.score), max_score: Number(r.max_score) }));
}

export interface TopicHit {
  chapter_id: string;
  rank: number;
  content: string;
  matched_lexemes: string[] | null;
  query_weights: Record<string, number> | null;
}

/**
 * Keyword search of the whole textbook for a quiz topic (the tutor's own search,
 * `match_chunks_weighted`; no AI call). English words only, like the backend's sanitizer.
 */
export async function searchTopic(topic: string): Promise<TopicHit[]> {
  const words = [...new Set(topic.toLowerCase().split(/[^a-z0-9-]+/).map((w) => w.replace(/^-+|-+$/g, '')).filter((w) => w.length >= 2 && w.length <= 40))].slice(0, 10);
  if (!words.length) return [];
  const { data, error } = await insforge().database.rpc('match_chunks_weighted', {
    p_query: words.join(' '), p_board: 'CBSE', p_subject: null, p_chapter: null, p_language: 'en', p_match_count: 10,
  });
  if (error) throw toApiError(error);
  return (data as TopicHit[] | null) ?? [];
}

export async function rpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await insforge().database.rpc(name, args);
  if (error) throw toApiError(error);
  return data as T;
}

export const CONSENT_TYPES = ['platform_use', 'ai_tutoring', 'document_upload', 'voice_recording', 'pilot_research'] as const;
export type ConsentType = (typeof CONSENT_TYPES)[number];

/** Base64 of a Blob, without the data-URL prefix. */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).replace(/^data:[^,]*,/, ''));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
