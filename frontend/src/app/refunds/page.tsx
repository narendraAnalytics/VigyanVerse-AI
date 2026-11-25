import type { Metadata } from 'next';
import { policyById } from '@/lib/policies';
import { PolicyPlainCopy } from '@/components/policy/PolicyPlainCopy';

const doc = policyById('refunds');
export const metadata: Metadata = { title: doc.title, description: doc.summary, alternates: { canonical: '/refunds' } };

// The book (src/components/book/BookShell.tsx) draws this page from the URL; the plain copy
// below is the same text in the server HTML.
export default function Page() {
  return <PolicyPlainCopy id="refunds" />;
}
