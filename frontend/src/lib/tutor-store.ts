'use client';

import { createStore } from './store';
import { api, ApiError, type Citation, type Diagram, type Lang, type Subject } from './api';
import { insforge } from './insforge';
import { docName, docs } from './docs-store';
import { hasCredits } from './wallet-store';
import { savedLessonIds } from './lessons';

/** Solving needs working, which a photo does not contain: these go to the tutor (and its maths agent) with the photo's text. */
const SOLVE_INTENT = /\b(solve|solution|solutions|work it out|calculate|find the answer|answer (this|the|these) questions?|step by step)\b/i;

/** Saved conversations solved from an image are titled "Image: <first line of the question>". */
export const IMAGE_TITLE_PREFIX = 'Image: ';
export const isImageTitle = (title: string | null | undefined): boolean => !!title?.startsWith(IMAGE_TITLE_PREFIX);
export const displayTitle = (title: string | null | undefined): string | null =>
  title && isImageTitle(title) ? title.slice(IMAGE_TITLE_PREFIX.length) : title ?? null;

const IMAGE_MARK = '\n\nThe question from my photo:\n';
/** A saved image-solve question is "<question><mark><image text>": return the question and whether the mark was there. */
export function splitImageQuestion(text: string): [string, boolean] {
  const i = text.indexOf(IMAGE_MARK);
  return i < 0 ? [text, false] : [text.slice(0, i), true];
}

function imageTitle(docId: string): string {
  // The same name the image has in the list (first real sentence of what was read).
  const doc = docs.get().list.find((x) => x.id === docId);
  return IMAGE_TITLE_PREFIX + ((doc && docName(doc, 80 - IMAGE_TITLE_PREFIX.length)) ?? 'Question');
}

function withPhotoText(question: string, docId: string): string | null {
  const text = docs.get().list.find((x) => x.id === docId)?.extracted_text?.trim();
  if (!text) return null;
  const head = question + IMAGE_MARK;
  return head + text.slice(0, 1500 - head.length);
}

export interface ChatMessage {
  id: string;
  role: 'student' | 'tutor';
  text: string;
  citations?: Citation[];
  label?: string | null;
  agent?: string;
  source?: 'tutor' | 'notes';
  error?: boolean;
  /** A ray diagram to draw, or the textbook figure to look at. */
  diagram?: Diagram;
  /** The photo did not contain the answer: offer to send this question, with the photo's text, to the tutor. */
  askTutor?: string;
  /** A "Bindu explains" lesson for this answer is saved (watch again for free). */
  lessonSaved?: boolean;
}

/** Mark answers whose Bindu lesson is saved (after a conversation loads, or after a lesson is bought). */
export function markLessonsSaved(ids: Set<string>) {
  if (!ids.size) return;
  chat.set((p) => {
    const hit = p.messages.some((m) => ids.has(m.id));
    const conv = hit && p.conversationId && !p.lessonConversations.includes(p.conversationId) ? [p.conversationId] : [];
    return {
      messages: p.messages.map((m) => (ids.has(m.id) ? { ...m, lessonSaved: true } : m)),
      lessonConversations: conv.length ? [...p.lessonConversations, ...conv] : p.lessonConversations,
    };
  });
}
const markSavedLessonsIn = (rows: { id: string; role: string }[]) =>
  void savedLessonIds(rows.filter((r) => r.role === 'tutor').map((r) => r.id)).then(markLessonsSaved);

export interface Conversation { id: string; title: string | null; mode: 'tutor' | 'socratic'; updated_at: string; document_id: string | null }

export const chat = createStore({
  conversationId: null as string | null,
  mode: 'tutor' as 'tutor' | 'socratic',
  subject: null as Subject | null,
  messages: [] as ChatMessage[],
  sending: false,
  socraticOpen: false,
  conversations: [] as Conversation[],
  /** Conversations with at least one saved "Bindu explains" lesson (whiteboard icon in the list). */
  lessonConversations: [] as string[],
  /** When set, questions go to this uploaded document instead of the tutor. */
  notesDocId: null as string | null,
  draft: '',
  /** A suggested question shown faintly in the empty box (a placeholder), never as typed text. */
  hint: '',
  /** Opening a saved conversation: show progress, and an error with a retry instead of an empty chat. */
  loadingConv: false,
  convError: null as string | null,
  openingId: null as string | null,
  /** Read-only history view of a saved conversation (questions and answers), before continuing it. */
  reading: null as Conversation | null,
});

let seq = 0;
const localId = () => `local-${Date.now()}-${seq++}`;

// Owner 2026-11-24: the "Not from your Class 10 textbook – not needed for the exam" title is gone. The backend no
// longer sends it, and answers saved before that (meta.label) hide it too: no title instead.
const OLD_OUT_OF_BOOK = /^(not from your class 10 textbook|idi mee class 10 textbook|ఇది మీ 10వ తరగతి)/i;
const shownLabel = (label: string | null | undefined): string | null =>
  label && !OLD_OUT_OF_BOOK.test(label.trim()) ? label : null;

export async function loadConversations() {
  const { data } = await insforge().database.from('conversations')
    .select('id, title, mode, updated_at, document_id').order('updated_at', { ascending: false }).limit(20);
  chat.set({ conversations: (data as Conversation[] | null) ?? [] });
  // Which of them have a saved Bindu lesson (lesson_audio -> messages.conversation_id; RLS: own rows only).
  const lessons = await insforge().database.from('lesson_audio').select('messages(conversation_id)').limit(500);
  if (lessons.error) return;
  const rows = (lessons.data as { messages: { conversation_id: string } | { conversation_id: string }[] | null }[] | null) ?? [];
  const ids = rows.flatMap((r) => (Array.isArray(r.messages) ? r.messages : r.messages ? [r.messages] : []).map((x) => x.conversation_id));
  chat.set({ lessonConversations: [...new Set(ids)] });
}

export async function openConversation(c: Conversation) {
  chat.set({ conversationId: c.id, mode: c.mode, messages: [], notesDocId: null, loadingConv: true, convError: null, openingId: c.id, socraticOpen: false, reading: c });
  const { data, error } = await insforge().database.from('messages')
    .select('id, role, content, citations, meta, agent').eq('conversation_id', c.id).order('id', { ascending: true }).limit(100);
  // The student may have opened another conversation while this one was loading.
  if (chat.get().openingId !== c.id) return;
  if (error) {
    console.error('[tutor] could not load conversation', error);
    chat.set({ loadingConv: false, convError: 'Could not open this conversation. Check your connection and try again.' });
    return;
  }
  const rows = (data as MessageRow[] | null) ?? [];
  chat.set({
    loadingConv: false,
    convError: rows.length === 0 ? 'This conversation has no saved messages.' : null,
    messages: rows.map(toMessage),
  });
  markSavedLessonsIn(rows.map(toMessage));
}

type MessageRow = { id: number | string; role: 'student' | 'tutor'; content: string; citations: Citation[] | null; meta: { label?: string | null; diagram?: Diagram } | null; agent: string | null };
const toMessage = (r: MessageRow): ChatMessage => ({
  id: String(r.id), role: r.role, text: r.content, citations: r.citations ?? [], label: shownLabel(r.meta?.label), diagram: r.meta?.diagram,
  agent: r.agent ?? undefined, source: r.agent === 'docqa' ? 'notes' : 'tutor',
});

/**
 * Open an uploaded image and its saved chat (if it has one): earlier answers show under the image,
 * and new questions continue that same conversation.
 */
export async function openImage(docId: string) {
  chat.set({ notesDocId: docId, conversationId: null, messages: [], reading: null, socraticOpen: false, draft: '', convError: null, loadingConv: true, openingId: docId });
  const db = insforge().database;
  const conv = await db.from('conversations').select('id').eq('document_id', docId).limit(1);
  const id = (conv.data as { id: string }[] | null)?.[0]?.id;
  if (chat.get().openingId !== docId) return;
  if (conv.error) { chat.set({ loadingConv: false, convError: 'Could not load the earlier answers for this image. You can still ask new questions.' }); return; }
  if (!id) { chat.set({ loadingConv: false }); return; }
  const { data, error } = await db.from('messages')
    .select('id, role, content, citations, meta, agent').eq('conversation_id', id).order('id', { ascending: true }).limit(100);
  if (chat.get().openingId !== docId) return;
  chat.set({
    conversationId: id,
    loadingConv: false,
    convError: error ? 'Could not load the earlier answers for this image. You can still ask new questions.' : null,
    messages: ((data as MessageRow[] | null) ?? []).map(toMessage),
  });
  markSavedLessonsIn(((data as MessageRow[] | null) ?? []).map(toMessage));
}
export function newConversation() {
  chat.set({ conversationId: null, messages: [], socraticOpen: false, notesDocId: null, loadingConv: false, convError: null, openingId: null, reading: null });
}

export async function send(text: string, language: Lang, opts: { newTopic?: boolean; viaTutor?: boolean } = {}) {
  const s = chat.get();
  const message = text.trim();
  if (!message || s.sending) return;
  // Not enough credits: a friendly Yes / Not now prompt, no AI call, the draft stays.
  const askingPhoto = !!s.notesDocId && !(opts.viaTutor || SOLVE_INTENT.test(message));
  if (!hasCredits(askingPhoto ? 'photo_question' : 'tutor_turn', askingPhoto ? 'ask about your photo' : 'ask the tutor a question')) return;
  const mine: ChatMessage = { id: localId(), role: 'student', text: message };
  chat.set({ messages: [...s.messages, mine], sending: true, draft: '', hint: '', reading: null });

  try {
    const tutorMessage = s.notesDocId && (opts.viaTutor || SOLVE_INTENT.test(message)) ? withPhotoText(message, s.notesDocId) : null;
    if (s.notesDocId && !tutorMessage) {
      const r = await api.documentAsk({ documentId: s.notesDocId, question: message, language, title: imageTitle(s.notesDocId) });
      const label = r.found ? r.label : null;
      const note = r.needsReview && r.found ? ' (The image was hard to read in places, so check this against it.)' : '';
      chat.set((p) => ({ messages: [...p.messages, { id: localId(), role: 'tutor', text: r.answer + note, label, source: 'notes', askTutor: r.found ? undefined : message }], conversationId: r.conversationId ?? p.conversationId }));
      void loadConversations();
    } else {
      const r = await api.tutorChat({
        message: tutorMessage ?? message,
        // Solving from an image always explains (hints need an open socratic topic).
        mode: tutorMessage ? 'tutor' : s.mode,
        conversationId: s.conversationId ?? undefined,
        subject: s.subject ?? undefined,
        newTopic: opts.newTopic,
        title: tutorMessage && !s.conversationId && s.notesDocId ? imageTitle(s.notesDocId) : undefined,
        // Saved into the image's own conversation (found or created by the backend).
        documentId: tutorMessage && s.notesDocId ? s.notesDocId : undefined,
      });
      chat.set((p) => ({
        conversationId: r.conversationId,
        socraticOpen: r.socraticOpen,
        messages: [...p.messages, { id: r.messageId ? String(r.messageId) : localId(), role: 'tutor', text: r.reply, citations: r.citations, label: shownLabel(r.label) ?? (tutorMessage ? 'Solved by the tutor, using the question in your image' : null), agent: r.agent, source: 'tutor', diagram: r.meta?.diagram as Diagram | undefined }],
      }));
      if (!s.conversationId) void loadConversations();
    }
  } catch (e) {
    const msg = e instanceof ApiError ? e.message : 'Something went wrong. Try again.';
    chat.set((p) => ({ messages: [...p.messages, { id: localId(), role: 'tutor', text: msg, error: true }], draft: message }));
  } finally {
    chat.set({ sending: false });
  }
}
