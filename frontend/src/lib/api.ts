'use client';

// Typed calls to the nine deployed Edge Functions and the database. The backend decides
// identity from the session token, consent, limits and grading; the app only displays results.
import { insforge, publicClient } from './insforge';

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
  results: GradeResult[];
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
  already_submitted: 'This quiz was already submitted.',
  no_speech: 'No speech was heard. Hold the button and speak a little closer.',
  audio_too_large: 'That recording is too long. Keep it under 30 seconds.',
  document_not_ready: 'This document has not been read yet.',
  in_progress: 'This document is still being read.',
  REQUEST_TIMEOUT: 'This took too long. Try again.',
  NETWORK_ERROR: 'You seem to be offline. Check your connection.',
};

export function friendly(code: string, fallback = 'Something went wrong. Try again.'): string {
  return MESSAGES[code] ?? fallback;
}

function toApiError(error: unknown): ApiError {
  const e = error as { error?: string; code?: string; message?: string; statusCode?: number };
  const code = e?.error ?? e?.code ?? 'unknown';
  return new ApiError(code, friendly(code, e?.message && e.message.length < 140 ? e.message : undefined), e?.statusCode ?? 0);
}

async function call<T>(slug: string, body: unknown): Promise<T> {
  const { data, error } = await insforge().functions.invoke<T>(slug, { body });
  if (error) throw toApiError(error);
  return data as T;
}

export const api = {
  tutorChat: (body: { message: string; conversationId?: string; mode?: 'tutor' | 'socratic'; subject?: Subject; newTopic?: boolean; title?: string; documentId?: string }) =>
    call<TutorReply>('tutor-chat', body),
  quizGenerate: (body: { chapterId: string; count?: number; language?: Lang; difficulty?: 1 | 2 | 3 }) =>
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
