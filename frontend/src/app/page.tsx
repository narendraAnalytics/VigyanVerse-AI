import type { Metadata } from 'next';
import { HomePlainCopy } from '@/components/seo/PlainCopy';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: { absolute: 'VigyanVerse AI: CBSE Class 10 Science AI Tutor (NCERT)' },
  description:
    'CBSE Class 10 Science AI tutor: short answers from your NCERT textbook with page references, hints, and Physics, Chemistry and Biology practice quizzes.',
  alternates: { canonical: '/' },
};

// Tells Google the site's name ("VigyanVerse AI") for the result header, and the logo it may show.
// Legal name, email and address details stay on About / Contact (Razorpay checks those pages).
const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: 'VigyanVerse AI',
      alternateName: 'VigyanVerse',
      url: `${SITE_URL}/`,
      inLanguage: 'en-IN',
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
    {
      '@type': 'EducationalOrganization',
      '@id': `${SITE_URL}/#organization`,
      name: 'VigyanVerse AI',
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/logo.png`,
      email: 'admin@vigyanverseai.live',
    },
  ],
};

// The book (src/components/book/BookShell.tsx) draws this page from the URL; the plain copy
// below is the same text in the server HTML. The JSON-LD is built from constants only.
export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <HomePlainCopy />
    </>
  );
}
