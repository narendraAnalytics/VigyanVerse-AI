import type { Metadata } from 'next';
import { STORY } from '@/lib/story';
import { StoryPlainCopy } from '@/components/story/StoryDocument';

export const metadata: Metadata = { title: STORY.title, description: STORY.summary, alternates: { canonical: '/story' } };

// The book (src/components/book/BookShell.tsx) draws this page from the URL; the plain copy
// below is the same text in the server HTML.
export default function Page() {
  return <StoryPlainCopy />;
}
