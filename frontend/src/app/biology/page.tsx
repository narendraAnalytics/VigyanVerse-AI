import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Biology', description: 'Life processes, control and coordination, reproduction, heredity and our environment.', alternates: { canonical: '/biology' } };

// The book (src/components/book/BookShell.tsx) draws this page from the URL.
export default function Page() {
  return null;
}
