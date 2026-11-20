'use client';

import { useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { clsx } from 'clsx';
import { BookMarked, Check, FileImage, ImageIcon, Lightbulb, Loader2, Lock, Mic, Plus, Presentation, SendHorizontal, Square, Trash2, Volume2, X } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { useConsent } from '@/lib/consent';
import { chat, markLessonsSaved, displayTitle, IMAGE_TITLE_PREFIX, isImageTitle, loadConversations, newConversation, openConversation, openImage, send, splitImageQuestion, type ChatMessage } from '@/lib/tutor-store';
import { docName, docs, KIND_LABEL, loadDocs, photoUrl, removeDoc, uploadAndRead, type DocKind, type UploadedDoc } from '@/lib/docs-store';
import { tutorIntent } from '@/lib/intents';
import { ApiError, type Subject } from '@/lib/api';
import { fetchLessonAudio, speakText, startRecording, stopSpeaking, type Recording } from '@/lib/voice';
import { WhiteboardLesson } from '@/components/tutor/WhiteboardLesson';
import { lessonGreeting, lessonTitle, markWelcomed, topicName } from '@/lib/board-script';
import { loadSavedLesson, savedMessageId } from '@/lib/lessons';
import { usePageLayout, usePreview } from '@/components/book/page-context';
import { Bindu, Speech } from '@/components/mascot/Bindu';
import { StudentGate } from './Gate';
import { askTopUp, hasCredits, isLocked, priceOf, rupees, wallet } from '@/lib/wallet-store';
import { DiagramBlock } from '@/components/diagrams/Diagram';

const SUBJECT_CHOICES: { id: Subject | null; label: string }[] = [
  { id: null, label: 'Any subject' }, { id: 'physics', label: 'Physics' }, { id: 'chemistry', label: 'Chemistry' }, { id: 'biology', label: 'Biology' },
];

// ---------------------------------------------------------------------------
// Left page: how to ask, past conversations, your uploaded notes
// ---------------------------------------------------------------------------
export function TutorLeft() {
  return (
    <div>
      <h1 data-page-heading tabIndex={-1} className="font-display text-4xl leading-tight outline-none">The tutor’s desk</h1>
      <p className="mt-2 max-w-[46ch] text-ink-soft">Type your question, or press the microphone and speak. Answers come from your textbook and show the pages they used.</p>
      <StudentGate what="the tutor" quiet={usePageLayout() === 'single'}>
        <ModePicker />
        <History />
        <Notes />
      </StudentGate>
    </div>
  );
}

function ModePicker() {
  const s = useStore(chat);
  return (
    <section aria-labelledby="mode-h" className="mt-6">
      <h2 id="mode-h" className="font-display text-xl">How should the tutor help?</h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {([
          { id: 'tutor', title: 'Explain it', body: 'A short, clear answer with textbook pages.', Icon: BookMarked },
          { id: 'socratic', title: 'Hint me', body: 'Questions and hints so you work it out yourself.', Icon: Lightbulb },
        ] as const).map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={s.mode === m.id}
            onClick={() => chat.set({ mode: m.id })}
            className={clsx('rounded-md border-[1.5px] p-3 text-left transition', s.mode === m.id ? 'border-emerald bg-emerald/10' : 'border-ink/20 hover:border-gold-deep')}
          >
            <m.Icon aria-hidden className={clsx('h-5 w-5', s.mode === m.id ? 'text-emerald' : 'text-ink-faint')} />
            <span className="mt-1 block font-display text-lg">{m.title}</span>
            <span className="block text-sm text-ink-soft">{m.body}</span>
          </button>
        ))}
      </div>
      <label className="mt-4 flex items-center gap-3 text-sm text-ink-soft">
        Subject
        <select value={s.subject ?? ''} onChange={(e) => chat.set({ subject: (e.target.value || null) as Subject | null })} className="field !w-auto !py-1">
          {SUBJECT_CHOICES.map((c) => <option key={c.label} value={c.id ?? ''}>{c.label}</option>)}
        </select>
      </label>
    </section>
  );
}

function History() {
  const s = useStore(chat);
  const d = useStore(docs);
  const open = (c: (typeof s.conversations)[number]) =>
    c.document_id && d.list.some((x) => x.id === c.document_id) ? void openImage(c.document_id) : void openConversation(c);
  const preview = usePreview();
  useEffect(() => { if (!preview) void loadConversations(); }, [preview]);
  return (
    // Faded while an image is open, so it is clear the right page is not one of these chats.
    <section aria-labelledby="hist-h" className={clsx('mt-7 transition-opacity', s.notesDocId && 'opacity-50 hover:opacity-100')}>
      <div className="flex items-center justify-between">
        <h2 id="hist-h" className="font-display text-xl">Your conversations</h2>
        <button type="button" onClick={newConversation} className="ghost-button !px-3 !py-1 text-sm"><Plus aria-hidden className="h-4 w-4" /> New</button>
      </div>
      {s.conversations.length === 0 ? (
        <p className="mt-2 text-sm text-ink-faint">Nothing yet. Your first question starts one.</p>
      ) : (
        <ul className="mt-2 divide-y divide-ink/10">
          {s.conversations.slice(0, 6).map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => open(c)} className={clsx('flex w-full items-baseline gap-2 py-2 text-left hover:text-emerald', c.id === s.conversationId && 'text-emerald')}>
                {(c.document_id || isImageTitle(c.title)) && <ImageIcon aria-label="Solved from an image" className="h-4 w-4 shrink-0 self-center text-image" />}
                <span className="min-w-0 flex-1 truncate">{isImageTitle(c.title) ? c.title!.slice(IMAGE_TITLE_PREFIX.length) : c.title ?? 'Untitled'}</span>
                <span className="shrink-0 text-xs italic text-ink-faint">{c.mode === 'socratic' ? 'hints' : ''} {new Date(c.updated_at).toLocaleDateString()}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Questions left after a photo read before this note goes quiet. */
const PHOTO_BUDGET_NOTE_BELOW = 5;

/**
 * Low balance, before the upload: a photo is only useful if the student can still ask about it.
 * Covers the read but no question -> pencil note + Top up; covers a few questions -> green note.
 * Unknown balance or plenty of credits -> nothing.
 */
function PhotoBudget() {
  const balance = useStore(wallet).balancePaise;
  if (balance === null) return null;
  const read = priceOf('photo_read');
  const ask = priceOf('photo_question');
  if (balance < read || ask <= 0) return null;
  const questions = Math.floor((balance - read) / ask);
  if (questions >= PHOTO_BUDGET_NOTE_BELOW) return null;
  if (questions === 0) {
    return (
      <div role="status" className="font-hand mt-2 rounded-md border border-pencil/30 bg-pencil/5 px-3 py-2 text-[1.05rem] leading-snug text-pencil">
        <p className="flex items-start gap-1.5">
          <Lock aria-hidden className="mt-1 h-4 w-4 shrink-0" />
          <span>
            Heads up! Your {rupees(balance)} can read this photo ({rupees(read)}), but then nothing is left to ask about it
            ({rupees(ask)} a question).
          </span>
        </p>
        <button type="button" onClick={() => askTopUp('read a photo and ask about it', read + ask, balance)}
          className="mt-1 font-sans text-sm font-semibold text-pencil underline underline-offset-2 hover:text-ink">
          Top up first
        </button>
      </div>
    );
  }
  return (
    <p role="status" className="font-hand mt-2 flex items-start gap-1.5 text-[1.05rem] leading-snug text-emerald">
      <Check aria-hidden className="mt-1 h-4 w-4 shrink-0" />
      <span>
        Your {rupees(balance)} covers reading this photo ({rupees(read)}) and {questions} question{questions === 1 ? '' : 's'} about it
        ({rupees(ask)} each).
      </span>
    </p>
  );
}

function Notes() {
  const d = useStore(docs);
  const s = useStore(chat);
  const { user } = useAuth();
  const { consent } = useConsent();
  const preview = usePreview();
  const [kind, setKind] = useState<DocKind>('notes');
  useEffect(() => { if (!preview) void loadDocs(); }, [preview]);
  // No credits for a photo read: lock the drop area before any file is picked or uploaded.
  const locked = isLocked(useStore(wallet), 'photo_read');

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/png': [], 'image/jpeg': [], 'image/webp': [] },
    multiple: false,
    disabled: !!d.busy || !consent.document_upload || locked,
    onDrop: async (files) => {
      if (!files[0] || !user) return;
      const id = await uploadAndRead(files[0], kind, user.id);
      if (id) void openImage(id);
    },
  });

  return (
    <section aria-labelledby="notes-h" className="paper-graph mt-7 rounded-lg border-[1.5px] border-image/25 p-4">
      <h2 id="notes-h" className="flex items-center gap-2 font-display text-xl text-image"><ImageIcon aria-hidden className="h-5 w-5" /> Ask about an image</h2>
      <p className="mt-1 text-sm text-ink-soft">Upload a photo of your notes, a textbook page, a diagram or a question paper. The answers then come only from that photo.</p>
      {!consent.document_upload ? (
        <p className="font-hand mt-2 text-pencil">A parent needs to allow photo uploads first.</p>
      ) : (
        <>
          <label className="mt-3 flex items-center gap-3 text-sm text-ink-soft">
            This photo is
            <select value={kind} onChange={(e) => setKind(e.target.value as DocKind)} className="field !w-auto !py-1">
              {Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          {locked ? (
            <button
              type="button"
              onClick={() => hasCredits('photo_read', 'read a photo of your notes')}
              className="mt-3 flex w-full flex-col items-center justify-center rounded-md border-2 border-dashed border-pencil/40 bg-white/30 px-4 py-5 text-center text-sm transition hover:border-pencil"
            >
              <Lock aria-hidden className="h-6 w-6 text-pencil" />
              <span className="mt-1 font-semibold text-pencil">Locked: no credits</span>
              <span className="text-xs text-ink-faint">Top up to upload a photo · reading it costs {rupees(priceOf('photo_read'))}</span>
            </button>
          ) : (
          <div
            {...getRootProps()}
            className={clsx('mt-3 flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed px-4 py-5 text-center text-sm transition',
              isDragActive ? 'border-image bg-image/10' : 'border-image/35 bg-white/40 hover:border-image')}
          >
            <input {...getInputProps()} aria-label="Upload a photo" />
            {d.busy ? (
              <span className="flex items-center gap-2"><Loader2 aria-hidden className="h-4 w-4 animate-spin" /> {d.busy}</span>
            ) : (
              <>
                <FileImage aria-hidden className="h-6 w-6 text-ink-faint" />
                <span className="mt-1">Drop a photo here or <span className="underline">choose one</span></span>
                <span className="text-xs text-ink-faint">PNG, JPEG or WebP, up to 4 MB · reading it costs {rupees(priceOf('photo_read'))}</span>
              </>
            )}
          </div>
          )}
          {!locked && !d.busy && <PhotoBudget />}
        </>
      )}
      {d.error && <p role="alert" className="mt-2 text-sm text-pencil">{d.error}</p>}
      {d.list.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {d.list.slice(0, 5).map((doc) => (
            <li key={doc.id} className="flex items-center gap-2 text-sm">
              <button
                type="button"
                disabled={doc.status !== 'ready'}
                onClick={() => void openImage(doc.id)}
                className={clsx('min-w-0 flex-1 truncate text-left', doc.id === s.notesDocId ? 'font-semibold text-image' : 'hover:text-image', doc.status !== 'ready' && 'opacity-60')}
              >
                <span className="block truncate">{docName(doc) ?? KIND_LABEL[doc.kind]}</span>
                <span className="block text-xs font-normal text-ink-faint">{KIND_LABEL[doc.kind]} · {new Date(doc.created_at).toLocaleDateString()}</span>
                {doc.status !== 'ready' && <span className="italic text-ink-faint"> ({doc.status === 'failed' ? 'could not be read' : 'reading'})</span>}
                {doc.needs_review && doc.status === 'ready' && <span className="font-hand text-pencil"> hard to read in places</span>}
              </button>
              <button type="button" aria-label="Delete this image and its chat" title="Delete this image and its chat" onClick={() => { if (s.notesDocId === doc.id) newConversation(); void removeDoc(doc.id).then(loadConversations); }} className="rounded p-1 text-ink-faint hover:text-pencil">
                <Trash2 aria-hidden className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Right page: the conversation
// ---------------------------------------------------------------------------
export function TutorRight() {
  const layout = usePageLayout();
  return (
    <div className={clsx('flex flex-col', layout === 'spread' ? 'h-full min-h-0' : 'h-[min(78dvh,46rem)]')}>
      <StudentGate what="the tutor" needs="ai_tutoring">
        <ChatPanel />
      </StudentGate>
    </div>
  );
}

function ChatPanel() {
  const s = useStore(chat);
  const d = useStore(docs);
  const { language } = useAuth();
  const preview = usePreview();
  const listRef = useRef<HTMLDivElement>(null);
  const notesDoc = s.notesDocId ? d.list.find((x) => x.id === s.notesDocId) : null;
  const imageChat = useImageMode();

  // A chapter page may have sent a question here.
  useEffect(() => {
    if (preview) return;
    const intent = tutorIntent.get();
    if (intent.subject || intent.draft) {
      // The chapter's suggested question goes in as a placeholder, so the box starts empty.
      chat.set({ subject: intent.subject, hint: intent.draft ?? '', draft: '', notesDocId: null });
      tutorIntent.reset();
    }
  }, [preview]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: preview ? 'auto' : 'smooth' });
  }, [s.messages.length, s.sending, preview]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {notesDoc && <ImageLabel doc={notesDoc} />}
      {!notesDoc && imageChat && (
        <p className="mb-2 flex items-center gap-2 text-sm text-image"><ImageIcon aria-hidden className="h-4 w-4" /> A question you solved from an image</p>
      )}
      <div ref={listRef} role="log" aria-live="polite" aria-label="Conversation" className="page-scroll min-h-0 flex-1 space-y-5 pr-1">
        {s.loadingConv && (
          <div className="flex items-center gap-3 text-ink-faint" role="status">
            <Bindu size={40} mood="thinking" />
            <span className="font-hand text-lg">{s.notesDocId ? 'Opening your earlier answers…' : 'Opening your conversation…'}</span>
          </div>
        )}
        {!s.loadingConv && s.convError && s.messages.length === 0 && (
          <div role="alert" className="text-pencil">
            <p>{s.convError}</p>
            {s.openingId && s.conversations.find((x) => x.id === s.openingId) && s.convError.startsWith('Could not') && (
              <button type="button" className="ghost-button mt-3" onClick={() => void openConversation(s.conversations.find((x) => x.id === s.openingId)!)}>Try again</button>
            )}
          </div>
        )}
        {notesDoc && <PhotoThread doc={notesDoc} started={s.messages.length > 0} />}
        {!notesDoc && !s.loadingConv && !s.convError && s.messages.length === 0 && <EmptyChat />}
        {s.reading && s.messages.length > 0 && (
          <div className="border-b-[1.5px] border-ink/15 pb-3">
            <p className="text-xs italic text-ink-faint">Saved conversation, {new Date(s.reading.updated_at).toLocaleDateString()}</p>
            <h2 className="font-display text-xl leading-tight">{displayTitle(s.reading.title) ?? 'Conversation'}</h2>
          </div>
        )}
        {s.messages.map((m, i) => (
          <div key={m.id}>
            {s.reading && <p className="mb-1 text-xs font-semibold text-ink-faint">{m.role === 'student' ? 'Your question' : 'Tutor’s answer'}</p>}
            <Bubble m={m} language={language} image={imageChat} question={i > 0 && s.messages[i - 1].role === 'student' ? splitImageQuestion(s.messages[i - 1].text)[0] : undefined} />
          </div>
        ))}
        {s.sending && (
          <div className="flex items-center gap-3 text-ink-faint">
            <Bindu size={40} mood="thinking" />
            <span className="font-hand text-lg">{s.notesDocId ? 'Reading your image…' : s.mode === 'socratic' ? 'Thinking of a good hint…' : 'Searching our textbook database…'}</span>
          </div>
        )}
      </div>
      {s.mode === 'socratic' && s.socraticOpen && !s.notesDocId && (
        <div className="mt-2 flex flex-wrap gap-2">
          {['Give me another hint', 'Show me the answer'].map((q) => (
            <button key={q} type="button" disabled={s.sending} onClick={() => send(q, language)} className="ghost-button !px-3 !py-1 text-sm">{q}</button>
          ))}
          <button type="button" disabled={s.sending} onClick={() => chat.set({ socraticOpen: false })} className="ghost-button !px-3 !py-1 text-sm">Ask something new</button>
        </div>
      )}
      {s.reading ? (
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t-[1.5px] border-ink/15 pt-3">
          <button type="button" className="ink-button" onClick={() => chat.set({ reading: null })}>Continue this chat</button>
          <button type="button" className="ghost-button" onClick={newConversation}>Close</button>
        </div>
      ) : (
        <Composer />
      )}
    </div>
  );
}

function EmptyChat() {
  const { language } = useAuth();
  const examples = language === 'te'
      ? ['కిరణజన్య సంయోగక్రియ అంటే ఏమిటి?', 'What is the SI unit of electric current?']
      : ['Why does a pencil look bent in water?', 'A bulb draws 0.5 A at 220 V. What is its power?', 'What is the difference between an acid and a base?'];
  return (
    <div className="flex flex-col items-start gap-4 pt-2">
      <div className="flex items-end gap-3">
        <Bindu size={64} />
        <Speech className="mb-4 max-w-[32ch]">What would you like to understand today?</Speech>
      </div>
      <ul className="space-y-2">
        {examples.map((q) => (
          <li key={q}>
            <button type="button" onClick={() => chat.set({ draft: q })} className={clsx('font-hand text-left text-lg text-ink-soft underline decoration-gold decoration-2 underline-offset-4 hover:text-emerald', /[ఀ-౿]/.test(q) && 'te')}>
              {q}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Photo mode opens like a chat: your photo as the first message, then Bindu's reply with quick asks. */
function PhotoThread({ doc, started }: { doc: UploadedDoc; started: boolean }) {
  const { language } = useAuth();
  const s = useStore(chat);
  const src = usePhotoSrc(doc);
  const text = doc.extracted_text?.trim() ?? '';
  const quick = ['Solve this question step by step.', 'Give me a simple summary.', 'What is this question asking?'];
  return (
    <>
      <div className="flex justify-end">
        <figure className="max-w-[70%] -rotate-1 rounded-sm bg-white p-1.5 pb-1 shadow-[0_2px_8px_rgba(40,30,10,0.18)]">
          {src ? (
            // A local blob URL of the student's own photo: next/image cannot optimise it.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={`Your uploaded ${KIND_LABEL[doc.kind].toLowerCase()}`} className="max-h-48 w-auto rounded-[2px] object-contain" />
          ) : (
            <div className="flex h-24 w-40 items-center justify-center bg-image/10"><ImageIcon aria-hidden className="h-7 w-7 text-image/60" /></div>
          )}
          <figcaption className="font-hand max-w-[28ch] px-1 pt-1 text-right text-sm leading-snug text-ink-soft">{docName(doc, 48) ?? KIND_LABEL[doc.kind]}</figcaption>
        </figure>
      </div>
      <TutorTurn tone="image">
        <p className="font-hand text-lg leading-snug">I have read your image! Ask me anything about it, or tap one below.</p>
        {!started && (
          <div className="mt-2 flex flex-wrap gap-2">
            {quick.map((q) => (
              <button key={q} type="button" disabled={s.sending} onClick={() => void send(q, language)} className="ghost-button !border-image/40 !px-3 !py-1 text-sm !text-image hover:!bg-image/10">{q}</button>
            ))}
          </div>
        )}
        {text && (
          <details className="mt-2 text-sm">
            <summary className="cursor-pointer font-semibold text-ink-soft">What I read in your image</summary>
            <p className="mt-1 whitespace-pre-line text-ink-soft">{text.slice(0, 700)}{text.length > 700 ? '…' : ''}</p>
          </details>
        )}
        {doc.needs_review && <p className="font-hand mt-2 text-pencil">Parts of this image were hard to read. A clearer image gives better answers.</p>}
      </TutorTurn>
    </>
  );
}

/** One tutor turn in the chat: Bindu's small face beside a paper card. */
function TutorTurn({ children, tone = 'emerald' }: { children: React.ReactNode; tone?: 'emerald' | 'orange' | 'pencil' | 'image' }) {
  return (
    <div className="flex items-start gap-2">
      <Bindu size={34} className="mt-0.5 shrink-0" />
      <div className={clsx('min-w-0 flex-1 rounded-lg rounded-tl-sm border-[1.5px] px-3.5 py-2.5',
        tone === 'image' ? 'border-image/35 bg-white/80' : 'bg-white/55',
        tone === 'pencil' ? 'border-pencil/50' : tone === 'orange' ? 'border-orange/50' : tone === 'emerald' && 'border-emerald/35')}>
        {children}
      </div>
    </div>
  );
}

/**
 * Models put each working step on its own line with a single newline, which Markdown joins into
 * one paragraph ("1/v = 1/f - 1/u 1/v = ..."). Turn a lone newline into a hard break; blank lines,
 * lists and tables are unaffected.
 */
function keepLineBreaks(text: string): string {
  return text.replace(/([^\n])\n(?!\n)/g, '$1  \n');
}

/** "Ch 12 · page 205" for the whiteboard's last line (from the retrieved chunk, never from model text). */
function boardCitation(c: ChatMessage['citations']): string | null {
  const first = c?.[0];
  if (!first) return null;
  const pages = first.pageStart === first.pageEnd ? `page ${first.pageStart}` : `pages ${first.pageStart}-${first.pageEnd}`;
  return first.chapterNumber ? `NCERT Ch ${first.chapterNumber} · ${pages}` : `NCERT ${pages}`;
}

function Bubble({ m, language, image = false, question }: { m: ChatMessage; language: 'en' | 'te'; image?: boolean; question?: string }) {
  const [speaking, setSpeaking] = useState<'idle' | 'loading' | 'playing'>('idle');
  const [speakError, setSpeakError] = useState<string | null>(null);
  // "Bindu explains": the audio is paid once; closing and reopening the board (or replaying) is free.
  const [lesson, setLesson] = useState<{ src: string; spokenText: string; title: string; greeting: string } | null>(null);
  const [lessonOpen, setLessonOpen] = useState(false);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const telugu = /[ఀ-౿]/.test(m.text);
  const walletState = useStore(wallet);
  const listenLocked = isLocked(walletState, 'voice_read') && speaking === 'idle';
  // English tutor / maths answers only (not Socratic hints, not answers read from a photo).
  const canExplain = !m.error && !image && !telugu && m.source !== 'notes' && m.agent !== 'socratic' && m.text.trim().length > 20;
  // Paid once per answer: a saved lesson (or one bought on this page) plays again for free.
  const watchFree = Boolean(lesson || m.lessonSaved);
  const explainLocked = isLocked(walletState, 'bindu_explain') && !watchFree;

  const openSaved = async (): Promise<boolean> => {
    const saved = await loadSavedLesson(m.id);
    if (!saved) return false;
    setLesson(saved); setLessonOpen(true);
    return true;
  };

  const explain = async () => {
    if (lessonOpen || lessonLoading) return;
    stopSpeaking(); setSpeaking('idle');
    if (lesson) { setLessonOpen(true); return; }
    setLessonError(null);
    if (m.lessonSaved) {
      setLessonLoading(true);
      try {
        if (!(await openSaved())) setLessonError('Could not load your saved lesson. Check your connection and try again.');
      } finally {
        setLessonLoading(false);
      }
      return;
    }
    if (!hasCredits('bindu_explain', 'watch Bindu explain this on the whiteboard')) return;
    setLessonLoading(true);
    try {
      // Heading = the textbook topic the answer came from; Bindu's welcome is spoken first (same request, one charge).
      const c = m.citations?.[0];
      const title = lessonTitle(c ?? null, question);
      const greeting = lessonGreeting(title, Boolean(c && (topicName(c.section) || c.chapterTitle)));
      const messageId = savedMessageId(m.id);
      const audio = await fetchLessonAudio(`${greeting}
${m.text}`, 'en', messageId ? { messageId, title, greeting } : undefined);
      markWelcomed();
      setLesson({ src: audio.src, spokenText: audio.spokenText, title, greeting });
      setLessonOpen(true);
      if (audio.saved) markLessonsSaved(new Set([m.id]));
    } catch (e) {
      // Already paid and saved (e.g. on another device): play the saved one, no charge.
      if (e instanceof ApiError && e.code === 'lesson_saved' && (await openSaved())) { markLessonsSaved(new Set([m.id])); return; }
      setLessonError(e instanceof ApiError ? e.message : 'Bindu could not start the lesson. Try again.');
    } finally {
      setLessonLoading(false);
    }
  };

  const listen = async () => {
    if (speaking === 'playing') { stopSpeaking(); setSpeaking('idle'); return; }
    if (!hasCredits('voice_read', 'hear this answer read aloud')) return;
    setSpeaking('loading'); setSpeakError(null);
    try {
      const audio = await speakText(m.text, telugu ? 'te' : language);
      setSpeaking('playing');
      audio.onended = () => setSpeaking('idle');
    } catch (e) {
      setSpeaking('idle');
      setSpeakError(e instanceof ApiError ? e.message : 'Could not read this aloud.');
    }
  };

  if (m.role === 'student') {
    // An image solve saves the image's text after the question: show the question, and a note.
    const [question, fromImage] = splitImageQuestion(m.text);
    return (
      <div className="flex flex-col items-end">
        <p className={clsx('font-hand max-w-[85%] rounded-lg rounded-tr-sm px-3.5 py-2 text-right text-[1.15rem] leading-snug',
          image ? 'bg-image/12 text-image' : 'bg-[#24467a]/8 text-[#24467a]', telugu && 'te')}>{question}</p>
        {fromImage && <p className="mt-1 flex items-center gap-1 text-xs text-image"><ImageIcon aria-hidden className="h-3.5 w-3.5" /> with the question from your image</p>}
      </div>
    );
  }
  return (
    <TutorTurn tone={m.error ? 'pencil' : image ? 'image' : m.label ? 'orange' : 'emerald'}>
      {m.label && <p className={clsx('mb-1 inline-block rounded-sm px-2 py-0.5 text-xs font-semibold', image ? 'bg-image/12 text-image' : 'bg-orange/15 text-[#8a4512]')}>{m.label}</p>}
      <div className={clsx('prose-sm max-w-none text-[0.98rem] leading-relaxed [&_li]:ml-5 [&_ol]:list-decimal [&_p+p]:mt-2 [&_strong]:text-ink [&_ul]:list-disc', telugu && 'te', m.error && 'text-pencil')}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{keepLineBreaks(m.text)}</ReactMarkdown>
      </div>
      {m.diagram && !m.error && <DiagramBlock diagram={m.diagram} />}
      {m.citations && m.citations.length > 0 && (
        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          {/* In image mode the question came from the image; these pages are where the method is taught. */}
          {image && <span className="text-ink-soft">Method from your textbook:</span>}
          {m.citations.slice(0, 3).map((c) => (
            <span key={c.chunkId} className="rounded-full border border-gold-deep/50 px-2 py-0.5 text-ink-soft">
              {c.chapterNumber ? `Chapter ${c.chapterNumber}, ` : ''}{c.pageStart === c.pageEnd ? `page ${c.pageStart}` : `pages ${c.pageStart}–${c.pageEnd}`}
            </span>
          ))}
        </p>
      )}
      {m.askTutor && (
        <button type="button" onClick={() => void send(m.askTutor!, language, { viaTutor: true })} className="ghost-button mt-2 !border-image/40 !px-3 !py-1 text-sm !text-image hover:!bg-image/10">Ask the tutor to solve it from my image</button>
      )}
      {!m.error && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <button type="button" onClick={listen} className="flex items-center gap-1 text-xs text-ink-faint hover:text-emerald" aria-label={speaking === 'playing' ? 'Stop reading aloud' : listenLocked ? 'Read this answer aloud (locked: no credits)' : 'Read this answer aloud'}>
            {speaking === 'loading' ? <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" /> : speaking === 'playing' ? <Square aria-hidden className="h-3.5 w-3.5" /> : listenLocked ? <Lock aria-hidden className="h-3.5 w-3.5 text-pencil" /> : <Volume2 aria-hidden className="h-3.5 w-3.5" />}
            {speaking === 'playing' ? 'Stop' : <>Listen <span className="opacity-70">({rupees(priceOf('voice_read'))})</span></>}
          </button>
          {canExplain && (
            <button type="button" onClick={explain} disabled={lessonOpen}
              className="flex items-center gap-1 rounded-full border border-emerald/40 bg-emerald/5 px-2 py-0.5 text-xs font-semibold text-emerald hover:bg-emerald/10 disabled:opacity-50"
              aria-label={explainLocked ? 'Bindu explains on the whiteboard (locked: no credits)' : 'Bindu explains this answer on the whiteboard'}>
              {lessonLoading ? <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" /> : explainLocked ? <Lock aria-hidden className="h-3.5 w-3.5 text-pencil" /> : <Presentation aria-hidden className="h-3.5 w-3.5" />}
              {lessonLoading ? 'Getting the board ready…' : <>Bindu explains {watchFree ? <span className="font-normal opacity-70">(watch again, free)</span> : <span className="font-normal opacity-70">({rupees(priceOf('bindu_explain'))})</span>}</>}
            </button>
          )}
          {speakError && <span className="text-xs text-pencil">{speakError}</span>}
          {lessonError && <span className="text-xs text-pencil">{lessonError}</span>}
        </div>
      )}
      {lesson && lessonOpen && (
        <WhiteboardLesson src={lesson.src} answer={m.text} spokenText={lesson.spokenText} title={lesson.title} greeting={lesson.greeting} citation={boardCitation(m.citations)} onClose={() => setLessonOpen(false)} />
      )}
    </TutorTurn>
  );
}

function Composer() {
  const s = useStore(chat);
  const { language } = useAuth();
  const { consent } = useConsent();
  const [rec, setRec] = useState<Recording | null>(null);
  const [voiceState, setVoiceState] = useState<'idle' | 'recording' | 'transcribing'>('idle');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const recRef = useRef<Recording | null>(null);
  recRef.current = rec;
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (voiceState !== 'recording') return;
    setSeconds(0);
    const id = window.setInterval(() => setSeconds((x) => x + 1), 1000);
    return () => window.clearInterval(id);
  }, [voiceState]);
  useEffect(() => () => recRef.current?.cancel(), []);

  const stop = async () => {
    const r = recRef.current;
    if (!r) return;
    setRec(null);
    setVoiceState('transcribing');
    try {
      const out = await r.stop();
      if (out?.transcript) {
        chat.set((p) => ({ draft: p.draft ? `${p.draft} ${out.transcript}` : out.transcript }));
        inputRef.current?.focus();
      } else setVoiceError('No speech was heard. Try again a little closer to the microphone.');
    } catch (e) {
      setVoiceError(e instanceof ApiError ? e.message : 'Could not hear that. Try again.');
    } finally {
      setVoiceState('idle');
    }
  };

  const toggleMic = async () => {
    setVoiceError(null);
    if (voiceState === 'recording') return stop();
    if (!consent.voice_recording) { setVoiceError('A parent needs to allow voice questions first.'); return; }
    // A spoken question is transcribed (voice_input) and then answered (tutor_turn): check both.
    if (!hasCredits(['voice_input', 'tutor_turn'], 'ask by voice')) return;
    try {
      const r = await startRecording(language, () => void stop());
      setRec(r);
      setVoiceState('recording');
    } catch {
      setVoiceError('The microphone is not available. Check the browser permission.');
    }
  };

  // No credits for a question: lock the box before anything is typed (Yes / Not now on click).
  const w = useStore(wallet);
  const askTask = s.notesDocId ? 'photo_question' : 'tutor_turn';
  const locked = isLocked(w, askTask);
  const micLocked = isLocked(w, ['voice_input', 'tutor_turn']);
  const promptTopUp = () => hasCredits(askTask, s.notesDocId ? 'ask about your photo' : 'ask the tutor a question');

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (locked) { promptTopUp(); return; }
    if (s.draft.trim() && !s.sending) void send(s.draft, language, { newTopic: s.mode === 'socratic' && !s.socraticOpen && !!s.conversationId });
  };

  return (
    <form onSubmit={submit} className="mt-3 border-t-[1.5px] border-ink/15 pt-3">
      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={toggleMic}
          disabled={voiceState === 'transcribing' || s.sending}
          aria-label={voiceState === 'recording' ? 'Stop recording' : micLocked ? 'Ask by voice (locked: no credits)' : 'Ask by voice'}
          title={micLocked && voiceState === 'idle' ? 'Locked: top up to ask by voice' : undefined}
          className={clsx('relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[1.5px] transition',
            voiceState === 'recording' ? 'animate-pulse border-pencil bg-pencil text-paper'
              : micLocked ? 'border-pencil/40 text-ink-faint hover:border-pencil'
                : 'border-ink/30 text-ink-soft hover:border-emerald hover:text-emerald')}
        >
          {voiceState === 'transcribing' ? <Loader2 aria-hidden className="h-5 w-5 animate-spin" /> : voiceState === 'recording' ? <Square aria-hidden className="h-4 w-4" /> : <Mic aria-hidden className="h-5 w-5" />}
          {micLocked && voiceState === 'idle' && (
            <span aria-hidden className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-pencil text-paper"><Lock className="h-3 w-3" /></span>
          )}
        </button>
        <label htmlFor="ask" className="sr-only">Your question</label>
        <div className="relative flex-1">
          <textarea
            id="ask"
            ref={inputRef}
            rows={2}
            maxLength={1500}
            value={s.draft}
            readOnly={locked}
            aria-describedby={locked ? 'ask-locked' : undefined}
            onChange={(e) => { if (!locked) chat.set({ draft: e.target.value }); }}
            // Locked: a click or any key (except Tab) asks "Top up now?" instead of typing.
            onClick={locked ? promptTopUp : undefined}
            onKeyDown={(e) => {
              if (locked) { if (e.key !== 'Tab' && e.key !== 'Escape') { e.preventDefault(); promptTopUp(); } return; }
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
            }}
            placeholder={locked ? 'Locked: top up to ask a question' : s.notesDocId ? 'Ask about your image…' : s.hint || (language === 'te' ? 'మీ ప్రశ్న ఇక్కడ రాయండి…' : 'Type your question…')}
            className={clsx('field font-hand min-h-[2.75rem] w-full resize-none text-[1.15rem] leading-snug', locked && 'cursor-pointer !pl-9 opacity-80', /[ఀ-౿]/.test(s.draft) && 'te')}
          />
          {locked && <Lock aria-hidden className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-pencil" />}
        </div>
        <button
          type="submit"
          disabled={!locked && (!s.draft.trim() || s.sending)}
          className={clsx('ink-button h-11 !px-4', locked && 'opacity-60')}
          aria-label={locked ? 'Locked: top up to ask' : 'Send'}
        >
          {locked ? <Lock aria-hidden className="h-5 w-5" /> : <SendHorizontal aria-hidden className="h-5 w-5" />}
        </button>
      </div>
      <p className="mt-1.5 min-h-[1.25rem] text-xs" aria-live="polite">
        {voiceState === 'recording' ? <span className="text-pencil">Listening… {seconds}s of 30. Press the square to stop.</span>
          : voiceState === 'transcribing' ? <span className="text-ink-faint">Turning your voice into text…</span>
            : voiceError ? <span className="text-pencil">{voiceError}</span>
              : locked ? <span id="ask-locked" className="text-pencil"><b className="font-semibold">Locked: no credits.</b> Top up to ask ({rupees(priceOf(askTask))} per question). Tap the box or the ₹ pill.</span>
              : <span className="text-ink-faint"><b className="font-semibold text-ink-soft">{rupees(priceOf(s.notesDocId ? 'photo_question' : 'tutor_turn'))} per question</b> · Enter to send, Shift and Enter for a new line. Voice recordings are not stored.</span>}
      </p>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Image mode: blue graph paper, indigo ink, its own running head
// ---------------------------------------------------------------------------
/** True while an uploaded image is open, or a saved image solve is shown. */
function useImageMode(): boolean {
  const s = useStore(chat);
  if (s.notesDocId) return true;
  const c = s.reading ?? s.conversations.find((x) => x.id === s.conversationId);
  return !!c?.document_id || isImageTitle(c?.title);
}

/** The student's own image as a private in-browser link (none in previews). */
function usePhotoSrc(doc: UploadedDoc): string | null {
  const preview = usePreview();
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (preview) return;
    let live = true;
    void photoUrl(doc).then((u) => { if (live) setSrc(u); });
    return () => { live = false; };
  }, [doc, preview]);
  return src;
}

/** A sticky-note label at the top of the image chat: thumbnail, what it is, and the way back. */
function ImageLabel({ doc }: { doc: UploadedDoc }) {
  const src = usePhotoSrc(doc);
  return (
    <div className="mb-3 flex items-center gap-3 rounded-sm border-l-4 border-image bg-white/75 px-3 py-2 shadow-[0_1px_4px_rgba(30,40,80,0.15)]">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-10 w-10 shrink-0 rounded-[2px] object-cover" />
      ) : (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[2px] bg-image/10"><ImageIcon aria-hidden className="h-5 w-5 text-image" /></span>
      )}
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate font-display text-lg text-image">{docName(doc) ?? 'Image questions'}</p>
        <p className="truncate text-xs text-ink-soft">Image questions · {KIND_LABEL[doc.kind]}, {new Date(doc.created_at).toLocaleDateString()}</p>
      </div>
      <button type="button" onClick={newConversation} className="flex shrink-0 items-center gap-1 text-sm text-ink-soft hover:text-pencil">
        <X aria-hidden className="h-4 w-4" /> Back to the tutor
      </button>
    </div>
  );
}

/** Right-page running head: changes with the mode so the student always knows where answers come from. */
export function TutorRightHead() {
  const image = useImageMode();
  return image
    ? <><span className="text-image">Your image</span><span className="text-image">Answers from what you uploaded</span></>
    : <><span>AI Tutor</span><span>Answers from your textbook</span></>;
}

/** Full-page graph paper behind the right page in image mode. */
export function ImageBackdrop() {
  const image = useImageMode();
  return <div aria-hidden className={clsx('paper-graph paper-graph-page pointer-events-none absolute inset-0 transition-opacity duration-300', image ? 'opacity-100' : 'opacity-0')} />;
}
