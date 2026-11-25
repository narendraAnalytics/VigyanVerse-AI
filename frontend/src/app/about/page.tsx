import type { Metadata } from 'next';
import { policyById } from '@/lib/policies';
import { PolicyPlainCopy } from '@/components/policy/PolicyPlainCopy';

const doc = policyById('about');
export const metadata: Metadata = {
  title: doc.title,
  description: 'About VigyanVerse AI, a learning site for CBSE Class 10 Science (Physics, Chemistry and Biology) whose AI tutor answers from the NCERT textbook, and who runs it.',
  alternates: { canonical: '/about' },
};

// The book (src/components/book/BookShell.tsx) draws this page from the URL; the plain copy
// below is the same text in the server HTML.
export default function Page() {
  return <PolicyPlainCopy id="about" />;
}
