'use client';

import { useEffect, useId } from 'react';
import { clsx } from 'clsx';
import { CalendarClock, Check, Loader2, PencilLine, X } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { useChapters } from '@/lib/chapters';
import { learningIntent } from '@/lib/intents';
import { closeQuiz, learning, loadLearning, quiz, startQuiz, submitQuiz } from '@/lib/learning-store';
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
        <button type="button" onClick={() => void startQuiz(a.chapter!.id, language)} className="ink-button mt-3">
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
  const { language } = useAuth();
  const preview = usePreview();

  // A chapter page may have asked for a quiz.
  useEffect(() => {
    if (preview) return;
    const id = learningIntent.get().quizChapterId;
    if (id) { learningIntent.reset(); void startQuiz(id, language); }
  }, [preview, language]);

  return (
    <div className="pl-10">
      <StudentGate what="quizzes" needs="ai_tutoring">
        {q.phase === 'idle' ? <MasteryTable /> : <QuizPaper />}
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
        {summative.map((c) => <MasteryRowView key={c.id} c={c} m={byChapter.get(c.id)} onPractise={() => void startQuiz(c.id, language)} />)}
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
    return (
      <div className="flex flex-col items-start gap-4 py-6">
        <h2 className="font-display text-3xl">{title}</h2>
        <div className="flex items-end gap-3">
          <Bindu size={70} mood="thinking" />
          <Speech className="mb-5 max-w-[34ch]">Writing your questions, then checking each answer twice. This takes about 20 seconds.</Speech>
        </div>
        <Loader2 aria-hidden className="h-6 w-6 animate-spin text-emerald" />
      </div>
    );
  }
  if (q.phase === 'error') {
    return (
      <div className="py-6">
        <h2 className="font-display text-3xl">{title}</h2>
        <p role="alert" className="mt-3 text-pencil">{q.error}</p>
        <div className="mt-4 flex gap-3">
          {q.chapterId && <button type="button" className="ink-button" onClick={() => void startQuiz(q.chapterId!, language)}>Try again</button>}
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
          <p className="text-sm italic text-ink-faint">Practice paper</p>
          <h2 className="font-display text-3xl leading-tight">{title}</h2>
        </div>
        <button type="button" onClick={closeQuiz} className="ghost-button !px-3 !py-1 text-sm">{graded ? 'Done' : 'Close'}</button>
      </div>
      {graded && (
        <div className="mt-4 flex items-center gap-4 rounded-md border-[1.5px] border-gold bg-gold/10 px-4 py-3">
          <span className="font-hand -rotate-6 text-4xl text-pencil">{graded.score}/{graded.maxScore}</span>
          <p className="text-sm text-ink-soft">Marked by code against checked answers. Your chapter mastery and revision dates are updated.</p>
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
