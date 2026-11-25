import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'AI Tutor', description: 'Ask Class 10 Science questions by typing or speaking.', robots: { index: false, follow: true } };

// The book (src/components/book/BookShell.tsx) draws this page from the URL.
export default function Page() {
  return null;
}
