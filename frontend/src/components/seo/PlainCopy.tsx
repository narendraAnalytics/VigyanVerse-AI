// Home and subject text in the route's own server HTML (the book itself is drawn in the browser, and on a
// first visit the intro video covers it). Hidden on screen, where the book shows the same words; it is
// there for search engines and readers without JavaScript, like PolicyPlainCopy for the policy pages.
import Link from 'next/link';
import type { Subject } from '@/lib/api';
import { HOME_CONTENTS, HOME_HEADING, HOME_INTRO, HOME_PROMISES, SUBJECT_INTRO, SYLLABUS } from '@/lib/site-copy';

const SUBJECT_TITLE: Record<Subject, string> = { physics: 'Physics', chemistry: 'Chemistry', biology: 'Biology' };

export function HomePlainCopy() {
  return (
    <div hidden>
      <h1>{HOME_HEADING}</h1>
      <p>{HOME_INTRO}</p>
      <h2>Contents</h2>
      <ol>
        {HOME_CONTENTS.map((c) => (
          <li key={c.href}>
            <Link href={c.href}>{c.title}</Link>: {c.about}
          </li>
        ))}
      </ol>
      <h3>How the answers stay honest</h3>
      <ul>
        {HOME_PROMISES.map((p) => <li key={p}>{p}</li>)}
      </ul>
      <p><Link href="/sign-in">Sign in</Link> to ask the AI tutor and take practice quizzes.</p>
    </div>
  );
}

export function SubjectPlainCopy({ subject }: { subject: Subject }) {
  return (
    <div hidden>
      <h1>{SUBJECT_TITLE[subject]}</h1>
      <p>{SUBJECT_INTRO[subject]}</p>
      <h2>Chapters</h2>
      <p>CBSE Class 10, 2026–27 syllabus</p>
      <ol>
        {SYLLABUS[subject].map((c) => (
          <li key={c.title}>
            <h3>{c.number ? `Chapter ${c.number}: ` : ''}{c.title}</h3>
            {c.formativeOnly && <p>Formative only: not in the year-end exam</p>}
          </li>
        ))}
      </ol>
      <p>
        Ask the <Link href="/tutor">AI tutor</Link> about any chapter, or practise it in{' '}
        <Link href="/learning">My Learning</Link>. Other subjects:{' '}
        {(Object.keys(SUBJECT_TITLE) as Subject[]).filter((s) => s !== subject).map((s, i) => (
          <span key={s}>{i > 0 && ' and '}<Link href={`/${s}`}>{SUBJECT_TITLE[s]}</Link></span>
        ))}.
      </p>
    </div>
  );
}
