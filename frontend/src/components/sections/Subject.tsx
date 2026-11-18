'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Clapperboard, FlaskConical, MessageCircleQuestion, PencilLine } from 'lucide-react';
import type { Subject } from '@/lib/api';
import { useChapters } from '@/lib/chapters';
import { EXPLAINERS } from '@/lib/explainers';
import { learningIntent, tutorIntent } from '@/lib/intents';
import { OhmLab, PeaLab, PhLab } from '@/components/labs/Labs';
import { ExplainerVideo } from '@/components/labs/ExplainerVideo';

const SUBJECTS: Record<Subject, { numeral: string; title: string; color: string; intro: string; Lab: () => React.JSX.Element; labTitle: string }> = {
  physics: {
    numeral: 'I', title: 'Physics', color: 'var(--physics)',
    intro: 'How light bends and reflects, how your eye sees colour, and how electric current and magnets behave.',
    Lab: OhmLab, labTitle: 'Try it: current in a circuit',
  },
  chemistry: {
    numeral: 'II', title: 'Chemistry', color: 'var(--chemistry)',
    intro: 'What happens in a chemical reaction, why some things are acids and others bases, and how metals and carbon compounds behave.',
    Lab: PhLab, labTitle: 'Try it: the pH scale',
  },
  biology: {
    numeral: 'III', title: 'Biology', color: 'var(--biology)',
    intro: 'How living things feed, breathe, respond, reproduce and pass traits on, and how they depend on their environment.',
    Lab: PeaLab, labTitle: 'Try it: Mendel’s pea plants',
  },
};

export function SubjectLeft({ subject }: { subject: Subject }) {
  const s = SUBJECTS[subject];
  return (
    <div>
      <div className="flex items-end gap-4">
        <span aria-hidden className="font-display text-[5.5rem] italic leading-[0.8]" style={{ color: s.color }}>{s.numeral}</span>
        <h1 data-page-heading tabIndex={-1} className="font-display text-5xl leading-none outline-none">{s.title}</h1>
      </div>
      <div aria-hidden className="deco-rule mt-4" style={{ borderColor: s.color }} />
      <p className="mt-4 max-w-[48ch] text-ink-soft">{s.intro}</p>
      <PlatePanel subject={subject} />
    </div>
  );
}

// The plate on the left page: the subject's explainer video (if there is one) and its hands-on lab, as two tabs.
function PlatePanel({ subject }: { subject: Subject }) {
  const s = SUBJECTS[subject];
  const explainer = EXPLAINERS[subject];
  const [tab, setTab] = useState<'watch' | 'try'>(explainer ? 'watch' : 'try');
  const tabs = explainer ? ([['watch', `Watch: ${explainer.title}`, Clapperboard], ['try', s.labTitle, FlaskConical]] as const) : null;

  // no video for this subject: the lab in its framed plate, as before
  if (!tabs || !explainer) {
    return (
      <section aria-label={s.labTitle} className="deco-frame relative mt-6 bg-[#f7efdc] p-4 sm:p-5">
        <h2 className="font-display text-xl italic" style={{ color: s.color }}>{s.labTitle}</h2>
        <div className="mt-2"><s.Lab /></div>
      </section>
    );
  }

  // with a video: the tabs sit on the page; the video has no frame (like the Home page), the lab keeps its plate
  return (
    <section aria-label={tab === 'watch' ? `${explainer.title} video` : s.labTitle} className="relative mt-6">
      <div role="tablist" aria-label="Watch or try" className="flex flex-wrap gap-2">
        {tabs.map(([id, label, Icon]) => {
          const on = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTab(id)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1 font-display text-[0.98rem] italic transition-colors"
              style={on ? { background: s.color, color: 'var(--paper)' } : { color: s.color, boxShadow: `inset 0 0 0 1px ${s.color}` }}
            >
              <Icon aria-hidden className="h-4 w-4" /> {label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" className="mt-4">
        {tab === 'watch' ? (
          <ExplainerVideo explainer={explainer} color={s.color} />
        ) : (
          <div className="deco-frame relative bg-[#f7efdc] p-4 sm:p-5"><s.Lab /></div>
        )}
      </div>
    </section>
  );
}

export function SubjectRight({ subject }: { subject: Subject }) {
  const s = SUBJECTS[subject];
  const { chapters, loaded, error, retry } = useChapters(subject);
  const router = useRouter();

  const ask = (title: string) => {
    tutorIntent.set({ subject, draft: `Explain the main ideas of “${title}” simply.` });
    router.push('/tutor');
  };
  const practise = (id: string) => {
    learningIntent.set({ quizChapterId: id });
    router.push('/learning');
  };

  return (
    <div className="pl-10">
      <h2 className="font-display text-3xl">Chapters</h2>
      <p className="mt-1 text-sm text-ink-faint">CBSE Class 10, 2026–27 syllabus</p>
      {!loaded && <p className="mt-6 text-ink-faint">Opening the chapter list…</p>}
      {error && (
        <div className="mt-6">
          <p className="font-hand text-lg text-pencil">The chapter list could not be opened right now.</p>
          <p className="mt-1 text-sm text-ink-soft">
            <Link href="/sign-in" className="font-semibold text-emerald underline underline-offset-4">Sign in</Link> to see your chapters, or{' '}
            <button type="button" className="underline underline-offset-4" onClick={retry}>try again</button>.
          </p>
        </div>
      )}
      <ol className="mt-5 space-y-5">
        {chapters.map((c) => (
          <li key={c.id} className="group">
            <div className="flex items-baseline gap-3">
              <span className="w-10 shrink-0 font-display text-2xl italic" style={{ color: s.color }}>{c.number ?? '§'}</span>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-xl leading-tight">{c.title_en}</h3>
                {c.assessment_scope === 'formative_only' && (
                  <p className="font-hand mt-0.5 -rotate-1 text-pencil">Formative only: not in the year-end exam</p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={() => ask(c.title_en)} className="ghost-button !px-3 !py-1 text-sm">
                    <MessageCircleQuestion aria-hidden className="h-4 w-4" /> Ask the tutor
                  </button>
                  {c.assessment_scope === 'summative' && (
                    <button type="button" onClick={() => practise(c.id)} className="ghost-button !px-3 !py-1 text-sm">
                      <PencilLine aria-hidden className="h-4 w-4" /> Practise
                    </button>
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>
      {subject === 'physics' && loaded && !error && (
        <p className="mt-8 text-sm italic text-ink-faint">Electric motors, electromagnetic induction and generators are taught for understanding only this year, so there are no exam-style quizzes on them.</p>
      )}
    </div>
  );
}
