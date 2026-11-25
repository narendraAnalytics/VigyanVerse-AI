import type { Metadata } from 'next';
import { SubjectPlainCopy } from '@/components/seo/PlainCopy';

export const metadata: Metadata = {
  title: 'Class 10 Physics: Light, Electricity and Magnetism',
  description: 'CBSE Class 10 Physics, NCERT chapters 9 to 12: Light – Reflection and Refraction, The Human Eye and the Colourful World, Electricity, Magnetic Effects of Current.',
  alternates: { canonical: '/physics' },
};

// The book (src/components/book/BookShell.tsx) draws this page from the URL; the plain copy
// below is the same text in the server HTML.
export default function Page() {
  return <SubjectPlainCopy subject="physics" />;
}
