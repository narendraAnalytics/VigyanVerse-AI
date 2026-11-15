'use client';

import { createStore } from './store';
import { api, ApiError, type Citation, type Lang, type Subject } from './api';
import { insforge } from './insforge';

export interface ChatMessage {
  id: string;
  role: 'student' | 'tutor';
  text: string;
  citations?: Citation[];
  label?: string | null;
  agent?: string;
  source?: 'tutor' | 'notes';
  error?: boolean;
}

export interface Conversation { id: string; title: string | null; mode: 'tutor' | 'socratic'; updated_at: string }

export const chat = createStore({
  conversationId: null as string | null,
  mode: 'tutor' as 'tutor' | 'socratic',
  subject: null as Subject | null,
  messages: [] as ChatMessage[],
  sending: false,
  socraticOpen: false,
  conversations: [] as Conversation[],
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

export async function loadConversations() {
  const { data } = await insforge().database.from('conversations')
    .select('id, title, mode, updated_at').order('updated_at', { ascending: false }).limit(20);
  chat.set({ conversations: (data as Conversation[] | null) ?? [] });
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
  const rows = (data as { id: number | string; role: 'student' | 'tutor'; content: string; citations: Citation[] | null; meta: { label?: string | null } | null; agent: string | null }[] | null) ?? [];
  chat.set({
    loadingConv: false,
    convError: rows.length === 0 ? 'This conversation has no saved messages.' : null,
    messages: rows.map((r) => ({ id: String(r.id), role: r.role, text: r.content, citations: r.citations ?? [], label: r.meta?.label ?? null, agent: r.agent ?? undefined, source: 'tutor' as const })),
  });
}
export function newConversation() {
  chat.set({ conversationId: null, messages: [], socraticOpen: false, notesDocId: null, loadingConv: false, convError: null, openingId: null, reading: null });
}

export async function send(text: string, language: Lang, opts: { newTopic?: boolean } = {}) {
  const s = chat.get();
  const message = text.trim();
  if (!message || s.sending) return;
  const mine: ChatMessage = { id: localId(), role: 'student', text: message };
  chat.set({ messages: [...s.messages, mine], sending: true, draft: '', hint: '', reading: null });

  try {
    if (s.notesDocId) {
      const r = await api.documentAsk({ documentId: s.notesDocId, question: message, language });
      const label = r.found ? r.label : null;
      const note = r.needsReview && r.found ? ' (The photo was hard to read in places, so check this against your notes.)' : '';
      chat.set((p) => ({ messages: [...p.messages, { id: localId(), role: 'tutor', text: r.answer + note, label, source: 'notes' }] }));
    } else {
      const r = await api.tutorChat({
        message, mode: s.mode, conversationId: s.conversationId ?? undefined, subject: s.subject ?? undefined, newTopic: opts.newTopic,
      });
      chat.set((p) => ({
        conversationId: r.conversationId,
        socraticOpen: r.socraticOpen,
        messages: [...p.messages, { id: localId(), role: 'tutor', text: r.reply, citations: r.citations, label: r.label, agent: r.agent, source: 'tutor' }],
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
