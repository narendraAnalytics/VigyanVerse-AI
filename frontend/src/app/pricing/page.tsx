import type { Metadata } from 'next';
import { policyById } from '@/lib/policies';
import { PolicyPlainCopy } from '@/components/policy/PolicyPlainCopy';

const doc = policyById('pricing');
export const metadata: Metadata = {
  title: doc.title,
  description: 'VigyanVerse AI prices in rupees: top-up packs from ₹10 and no subscription. An AI tutor answer costs ₹0.50 and a 5-question practice quiz ₹2.',
  alternates: { canonical: '/pricing' },
};

// The book (src/components/book/BookShell.tsx) draws this page from the URL; the plain copy
// below is the same text in the server HTML.
export default function Page() {
  return <PolicyPlainCopy id="pricing" />;
}
