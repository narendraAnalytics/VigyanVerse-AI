import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = { description: 'Class 10 Science with an AI tutor that answers from your NCERT textbook.', alternates: { canonical: '/' } };

// Tells Google the site's name ("VigyanVerse AI") for the search result header.
const WEBSITE_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'VigyanVerse AI',
  alternateName: 'VigyanVerse',
  url: `${SITE_URL}/`,
};

// The book (src/components/book/BookShell.tsx) draws this page from the URL.
export default function Page() {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_JSON_LD) }} />;
}
