'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { CalendarClock, Check, ClipboardList, Loader2, PencilLine, Timer, X } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { useChapters } from '@/lib/chapters';
import { learningIntent } from '@/lib/intents';
import { beginTimer, closeQuiz, learning, limitFor, loadLearning, openQuizSetup, openReview, quiz, QUIZ_SIZES, startQuiz, submitQuiz } from '@/lib/learning-store';
import type { Chapter, MasteryRow } from '@/lib/api';
import { usePageLayout, usePreview } from '@/components/book/page-context';
import { Bindu, Speech } from '@/components/mascot/Bindu';
import { StudentGate } from './Gate';

const STATE_LABEL: Record<MasteryRow['state'], string> = {
  not_started: 'Not started', learning: 'Learning', developing: 'Developing', proficient: 'Proficient', mastered: 'Mastered',
};
const STATE_COLOR: Record<MasteryRow['state'], string> = {
  not_started: 'rgba(125,115,98,.35)', learning: '#d9796b', developing: '#d9a22d', proficient: '#4f9a5a', mastered: '#1f5f5b',
};
const ERROR_LABEL: Record<string, string> = {
  conceptual: 'Mixing up an idea', calculation: 'Calculation slips', formula_selection: 'Choosing the wrong formula',
  interpretation: 'Misreading the question', incomplete: 'Incomplete answers', terminology: 'Using the wrong term',
};

function useLearningData() {
  const { language, user, profile } = useAuth();
  const preview = usePreview();
  const state = useStore(learning);
  useEffect(() => {
    if (!preview && user && profile?.role === 'student') void loadLearning(language);
  }, [preview, user, profile?.role, language]);
  return state;
}

// ---------------------------------------------------------------------------
// Left page: what to do next, what is due, mistakes to watch
// ---------------------------------------------------------------------------
export function LearningLeft() {
  return (
    <div>
      <h1 data-page-heading tabIndex={-1} className="font-display text-4xl leading-tight outline-none">My Learning</h1>
      <p className="mt-2 max-w-[46ch] text-ink-soft">Your progress in each chapter comes from the quizzes you take. Chapters come back for revision just before you are likely to forget them.</p>
      <StudentGate what="My Learning" quiet={usePageLayout() === 'single'}>
        <NextStep />
        <DueList />
        <QuizHistory />
      </StudentGate>
    </div>
  );
}

function NextStep() {
  const s = useLearningData();
  const { language } = useAuth();
  const a = s.advice;
  return (
    <section aria-labelledby="next-h" className="mt-6">
      <h2 id="next-h" className="font-display text-xl">Your next step</h2>
      <div className="mt-3 flex items-end gap-3">
        <Bindu size={70} mood={a?.kind === 'revise_due' ? 'thinking' : 'happy'} />
        <Speech className={clsx('mb-5 max-w-[36ch]', language === 'te' && 'te')}>
          {s.adviceError ?? a?.message ?? 'Let me look at your progress…'}
        </Speech>
      </div>
      {a?.chapter && (
        <button type="button" onClick={() => openQuizSetup(a.chapter!.id)} className="ink-button mt-3">
          <PencilLine aria-hidden className="h-4 w-4" /> Practise {a.chapter.title}
        </button>
      )}
      {a && a.topErrors.length > 0 && (
        <div className="mt-6">
          <h3 className="font-display text-lg">Mistakes to watch (last 30 days)</h3>
          <ul className="mt-2 space-y-1 text-[0.95rem]">
            {a.topErrors.map((e) => (
              <li key={e.errorType} className="flex items-baseline">
                <span>{ERROR_LABEL[e.errorType] ?? e.errorType}</span><span aria-hidden className="leader" /><span className="font-display">{e.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function DueList() {
  const s = useLearningData();
  const { chapters } = useChapters();
  const byId = new Map(chapters.map((c) => [c.id, c]));
  const now = Date.now();
  const items = s.revisions.slice(0, 6);
  return (
    <section aria-labelledby="due-h" className="mt-8">
      <h2 id="due-h" className="flex items-center gap-2 font-display text-xl"><CalendarClock aria-hidden className="h-5 w-5 text-gold-deep" /> Revision timetable</h2>
      {!s.loaded ? <p className="mt-2 text-sm text-ink-faint">Loading…</p> : items.length === 0 ? (
        <p className="mt-2 text-sm text-ink-faint">Take a quiz on any chapter and it will appear here with a revision date.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {items.map((r) => {
            const due = new Date(r.due_at);
            const overdue = due.getTime() <= now;
            return (
              <li key={r.chapter_id} className="flex items-baseline text-[0.95rem]">
                <span className="min-w-0 truncate">{byId.get(r.chapter_id)?.title_en ?? 'Chapter'}</span>
                <span aria-hidden className="leader" />
                <span className={clsx('shrink-0', overdue ? 'font-hand text-lg text-pencil' : 'text-ink-soft')}>
                  {overdue ? 'due now' : due.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Right page: chapter mastery, or the quiz paper when one is open
// ---------------------------------------------------------------------------
export function LearningRight() {
  const q = useStore(quiz);
  const preview = usePreview();

  // A chapter page may have asked for a quiz: open its setup card.
  useEffect(() => {
    if (preview) return;
    const id = learningIntent.get().quizChapterId;
    if (id) { learningIntent.reset(); openQuizSetup(id); }
  }, [preview]);

  return (
    <div className="pl-10">
      <StudentGate what="quizzes" needs="ai_tutoring">
        {q.phase === 'idle' ? <MasteryTable /> : q.phase === 'setup' ? <QuizSetup /> : q.phase === 'review' ? <QuizReviewView /> : <QuizPaper />}
      </StudentGate>
    </div>
  );
}

function MasteryTable() {
  const s = useLearningData();
  const { chapters } = useChapters();
  const { language } = useAuth();
  const byChapter = new Map(s.mastery.map((m) => [m.chapter_id, m]));
  const summative = chapters.filter((c) => c.assessment_scope === 'summative');
  return (
    <section aria-labelledby="mastery-h">
      <h2 id="mastery-h" className="font-display text-3xl">Chapter mastery</h2>
      <p className="mt-1 text-sm text-ink-faint">Mastered needs a score of 85 or more over at least 10 answers.</p>
      <ul className="mt-5 space-y-3">
        {summative.map((c) => <MasteryRowView key={c.id} c={c} m={byChapter.get(c.id)} onPractise={() => openQuizSetup(c.id)} />)}
      </ul>
    </section>
  );
}

function MasteryRowView({ c, m, onPractise }: { c: Chapter; m?: MasteryRow; onPractise: () => void }) {
  const state = m?.state ?? 'not_started';
  const score = m ? Math.round(m.score) : 0;
  return (
    <li className="grid grid-cols-[2rem_1fr_auto] items-center gap-x-3 gap-y-1">
      <span className="font-display text-lg italic text-ink-faint">{c.number}</span>
      <div className="min-w-0">
        <p className="truncate font-display text-[1.05rem] leading-tight">{c.title_en}</p>
        <div className="mt-1 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={score} aria-label={`${c.title_en} score`}>
            <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${score}%`, background: STATE_COLOR[state] }} />
          </div>
          <span className="w-24 text-xs text-ink-soft">{STATE_LABEL[state]}{m ? `, ${score}` : ''}</span>
        </div>
      </div>
      <button type="button" onClick={onPractise} className="ghost-button !px-3 !py-1 text-sm">Practise</button>
    </li>
  );
}

function QuizPaper() {
  const q = useStore(quiz);
  const { language } = useAuth();
  const { chapters } = useChapters();
  const title = q.quiz?.chapter.title ?? chapters.find((c) => c.id === q.chapterId)?.title_en ?? 'Practice quiz';

  if (q.phase === 'generating') {
    const { ready, planned } = q.progress;
    return (
      <div className="flex flex-col items-start gap-4 py-6">
        <h2 className="font-display text-3xl">{title}</h2>
        <div className="flex items-end gap-3">
          <Bindu size={70} mood="thinking" />
          <Speech className="mb-5 max-w-[36ch]">
            Writing {planned} questions{q.setup.mode === 'topic' && q.setup.topic.trim() ? ` on “${q.setup.topic.trim()}”` : ''}, then checking each answer twice. This takes about 20–30 seconds.
          </Speech>
        </div>
        <div className="w-full max-w-sm" role="progressbar" aria-valuemin={0} aria-valuemax={planned} aria-valuenow={ready} aria-label="Questions ready">
          <div className="h-2 overflow-hidden rounded-full bg-ink/10">
            <div className="h-full rounded-full bg-emerald transition-[width] duration-500" style={{ width: `${planned ? Math.max(6, (ready / planned) * 100) : 6}%` }} />
          </div>
          <p className="mt-1 flex items-center gap-2 text-sm text-ink-soft"><Loader2 aria-hidden className="h-4 w-4 animate-spin text-emerald" /> {ready} of {planned} ready</p>
        </div>
        <button type="button" className="ghost-button !px-3 !py-1 text-sm" onClick={closeQuiz}>Cancel</button>
      </div>
    );
  }
  if (q.phase === 'ready' && q.quiz) {
    const minutes = Math.round(limitFor(q.quiz.questions) / 60);
    return (
      <div className="flex flex-col items-start gap-4 py-6">
        <h2 className="font-display text-3xl">{title}</h2>
        <div className="flex items-end gap-3">
          <Bindu size={70} />
          <Speech className="mb-5 max-w-[36ch]">
            Your {q.quiz.questions.length} questions are ready. You have about {minutes} minutes. The clock starts when you press Start.
          </Speech>
        </div>
        {q.partial && <p className="text-sm text-ink-soft">{q.partial}</p>}
        <p className="text-sm text-ink-soft">1 minute for each multiple-choice question, 2 for each numerical. When time is up, your answers are handed in by themselves.</p>
        {q.error && <p role="alert" className="text-pencil">{q.error}</p>}
        <div className="flex gap-3">
          <button type="button" className="ink-button" onClick={() => void beginTimer()}><Timer aria-hidden className="h-4 w-4" /> Start</button>
          <button type="button" className="ghost-button" onClick={closeQuiz}>Not now</button>
        </div>
      </div>
    );
  }
  if (q.phase === 'error') {
    return (
      <div className="py-6">
        <h2 className="font-display text-3xl">{title}</h2>
        <p role="alert" className="mt-3 text-pencil">{q.error}</p>
        <div className="mt-4 flex gap-3">
          {q.chapterId && <button type="button" className="ink-button" onClick={() => openQuizSetup(q.chapterId!)}>Try again</button>}
          <button type="button" className="ghost-button" onClick={closeQuiz}>Back to chapters</button>
        </div>
      </div>
    );
  }
  if (!q.quiz) return null;
  const graded = q.graded;
  const resultFor = (id: string) => graded?.results.find((r) => r.questionId === id);
  const answeredCount = q.quiz.questions.filter((x) => q.answers[x.id]?.selectedIndex !== undefined || q.answers[x.id]?.answerText?.trim()).length;

  return (
    <form onSubmit={(e) => { e.preventDefault(); void submitQuiz(language); }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm italic text-ink-faint">Practice paper{q.setup.mode === 'topic' && q.setup.topic.trim() ? ` · ${q.setup.topic.trim()}` : ''}</p>
          <h2 className="font-display text-3xl leading-tight">{title}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {q.deadline && !graded && <Countdown deadline={q.deadline} onEnd={() => void submitQuiz(language)} />}
          <button type="button" onClick={closeQuiz} className="ghost-button !px-3 !py-1 text-sm">{graded ? 'Done' : 'Close'}</button>
        </div>
      </div>
      {q.partial && !graded && <p className="mt-2 text-sm text-ink-soft">{q.partial}</p>}
      {graded && (
        <div className="mt-4 flex items-center gap-4 rounded-md border-[1.5px] border-gold bg-gold/10 px-4 py-3">
          <span className="font-hand -rotate-6 text-4xl text-pencil">{graded.score}/{graded.maxScore}</span>
          <p className="text-sm text-ink-soft">
            Marked by code against checked answers. Your chapter mastery and revision dates are updated.
            {graded.timeTakenSeconds !== null && <span className="block">Time taken: {formatDuration(graded.timeTakenSeconds)}{graded.overtime ? ' (after the time was up)' : ''}.</span>}
            <span className="block">You can look at this quiz again any time under “Your quizzes”.</span>
          </p>
        </div>
      )}
      <ol className="mt-6 space-y-7">
        {q.quiz.questions.map((question) => {
          const r = resultFor(question.id);
          return (
            <li key={question.id}>
              <Question
                n={question.position}
                stem={question.stem}
                type={question.type}
                options={question.options}
                value={q.answers[question.id]}
                disabled={!!graded || q.phase === 'grading'}
                onChange={(v) => quiz.set((p) => ({ answers: { ...p.answers, [question.id]: v } }))}
                result={r}
              />
            </li>
          );
        })}
      </ol>
      {q.error && <p role="alert" className="mt-4 text-pencil">{q.error}</p>}
      {!graded && (
        <div className="mt-8 flex items-center gap-4">
          <button type="submit" className="ink-button" disabled={q.phase === 'grading' || answeredCount === 0}>
            {q.phase === 'grading' ? <><Loader2 aria-hidden className="h-4 w-4 animate-spin" /> Marking…</> : 'Submit answers'}
          </button>
          <span className="text-sm text-ink-faint">{answeredCount} of {q.quiz.questions.length} answered</span>
        </div>
      )}
    </form>
  );
}

function Question({ n, stem, type, options, value, disabled, onChange, result }: {
  n: number; stem: string; type: 'mcq' | 'numeric'; options: string[] | null; value?: { selectedIndex?: number; answerText?: string };
  disabled: boolean; onChange: (v: { selectedIndex?: number; answerText?: string }) => void;
  result?: { isCorrect: boolean; answered: boolean; feedback: string | null; correctAnswer: string; explanation: string };
}) {
  const id = useId();
  const telugu = /[ఀ-౿]/.test(stem);
  return (
    <fieldset className={clsx(telugu && 'te')} aria-describedby={result ? `${id}-r` : undefined}>
      <legend className="flex gap-2 text-[1.02rem]">
        <span className="font-display italic text-gold-deep">{n}.</span>
        <span>{stem}</span>
        {result && (result.isCorrect
          ? <Check aria-label="Correct" className="h-5 w-5 shrink-0 text-emerald" />
          : <X aria-label="Not correct" className="h-5 w-5 shrink-0 text-pencil" />)}
      </legend>
      {type === 'mcq' && options ? (
        <div className="mt-2 grid gap-1.5 pl-6">
          {options.map((opt, i) => (
            <label key={i} className={clsx('flex cursor-pointer items-start gap-2 rounded px-2 py-1 transition hover:bg-gold/10', value?.selectedIndex === i && 'bg-emerald/10', disabled && 'cursor-default')}>
              <input type="radio" name={id} disabled={disabled} checked={value?.selectedIndex === i} onChange={() => onChange({ selectedIndex: i })} className="mt-1.5 accent-[var(--emerald)]" />
              <span><span className="font-display italic">({String.fromCharCode(97 + i)})</span> {opt}</span>
            </label>
          ))}
        </div>
      ) : (
        <div className="mt-2 pl-6">
          <label className="sr-only" htmlFor={`${id}-n`}>Your answer with its unit</label>
          <input id={`${id}-n`} className="field font-hand max-w-xs text-lg" placeholder="Your answer, with the unit" disabled={disabled}
            value={value?.answerText ?? ''} onChange={(e) => onChange({ answerText: e.target.value })} maxLength={200} />
        </div>
      )}
      {result && (
        <div id={`${id}-r`} className="mt-2 pl-6 text-[0.95rem]">
          {!result.isCorrect && (
            <p className="font-hand text-lg text-pencil">{result.answered ? '' : 'Not answered. '}Answer: {result.correctAnswer}</p>
          )}
          {result.feedback && <p className="mt-1 text-ink-soft">{result.feedback}</p>}
          {result.explanation && <p className="mt-1 text-sm italic text-ink-faint">{result.explanation}</p>}
        </div>
      )}
    </fieldset>
  );
}

// ---------------------------------------------------------------------------
// Quiz setup: whole chapter or a topic, 5 / 10 / 15 questions, timed or not
// ---------------------------------------------------------------------------
function QuizSetup() {
  const q = useStore(quiz);
  const { language } = useAuth();
  const { chapters } = useChapters();
  const chapter = chapters.find((c) => c.id === q.chapterId);
  const s = q.setup;
  const set = (patch: Partial<typeof s>) => quiz.set((p) => ({ setup: { ...p.setup, ...patch }, error: null }));
  const topicId = useId();
  const numeric = chapter?.subject_code === 'physics';
  return (
    <form className="py-2" onSubmit={(e) => { e.preventDefault(); void startQuiz(language); }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm italic text-ink-faint">New practice quiz</p>
          <h2 className="font-display text-3xl leading-tight">{chapter?.title_en ?? 'Practice quiz'}</h2>
        </div>
        <button type="button" onClick={closeQuiz} className="ghost-button !px-3 !py-1 text-sm">Close</button>
      </div>

      <fieldset className="mt-6">
        <legend className="font-display text-lg">What should it cover?</legend>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {([
            { id: 'chapter', title: 'Whole chapter', body: 'Questions from across the chapter.' },
            { id: 'topic', title: 'A topic I choose', body: 'Every question on one topic.' },
          ] as const).map((m) => (
            <button key={m.id} type="button" aria-pressed={s.mode === m.id} onClick={() => set({ mode: m.id })}
              className={clsx('rounded-md border-[1.5px] p-3 text-left transition', s.mode === m.id ? 'border-emerald bg-emerald/10' : 'border-ink/20 hover:border-gold-deep')}>
              <span className="block font-display text-lg">{m.title}</span>
              <span className="block text-sm text-ink-soft">{m.body}</span>
            </button>
          ))}
        </div>
        {s.mode === 'topic' && (
          <div className="mt-3">
            <label htmlFor={topicId} className="text-sm text-ink-soft">Topic from this chapter</label>
            <input id={topicId} className="field mt-1" maxLength={80} autoFocus value={s.topic} onChange={(e) => set({ topic: e.target.value })}
              placeholder={numeric ? 'For example: Ohm’s law' : 'For example: balancing equations'} />
            <p className="mt-1 text-xs text-ink-faint">It must be in this chapter of your textbook. The questions come only from it.</p>
          </div>
        )}
      </fieldset>

      <fieldset className="mt-6">
        <legend className="font-display text-lg">How many questions?</legend>
        <div className="mt-2 flex gap-2">
          {QUIZ_SIZES.map((n) => (
            <button key={n} type="button" aria-pressed={s.size === n} onClick={() => set({ size: n })}
              className={clsx('min-w-14 rounded-md border-[1.5px] px-4 py-2 font-display text-xl transition', s.size === n ? 'border-emerald bg-emerald/10' : 'border-ink/20 hover:border-gold-deep')}>
              {n}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-6">
        <legend className="font-display text-lg">Time limit</legend>
        <label className="mt-2 flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={s.timed} onChange={(e) => set({ timed: e.target.checked })} className="mt-1 h-4 w-4 accent-[var(--emerald)]" />
          <span>
            <span className="block">Timed: about {s.size} minutes{numeric ? ' (2 minutes for each numerical)' : ''}</span>
            <span className="block text-sm text-ink-soft">1 minute per multiple-choice question. The clock starts only when you press Start, and your answers are handed in when time is up. Untick for no clock.</span>
          </span>
        </label>
      </fieldset>

      {q.error && <p role="alert" className="mt-4 text-pencil">{q.error}</p>}
      <div className="mt-7 flex items-center gap-3">
        <button type="submit" className="ink-button"><PencilLine aria-hidden className="h-4 w-4" /> Make my quiz</button>
        <span className="text-sm text-ink-faint">Takes about 20–30 seconds to write and check.</span>
      </div>
    </form>
  );
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60), s = Math.round(seconds % 60);
  return m ? `${m} min ${s.toString().padStart(2, '0')} s` : `${s} s`;
}

/** The clock of a timed quiz; hands the quiz in once when it reaches 0. */
function Countdown({ deadline, onEnd }: { deadline: number; onEnd: () => void }) {
  const preview = usePreview();
  const [now, setNow] = useState(() => Date.now());
  const ended = useRef(false);
  const end = useRef(onEnd);
  end.current = onEnd;
  useEffect(() => {
    if (preview) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [preview]);
  const left = Math.max(0, Math.ceil((deadline - now) / 1000));
  useEffect(() => {
    if (left === 0 && !ended.current && !preview) { ended.current = true; end.current(); }
  }, [left, preview]);
  const low = left <= 60;
  return (
    <span role="timer" aria-live={low ? 'polite' : 'off'} aria-label={`Time left ${Math.floor(left / 60)} minutes ${left % 60} seconds`}
      className={clsx('flex items-center gap-1 rounded-full border-[1.5px] px-3 py-1 font-display text-lg tabular-nums', low ? 'border-pencil text-pencil' : 'border-ink/25 text-ink')}>
      <Timer aria-hidden className="h-4 w-4" />
      {Math.floor(left / 60)}:{(left % 60).toString().padStart(2, '0')}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Left page: past quizzes; right page: one of them read back
// ---------------------------------------------------------------------------
function QuizHistory() {
  const s = useLearningData();
  const q = useStore(quiz);
  const { chapters } = useChapters();
  const byId = new Map(chapters.map((c) => [c.id, c]));
  const items = s.history.slice(0, 8);
  return (
    <section aria-labelledby="quizzes-h" className="mt-8">
      <h2 id="quizzes-h" className="flex items-center gap-2 font-display text-xl"><ClipboardList aria-hidden className="h-5 w-5 text-gold-deep" /> Your quizzes</h2>
      {!s.loaded ? <p className="mt-2 text-sm text-ink-faint">Loading…</p> : items.length === 0 ? (
        <p className="mt-2 text-sm text-ink-faint">Your finished quizzes appear here. Open one to see your answers and marks again.</p>
      ) : (
        <ul className="mt-2 divide-y divide-ink/10">
          {items.map((h) => {
            const active = q.phase === 'review' && q.review?.assessment_id === h.id;
            return (
              <li key={h.id}>
                <button type="button" onClick={() => void openReview(h.id)} className={clsx('flex w-full items-baseline gap-2 py-1.5 text-left text-[0.95rem] hover:text-emerald', active && 'text-emerald')}>
                  <span className="min-w-0 flex-1 truncate">
                    {byId.get(h.chapter_id ?? '')?.title_en ?? 'Quiz'}
                    {h.topic && <span className="text-ink-soft"> · {h.topic}</span>}
                  </span>
                  <span className="shrink-0 font-hand text-lg text-pencil">{h.score}/{h.max_score}</span>
                  <span className="w-14 shrink-0 text-right text-xs italic text-ink-faint">{new Date(h.submitted_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function QuizReviewView() {
  const q = useStore(quiz);
  const { chapters } = useChapters();
  const r = q.review;
  const title = chapters.find((c) => c.id === r?.chapter_id)?.title_en ?? 'Quiz';
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm italic text-ink-faint">Your quiz{r ? `, ${new Date(r.submitted_at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}` : ''}{r?.topic ? ` · ${r.topic}` : ''}</p>
          <h2 className="font-display text-3xl leading-tight">{title}</h2>
        </div>
        <button type="button" onClick={closeQuiz} className="ghost-button !px-3 !py-1 text-sm">Close</button>
      </div>
      {!r && !q.error && <p className="mt-6 flex items-center gap-2 text-ink-faint"><Loader2 aria-hidden className="h-4 w-4 animate-spin" /> Opening your quiz…</p>}
      {q.error && <p role="alert" className="mt-4 text-pencil">{q.error}</p>}
      {r && (
        <>
          <div className="mt-4 flex items-center gap-4 rounded-md border-[1.5px] border-gold bg-gold/10 px-4 py-3">
            <span className="font-hand -rotate-6 text-4xl text-pencil">{Number(r.score)}/{Number(r.max_score)}</span>
            <p className="text-sm text-ink-soft">
              {r.questions.filter((x) => x.is_correct).length} right, {r.questions.filter((x) => x.answered && !x.is_correct).length} wrong, {r.questions.filter((x) => !x.answered).length} not answered.
              {r.time_taken_seconds !== null && <span className="block">Time taken: {formatDuration(r.time_taken_seconds)}{r.time_limit_seconds ? ` of ${formatDuration(r.time_limit_seconds)}` : ''}{r.overtime ? ' (after the time was up)' : ''}.</span>}
            </p>
          </div>
          <ol className="mt-6 space-y-7">
            {r.questions.map((x) => (
              <li key={x.position}>
                <Question
                  n={x.position} stem={x.stem} type={x.type} options={x.options} disabled onChange={() => {}}
                  value={{ selectedIndex: x.selected_index ?? undefined, answerText: x.answer_text ?? undefined }}
                  result={{ isCorrect: x.is_correct, answered: x.answered, feedback: x.feedback, correctAnswer: x.correct_answer ?? '', explanation: x.explanation ?? '' }}
                />
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
