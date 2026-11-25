import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'My Learning', description: 'Practice quizzes, chapter mastery and your revision timetable.', robots: { index: false, follow: true } };

// The book (src/components/book/BookShell.tsx) draws this page from the URL.
export default function Page() {
  return null;
}
