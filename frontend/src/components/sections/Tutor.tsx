'use client';

import { useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { clsx } from 'clsx';
import { BookMarked, FileImage, Lightbulb, Loader2, Mic, Plus, SendHorizontal, Square, Trash2, Volume2, X } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { useConsent } from '@/lib/consent';
import { chat, loadConversations, newConversation, openConversation, send, type ChatMessage } from '@/lib/tutor-store';
import { docs, KIND_LABEL, loadDocs, removeDoc, uploadAndRead, type DocKind } from '@/lib/docs-store';
import { tutorIntent } from '@/lib/intents';
import { ApiError, type Subject } from '@/lib/api';
import { speakText, startRecording, stopSpeaking, type Recording } from '@/lib/voice';
import { usePageLayout, usePreview } from '@/components/book/page-context';
import { Bindu, Speech } from '@/components/mascot/Bindu';
import { StudentGate } from './Gate';

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
      <p className="mt-2 max-w-[46ch] text-ink-soft">Ask in English or Telugu. Type, or press the microphone and speak. Answers come from your textbook and show the pages they used.</p>
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
  const preview = usePreview();
  useEffect(() => { if (!preview) void loadConversations(); }, [preview]);
  return (
    <section aria-labelledby="hist-h" className="mt-7">
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
              <button type="button" onClick={() => openConversation(c)} className={clsx('flex w-full items-baseline gap-2 py-2 text-left hover:text-emerald', c.id === s.conversationId && 'text-emerald')}>
                <span className="min-w-0 flex-1 truncate">{c.title ?? 'Untitled'}</span>
                <span className="shrink-0 text-xs italic text-ink-faint">{c.mode === 'socratic' ? 'hints' : ''} {new Date(c.updated_at).toLocaleDateString()}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/png': [], 'image/jpeg': [], 'image/webp': [] },
    multiple: false,
    disabled: !!d.busy || !consent.document_upload,
    onDrop: async (files) => {
      if (!files[0] || !user) return;
      const id = await uploadAndRead(files[0], kind, user.id);
      if (id) chat.set({ notesDocId: id, messages: [] });
    },
  });

  return (
    <section aria-labelledby="notes-h" className="mt-7">
      <h2 id="notes-h" className="font-display text-xl">Ask about your notes</h2>
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
          <div
            {...getRootProps()}
            className={clsx('mt-3 flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed px-4 py-5 text-center text-sm transition',
              isDragActive ? 'border-emerald bg-emerald/10' : 'border-ink/30 hover:border-gold-deep')}
          >
            <input {...getInputProps()} aria-label="Upload a photo" />
            {d.busy ? (
              <span className="flex items-center gap-2"><Loader2 aria-hidden className="h-4 w-4 animate-spin" /> {d.busy}</span>
            ) : (
              <>
                <FileImage aria-hidden className="h-6 w-6 text-ink-faint" />
                <span className="mt-1">Drop a photo here or <span className="underline">choose one</span></span>
                <span className="text-xs text-ink-faint">PNG, JPEG or WebP, up to 4 MB</span>
              </>
            )}
          </div>
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
                onClick={() => chat.set({ notesDocId: doc.id, messages: [] })}
                className={clsx('min-w-0 flex-1 truncate text-left', doc.id === s.notesDocId ? 'font-semibold text-emerald' : 'hover:text-emerald', doc.status !== 'ready' && 'opacity-60')}
              >
                {KIND_LABEL[doc.kind]}, {new Date(doc.created_at).toLocaleDateString()}
                {doc.status !== 'ready' && <span className="italic text-ink-faint"> ({doc.status === 'failed' ? 'could not be read' : 'reading'})</span>}
                {doc.needs_review && doc.status === 'ready' && <span className="font-hand text-pencil"> hard to read in places</span>}
              </button>
              <button type="button" aria-label="Delete this photo" onClick={() => { if (s.notesDocId === doc.id) chat.set({ notesDocId: null }); void removeDoc(doc.id); }} className="rounded p-1 text-ink-faint hover:text-pencil">
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
      {notesDoc && (
        <div className="mb-2 flex items-center gap-2 rounded-md bg-gold/15 px-3 py-1.5 text-sm">
          <FileImage aria-hidden className="h-4 w-4 text-gold-deep" />
          <span className="flex-1">Asking about: {KIND_LABEL[notesDoc.kind]}, {new Date(notesDoc.created_at).toLocaleDateString()}</span>
          <button type="button" onClick={() => chat.set({ notesDocId: null, messages: [] })} className="flex items-center gap-1 text-ink-soft hover:text-pencil">
            <X aria-hidden className="h-4 w-4" /> Back to the tutor
          </button>
        </div>
      )}
      <div ref={listRef} role="log" aria-live="polite" aria-label="Conversation" className="page-scroll min-h-0 flex-1 space-y-5 pr-1">
        {s.messages.length === 0 && <EmptyChat notes={!!notesDoc} />}
        {s.messages.map((m) => <Bubble key={m.id} m={m} language={language} />)}
        {s.sending && (
          <div className="flex items-center gap-3 text-ink-faint">
            <Bindu size={40} mood="thinking" />
            <span className="font-hand text-lg">{s.notesDocId ? 'Reading your notes…' : s.mode === 'socratic' ? 'Thinking of a good hint…' : 'Looking it up in your textbook…'}</span>
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
      <Composer />
    </div>
  );
}

function EmptyChat({ notes }: { notes: boolean }) {
  const { language } = useAuth();
  const examples = notes
    ? ['What is this page about?', 'List the main points in my notes.']
    : language === 'te'
      ? ['కిరణజన్య సంయోగక్రియ అంటే ఏమిటి?', 'What is the SI unit of electric current?']
      : ['Why does a pencil look bent in water?', 'A bulb draws 0.5 A at 220 V. What is its power?', 'What is the difference between an acid and a base?'];
  return (
    <div className="flex flex-col items-start gap-4 pt-2">
      <div className="flex items-end gap-3">
        <Bindu size={64} />
        <Speech className="mb-4 max-w-[32ch]">{notes ? 'Ask me anything about your photo.' : 'What would you like to understand today?'}</Speech>
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

function Bubble({ m, language }: { m: ChatMessage; language: 'en' | 'te' }) {
  const [speaking, setSpeaking] = useState<'idle' | 'loading' | 'playing'>('idle');
  const [speakError, setSpeakError] = useState<string | null>(null);
  const telugu = /[ఀ-౿]/.test(m.text);

  const listen = async () => {
    if (speaking === 'playing') { stopSpeaking(); setSpeaking('idle'); return; }
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
    return (
      <div className="flex justify-end">
        <p className={clsx('font-hand max-w-[85%] text-right text-[1.15rem] leading-snug text-[#24467a]', telugu && 'te')}>{m.text}</p>
      </div>
    );
  }
  return (
    <div className={clsx('relative border-l-[3px] pl-4', m.error ? 'border-pencil' : m.label ? 'border-orange' : 'border-emerald')}>
      {m.label && <p className="mb-1 inline-block rounded-sm bg-orange/15 px-2 py-0.5 text-xs font-semibold text-[#8a4512]">{m.label}</p>}
      <div className={clsx('prose-sm max-w-none text-[0.98rem] leading-relaxed [&_li]:ml-5 [&_ol]:list-decimal [&_p+p]:mt-2 [&_strong]:text-ink [&_ul]:list-disc', telugu && 'te', m.error && 'text-pencil')}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
      </div>
      {m.citations && m.citations.length > 0 && (
        <p className="mt-2 flex flex-wrap gap-1.5 text-xs">
          {m.citations.slice(0, 3).map((c) => (
            <span key={c.chunkId} className="rounded-full border border-gold-deep/50 px-2 py-0.5 text-ink-soft">
              {c.chapterNumber ? `Chapter ${c.chapterNumber}, ` : ''}{c.pageStart === c.pageEnd ? `page ${c.pageStart}` : `pages ${c.pageStart}–${c.pageEnd}`}
            </span>
          ))}
        </p>
      )}
      {!m.error && (
        <div className="mt-1.5 flex items-center gap-2">
          <button type="button" onClick={listen} className="flex items-center gap-1 text-xs text-ink-faint hover:text-emerald" aria-label={speaking === 'playing' ? 'Stop reading aloud' : 'Read this answer aloud'}>
            {speaking === 'loading' ? <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" /> : speaking === 'playing' ? <Square aria-hidden className="h-3.5 w-3.5" /> : <Volume2 aria-hidden className="h-3.5 w-3.5" />}
            {speaking === 'playing' ? 'Stop' : 'Listen'}
          </button>
          {speakError && <span className="text-xs text-pencil">{speakError}</span>}
        </div>
      )}
    </div>
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
    try {
      const r = await startRecording(language, () => void stop());
      setRec(r);
      setVoiceState('recording');
    } catch {
      setVoiceError('The microphone is not available. Check the browser permission.');
    }
  };

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (s.draft.trim() && !s.sending) void send(s.draft, language, { newTopic: s.mode === 'socratic' && !s.socraticOpen && !!s.conversationId });
  };

  return (
    <form onSubmit={submit} className="mt-3 border-t-[1.5px] border-ink/15 pt-3">
      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={toggleMic}
          disabled={voiceState === 'transcribing' || s.sending}
          aria-label={voiceState === 'recording' ? 'Stop recording' : 'Ask by voice'}
          className={clsx('flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[1.5px] transition',
            voiceState === 'recording' ? 'animate-pulse border-pencil bg-pencil text-paper' : 'border-ink/30 text-ink-soft hover:border-emerald hover:text-emerald')}
        >
          {voiceState === 'transcribing' ? <Loader2 aria-hidden className="h-5 w-5 animate-spin" /> : voiceState === 'recording' ? <Square aria-hidden className="h-4 w-4" /> : <Mic aria-hidden className="h-5 w-5" />}
        </button>
        <label htmlFor="ask" className="sr-only">Your question</label>
        <textarea
          id="ask"
          ref={inputRef}
          rows={2}
          maxLength={1500}
          value={s.draft}
          onChange={(e) => chat.set({ draft: e.target.value })}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
          placeholder={s.notesDocId ? 'Ask about your photo…' : s.hint || (language === 'te' ? 'మీ ప్రశ్న ఇక్కడ రాయండి…' : 'Type your question…')}
          className={clsx('field font-hand min-h-[2.75rem] flex-1 resize-none text-[1.15rem] leading-snug', /[ఀ-౿]/.test(s.draft) && 'te')}
        />
        <button type="submit" disabled={!s.draft.trim() || s.sending} className="ink-button h-11 !px-4" aria-label="Send">
          <SendHorizontal aria-hidden className="h-5 w-5" />
        </button>
      </div>
      <p className="mt-1.5 min-h-[1.25rem] text-xs" aria-live="polite">
        {voiceState === 'recording' ? <span className="text-pencil">Listening… {seconds}s of 30. Press the square to stop.</span>
          : voiceState === 'transcribing' ? <span className="text-ink-faint">Turning your voice into text…</span>
            : voiceError ? <span className="text-pencil">{voiceError}</span>
              : <span className="text-ink-faint">Enter to send, Shift and Enter for a new line. Voice recordings are not stored.</span>}
      </p>
    </form>
  );
}
