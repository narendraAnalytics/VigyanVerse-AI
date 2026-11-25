import type { Metadata } from 'next';
import { SubjectPlainCopy } from '@/components/seo/PlainCopy';

export const metadata: Metadata = {
  title: 'Class 10 Biology: Life Processes to Our Environment',
  description: 'CBSE Class 10 Biology, NCERT chapters 5 to 8 and 13: Life Processes, Control and Coordination, How do Organisms Reproduce?, Heredity, and Our Environment.',
  alternates: { canonical: '/biology' },
};

// The book (src/components/book/BookShell.tsx) draws this page from the URL; the plain copy
// below is the same text in the server HTML.
export default function Page() {
  return <SubjectPlainCopy subject="biology" />;
}
