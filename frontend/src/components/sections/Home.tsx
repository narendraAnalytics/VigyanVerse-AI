'use client';

import Link from 'next/link';
import { Hero } from '@/components/three/Hero';
import { Bindu, Speech } from '@/components/mascot/Bindu';
import { useAuth, nextSetupStep } from '@/lib/auth';
import { usePageLayout } from '@/components/book/page-context';

export function HomeLeft() {
  const layout = usePageLayout();
  return (
    <div className={layout === 'single' ? 'flex flex-col pl-10' : 'flex h-full min-h-[22rem] flex-col pl-10'}>
      <h1 data-page-heading tabIndex={-1} className="font-display text-[clamp(1.6rem,min(2.6vw,4.6vh),3rem)] leading-[1.08] text-ink outline-none">
        Class 10 Science, explained the way you ask it
      </h1>
      <p className="mt-2 max-w-[46ch] text-ink-soft">
        Answers from your NCERT textbook in English or Telugu, hints when you want to work it out yourself, and practice
        questions with checked answers.
      </p>
      <div className={layout === 'single' ? 'relative mt-3 h-[300px]' : 'relative mt-1 min-h-[210px] flex-1'}>
        <Hero />
      </div>
    </div>
  );
}

const CONTENTS = [
  { n: 'I', href: '/physics', title: 'Physics', page: 1, about: 'Light, the human eye, electricity and magnetism' },
  { n: 'II', href: '/chemistry', title: 'Chemistry', page: 3, about: 'Reactions and equations, acids and bases, metals, carbon' },
  { n: 'III', href: '/biology', title: 'Biology', page: 5, about: 'Life processes, control, reproduction, heredity, our environment' },
  { n: 'IV', href: '/tutor', title: 'AI Tutor', page: 7, about: 'Type or speak a question, or upload a photo of your notes' },
  { n: 'V', href: '/learning', title: 'My Learning', page: 9, about: 'Practice quizzes, chapter mastery and what to revise next' },
];

const PROMISES = [
  'Answers come from your textbook and show the pages they came from.',
  'A question from outside the textbook gets a short answer that says so.',
  'Numbers are worked out by code, not guessed by the AI.',
  'Quiz questions are checked twice before you see them, and marking is done by code.',
  'Your photos stay private to you, and voice recordings are never stored.',
];

export function HomeRight() {
  const auth = useAuth();
  const step = auth.loading ? null : nextSetupStep(auth);
  return (
    <div className="pl-10">
      {!auth.loading && auth.user && (
        <div className="mb-6 border-l-2 border-emerald bg-emerald/5 px-4 py-3" role="status">
          <p className="font-hand text-2xl leading-tight text-emerald">Welcome, {auth.profile?.display_name ?? auth.user.name ?? auth.user.email.split('@')[0]}!</p>
          <p className="mt-0.5 text-sm text-ink-soft">
            You are signed in.
            {step ? ' One more step to finish setting up.' : ' Pick a chapter, or ask the tutor.'}
          </p>
        </div>
      )}
      <h2 className="font-display text-3xl">Contents</h2>
      <ol className="mt-5 space-y-4">
        {CONTENTS.map((c) => (
          <li key={c.n}>
            <Link href={c.href} className="group block rounded-sm outline-offset-4">
              <span className="flex items-baseline">
                <span className="w-9 shrink-0 font-display italic text-gold-deep">{c.n}</span>
                <span className="font-display text-xl group-hover:text-emerald">{c.title}</span>
                <span aria-hidden className="leader" />
                <span className="font-display italic text-ink-soft">{c.page}</span>
              </span>
              <span className="ml-9 block text-[0.92rem] text-ink-soft">{c.about}</span>
            </Link>
          </li>
        ))}
      </ol>

      <section aria-labelledby="honest" className="relative mt-9 border-l-2 border-gold pl-5">
        <h3 id="honest" className="font-display text-xl">How the answers stay honest</h3>
        <ul className="mt-3 space-y-2 text-[0.95rem] text-ink-soft">
          {PROMISES.map((p) => (
            <li key={p} className="flex gap-2">
              <span aria-hidden className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rotate-45 bg-gold" />
              {p}
            </li>
          ))}
        </ul>
      </section>

      <div className="relative mt-9 flex flex-wrap items-center gap-3">
        {auth.loading ? null : !auth.user ? (
          <>
            <Link href="/sign-in" className="ink-button">Sign in</Link>
            <span aria-hidden className="font-hand absolute -top-7 right-2 -rotate-6 text-lg text-pencil sm:right-10">start here</span>
          </>
        ) : step && step !== '/sign-in' ? (
          <Link href={step} className="ink-button">{step === '/parent' ? 'Open the permission slip' : 'Finish your bookplate'}</Link>
        ) : (
          <Link href="/learning" className="ink-button">Continue to My Learning</Link>
        )}
      </div>

      <div className="mt-8 flex items-end gap-3">
        <Bindu size={64} />
        <Speech className="mb-5 max-w-[28ch]">Hi, I’m Bindu. Pick a chapter from the contents, or ask me anything.</Speech>
      </div>
    </div>
  );
}
