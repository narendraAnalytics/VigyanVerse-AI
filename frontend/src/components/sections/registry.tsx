'use client';

import type { ReactNode } from 'react';
import type { SectionId } from '@/lib/sections';
import { PageFrame } from '@/components/book/page-context';
import { HomeLeft, HomeRight } from './Home';
import { SubjectLeft, SubjectRight } from './Subject';
import { ImageBackdrop, TutorLeft, TutorRight, TutorRightHead } from './Tutor';
import { LearningLeft, LearningRight } from './Learning';
import { AccountArt, SignInForm, SignUpForm, ResetForm } from './Account';
import { BookplateLeft, BookplateRight } from './Onboarding';
import { ParentLeft, ParentRight } from './Parent';
import { WalletLeft, WalletRight } from '@/components/wallet/Wallet';
import { PolicyIndex, PolicyPage } from './Policies';
import type { PolicyId } from '@/lib/policies';

interface FrameOpts { ruled?: boolean; margin?: boolean; runningHead?: ReactNode; folio?: ReactNode; className?: string; backdrop?: ReactNode }
interface Spread {
  left: () => ReactNode;
  right: () => ReactNode;
  leftFrame?: FrameOpts;
  rightFrame?: FrameOpts;
  /** On one-page screens, show the right-hand page first (forms, chat). */
  rightFirst?: boolean;
}

const head = (l: string, r: string) => (<><span>{l}</span><span>{r}</span></>);

/** Back matter: the policy index on the left, the policy itself on the right (first on phones). */
const policy = (id: PolicyId, title: string): Spread => ({
  left: () => <PolicyIndex current={id} />, right: () => <PolicyPage id={id} />,
  leftFrame: { runningHead: head('Back matter', 'The fine print'), ruled: true },
  rightFrame: { runningHead: head('The fine print', title), ruled: true, margin: true },
  rightFirst: true,
});

const SPREADS: Record<SectionId, Spread> = {
  home: {
    left: () => <HomeLeft />, right: () => <HomeRight />,
    leftFrame: { runningHead: head('VigyanVerse AI', 'Frontispiece'), ruled: true, margin: true, className: 'flex flex-col' },
    rightFrame: { runningHead: head('Contents', 'Class 10 Science'), ruled: true, margin: true, folio: 'i' },
  },
  physics: {
    left: () => <SubjectLeft subject="physics" />, right: () => <SubjectRight subject="physics" />,
    leftFrame: { runningHead: head('Part I', 'Physics'), folio: '1' },
    rightFrame: { runningHead: head('Physics', 'Chapters 9 to 12'), ruled: true, margin: true, folio: '2' },
  },
  chemistry: {
    left: () => <SubjectLeft subject="chemistry" />, right: () => <SubjectRight subject="chemistry" />,
    leftFrame: { runningHead: head('Part II', 'Chemistry'), folio: '3' },
    rightFrame: { runningHead: head('Chemistry', 'Chapters 1 to 4'), ruled: true, margin: true, folio: '4' },
  },
  biology: {
    left: () => <SubjectLeft subject="biology" />, right: () => <SubjectRight subject="biology" />,
    leftFrame: { runningHead: head('Part III', 'Biology'), folio: '5' },
    rightFrame: { runningHead: head('Biology', 'Chapters 5 to 8 and 13'), ruled: true, margin: true, folio: '6' },
  },
  tutor: {
    left: () => <TutorLeft />, right: () => <TutorRight />,
    leftFrame: { runningHead: head('Part IV', 'The tutor’s desk') },
    rightFrame: { runningHead: <TutorRightHead />, backdrop: <ImageBackdrop />, className: 'flex flex-col !pb-3' },
    rightFirst: true,
  },
  learning: {
    left: () => <LearningLeft />, right: () => <LearningRight />,
    leftFrame: { runningHead: head('Part V', 'My Learning'), ruled: true },
    rightFrame: { runningHead: head('Progress', 'Chapter by chapter'), ruled: true, margin: true },
  },
  'sign-in': {
    left: () => <AccountArt kind="sign-in" />, right: () => <SignInForm />,
    rightFrame: { runningHead: head('Library card', 'Sign in'), ruled: true, margin: true }, rightFirst: true,
  },
  'sign-up': {
    left: () => <AccountArt kind="sign-up" />, right: () => <SignUpForm />,
    rightFrame: { runningHead: head('Library card', 'New account'), ruled: true, margin: true }, rightFirst: true,
  },
  'reset-password': {
    left: () => <AccountArt kind="reset" />, right: () => <ResetForm />,
    rightFrame: { runningHead: head('Library card', 'New password'), ruled: true, margin: true }, rightFirst: true,
  },
  onboarding: {
    left: () => <BookplateLeft />, right: () => <BookplateRight />,
    leftFrame: { runningHead: head('Ex libris', 'Bookplate') },
    rightFrame: { runningHead: head('Getting started', 'Your account'), ruled: true, margin: true },
  },
  wallet: {
    left: () => <WalletLeft />, right: () => <WalletRight />,
    leftFrame: { runningHead: head('Back matter', 'Your credits'), ruled: true },
    rightFrame: { runningHead: head('Your credits', 'Top up'), ruled: true, margin: true },
  },
  about: policy('about', 'About us'),
  contact: policy('contact', 'Contact us'),
  pricing: policy('pricing', 'Pricing'),
  terms: policy('terms', 'Terms'),
  privacy: policy('privacy', 'Privacy'),
  refunds: policy('refunds', 'Refunds'),
  parent: {
    left: () => <ParentLeft />, right: () => <ParentRight />,
    leftFrame: { runningHead: head('For parents', 'Permission slip') },
    rightFrame: { runningHead: head('Permission slip', 'Your decisions'), ruled: true, margin: true }, rightFirst: true,
  },
};

export function SectionPage({ id, side }: { id: SectionId; side: 'left' | 'right' | 'single' }) {
  const s = SPREADS[id];
  if (side === 'left') return <PageFrame side="left" scrollKey={`${id}-left`} {...s.leftFrame}>{s.left()}</PageFrame>;
  if (side === 'right') return <PageFrame side="right" scrollKey={`${id}-right`} {...s.rightFrame}>{s.right()}</PageFrame>;
  const first = s.rightFirst ? s.right() : s.left();
  const second = s.rightFirst ? s.left() : s.right();
  return (
    <PageFrame
      side="single"
      scrollKey={`${id}-single`}
      ruled={!!(s.leftFrame?.ruled || s.rightFrame?.ruled)}
      runningHead={(s.rightFirst ? s.rightFrame : s.leftFrame)?.runningHead}
    >
      <div className="flex flex-col">{first}</div>
      <div aria-hidden className="deco-rule my-8" />
      <div className="flex flex-col">{second}</div>
    </PageFrame>
  );
}
