import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Chemistry', description: 'Chemical reactions, acids and bases, metals and carbon compounds: CBSE Class 10 chapters 1 to 4.', alternates: { canonical: '/chemistry' } };

// The book (src/components/book/BookShell.tsx) draws this page from the URL.
export default function Page() {
  return null;
}
