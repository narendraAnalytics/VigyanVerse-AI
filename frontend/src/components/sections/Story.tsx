'use client';

// "Our Story" in the book (after Biology). Text and layout: components/story/StoryDocument.tsx.
import Link from 'next/link';
import { StoryIdea, StoryNext } from '@/components/story/StoryDocument';
import { Bindu, Speech } from '@/components/mascot/Bindu';

export function StoryLeft() {
  return <StoryIdea bookHeading />;
}

export function StoryRight() {
  return (
    <div>
      <StoryNext />
      <div className="mt-8 flex items-end gap-3 pl-10">
        <Bindu size={56} />
        <Speech className="mb-4 max-w-[30ch]">
          Got an idea for us? Write to us from the <Link href="/contact" className="underline decoration-wavy underline-offset-4">Contact</Link> page. We read every message!
        </Speech>
      </div>
    </div>
  );
}
