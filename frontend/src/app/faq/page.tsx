import type { Metadata } from 'next';
import { PolicyPlainCopy } from '@/components/policy/PolicyPlainCopy';

export const metadata: Metadata = {
  title: 'FAQ: AI Tutor, Credits and Quizzes',
  description: 'Answers to common questions about VigyanVerse AI: how the Class 10 Science AI tutor works, credits and payments, quizzes, photos, voice and your data.',
  alternates: { canonical: '/faq' },
};

// The book (src/components/book/BookShell.tsx) draws this page from the URL; the plain copy
// below is the same text in the server HTML.
export default function Page() {
  return <PolicyPlainCopy id="faq" />;
}
