import type { Metadata } from 'next';
import { SubjectPlainCopy } from '@/components/seo/PlainCopy';

export const metadata: Metadata = {
  title: 'Class 10 Chemistry: Reactions, Acids, Metals and Carbon',
  description: 'CBSE Class 10 Chemistry, NCERT chapters 1 to 4: Chemical Reactions and Equations; Acids, Bases and Salts; Metals and Non-metals; Carbon and its Compounds.',
  alternates: { canonical: '/chemistry' },
};

// The book (src/components/book/BookShell.tsx) draws this page from the URL; the plain copy
// below is the same text in the server HTML.
export default function Page() {
  return <SubjectPlainCopy subject="chemistry" />;
}
