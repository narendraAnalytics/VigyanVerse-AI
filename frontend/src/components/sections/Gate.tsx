'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useAuth, nextSetupStep } from '@/lib/auth';
import { useConsent } from '@/lib/consent';
import { Bindu, Speech } from '@/components/mascot/Bindu';
import type { ConsentType } from '@/lib/api';

/**
 * Shows its children only to a student who is set up and whose parent allowed `needs`.
 * Otherwise it explains the next step. The server enforces all of this again.
 */
export function StudentGate({ needs, children, what, quiet = false }: { needs?: ConsentType; children: ReactNode; what: string; /** Show nothing instead of a notice (the other page already shows it). */ quiet?: boolean }) {
  const auth = useAuth();
  const { consent, loaded } = useConsent();
  const ready = !auth.loading && nextSetupStep(auth) === null && !(needs && loaded && !consent[needs]);
  if (quiet && !ready) return null;

  if (auth.loading) return <p className="text-ink-faint">Opening your book…</p>;
  const step = nextSetupStep(auth);
  if (step === '/sign-in') {
    return (
      <Notice mood="happy" text={`Sign in to use ${what}.`}>
        <Link href="/sign-in" className="ink-button">Sign in</Link>
        <Link href="/sign-up" className="ghost-button">Create an account</Link>
      </Notice>
    );
  }
  if (auth.profile?.role === 'parent') {
    return (
      <Notice mood="thinking" text={`${what[0].toUpperCase()}${what.slice(1)} is for student accounts. As a parent you can manage permissions on the permission slip.`}>
        <Link href="/parent" className="ink-button">Open the permission slip</Link>
      </Notice>
    );
  }
  if (step === '/onboarding') {
    return (
      <Notice mood="happy" text="First, fill in your bookplate so I know your class and board.">
        <Link href="/onboarding" className="ink-button">Fill in my bookplate</Link>
      </Notice>
    );
  }
  if (needs && loaded && !consent[needs]) {
    return (
      <Notice mood="thinking" text={`A parent needs to give permission before you can use ${what}. Send them your invite code from your bookplate page.`}>
        <Link href="/onboarding" className="ink-button">Get my invite code</Link>
      </Notice>
    );
  }
  return <>{children}</>;
}

function Notice({ text, mood, children }: { text: string; mood: 'happy' | 'thinking'; children: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-4 py-6">
      <div className="flex items-end gap-3">
        <Bindu size={72} mood={mood} />
        <Speech className="mb-5 max-w-[34ch]">{text}</Speech>
      </div>
      <div className="flex flex-wrap gap-3">{children}</div>
    </div>
  );
}
