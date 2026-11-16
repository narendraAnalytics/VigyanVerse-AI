'use client';

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { insforge } from '@/lib/insforge';
import type { ConsentType } from '@/lib/api';
import { Bindu, Speech } from '@/components/mascot/Bindu';

const THIS_YEAR = new Date().getFullYear();
const BIRTH_YEARS = Array.from({ length: 10 }, (_, i) => THIS_YEAR - 11 - i);

export const CONSENT_TEXT: Record<ConsentType, { title: string; body: string }> = {
  platform_use: { title: 'Use VigyanVerse', body: 'Keep an account with a first name, class, board and birth year.' },
  ai_tutoring: { title: 'AI tutor and quizzes', body: 'Questions and quiz answers are sent to the AI service to explain and give feedback.' },
  document_upload: { title: 'Photo uploads', body: 'Photos of notes or textbook pages are stored privately and read by the AI. Parents never see them.' },
  voice_recording: { title: 'Voice questions', body: 'A spoken question is turned into text by the speech service. The recording is not stored.' },
  pilot_research: { title: 'Research pilot (optional)', body: 'Anonymous learning results may be used to check whether the platform helps students learn.' },
};

// ---------------------------------------------------------------------------
// Left page: "This book belongs to"
// ---------------------------------------------------------------------------
export function BookplateLeft() {
  const auth = useAuth();
  const router = useRouter();
  const role = 'student' as const;
  const [name, setName] = useState('');
  const [birthYear, setBirthYear] = useState<number | ''>('');
  // English only for now (owner 2026-11-16); Telugu comes back later.
  const lang = 'en' as const;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const nameId = useId();
  const yearId = useId();

  useEffect(() => {
    if (auth.profile) {
      setName(auth.profile.display_name);
    } else {
      try {
        const stored = JSON.parse(sessionStorage.getItem('vv-signup-role') ?? 'null') as { name?: string } | null;
        if (stored?.name) setName(stored.name);
      } catch { /* ignore */ }
      if (auth.user?.name) setName((n) => n || auth.user!.name!);
    }
    if (auth.student?.birth_year) setBirthYear(auth.student.birth_year);
  }, [auth.profile, auth.student, auth.user]);

  if (auth.loading) return <p className="text-ink-faint">Opening your book…</p>;
  if (!auth.user) {
    return (
      <div>
        <h1 data-page-heading tabIndex={-1} className="font-display text-4xl outline-none">Your bookplate</h1>
        <p className="mt-3 text-ink-soft">Sign in first, then write your name in your book.</p>
        <Link href="/sign-in" className="ink-button mt-5">Sign in</Link>
      </div>
    );
  }

  const isParent = auth.profile?.role === 'parent';
  // A bookplate already saved: the button is "Saved" (disabled) until the name or year changes, then "Update".
  const exists = isParent ? !!auth.profile : !!auth.student?.onboarding_completed_at;
  const changed = !exists
    || name.trim() !== (auth.profile?.display_name ?? '')
    || (!isParent && (birthYear || null) !== (auth.student?.birth_year ?? null));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Write your first name on the line above, then save.');
      document.getElementById(nameId)?.focus();
      return;
    }
    setBusy(true); setError(null); setSaved(false);
    const db = insforge().database;
    try {
      const userId = auth.user!.id;
      if (!auth.profile) {
        const p = await db.from('profiles').insert([{ id: userId, role, display_name: name.trim(), preferred_language: lang }]);
        if (p.error) throw new Error('Could not save your name. Try again.');
      } else {
        const p = await db.from('profiles').update({ display_name: name.trim(), preferred_language: lang }).eq('id', userId);
        if (p.error) throw new Error('Could not save your name. Try again.');
      }
      if (!isParent) {
        const row = { board_code: 'CBSE', grade: 10, birth_year: birthYear || null };
        const s = auth.student
          ? await db.from('students').update({ ...row, onboarding_completed_at: auth.student.onboarding_completed_at ?? new Date().toISOString() }).eq('profile_id', userId)
          : await db.from('students').insert([{ profile_id: userId, ...row }]);
        if (s.error) throw new Error('Could not save your class details. Try again.');
        if (!auth.student) {
          const done = await db.from('students').update({ onboarding_completed_at: new Date().toISOString() }).eq('profile_id', userId);
          if (done.error) throw new Error('Could not finish your bookplate. Try again.');
        }
      }
      await auth.refresh();
      setSaved(true);
      if (isParent) router.push('/parent');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 data-page-heading tabIndex={-1} className="sr-only outline-none">Your bookplate</h1>
      <form onSubmit={save} className="deco-frame relative mx-auto mt-2 max-w-md bg-[#f7efdc] px-6 pb-7 pt-6 text-center">
        <p className="font-display text-sm italic text-gold-deep">Ex libris</p>
        <p className="mt-1 font-display text-3xl">This book belongs to</p>
        <label htmlFor={nameId} className="sr-only">First name</label>
        <input id={nameId} className="field font-hand mt-4 text-center text-3xl" placeholder="your first name" maxLength={60} value={name} onChange={(e) => { setName(e.target.value); setError(null); }} />
        {!isParent && (
          <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-left text-sm">
            <div>
              <span className="text-ink-faint">Class</span>
              <p className="font-hand text-xl">10</p>
            </div>
            <div>
              <span className="text-ink-faint">Board</span>
              <p className="font-hand text-xl">CBSE</p>
            </div>
            <div>
              <label htmlFor={yearId} className="text-ink-faint">Birth year</label>
              <select id={yearId} className="field font-hand !py-0.5 text-xl" value={birthYear} onChange={(e) => setBirthYear(e.target.value ? Number(e.target.value) : '')}>
                <option value="">Choose</option>
                {BIRTH_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <span className="text-ink-faint">Answers in</span>
              <p className="font-hand text-xl">English</p>
            </div>
          </div>
        )}
        {!isParent && <p className="mt-4 text-left text-xs text-ink-faint">Andhra Pradesh SSC chapters will be added from the official syllabus. Until then the book follows CBSE.</p>}
        {error && <p role="alert" className="mt-3 text-sm text-pencil">{error}</p>}
        <button className="ink-button mt-5" disabled={busy || !changed}>
          {busy ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : !changed ? <Check aria-hidden className="h-4 w-4" /> : null}
          {busy ? 'Saving…' : !changed ? 'Saved' : exists ? 'Update my bookplate' : 'Save my bookplate'}
        </button>
        {saved && !changed && <p role="status" className="mt-2 text-sm text-emerald">Your bookplate is saved.</p>}
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Right page: what happens next
// ---------------------------------------------------------------------------
export function BookplateRight() {
  const auth = useAuth();
  const done = !!auth.student?.onboarding_completed_at;
  return (
    <div className="pl-10">
      <h2 className="font-display text-3xl">{done ? 'You are all set' : 'Almost there'}</h2>
      <p className="mt-2 max-w-[44ch] text-ink-soft">
        {done
          ? 'Your account is ready. Everything in the book is open to you.'
          : 'Fill in your bookplate on the left page and save it. Then the tutor, quizzes, photo notes and voice questions are all open to you.'}
      </p>
      <ul className="mt-5 space-y-2 text-[0.95rem] text-ink-soft">
        {[
          'Ask the AI Tutor by typing or speaking.',
          'Upload a photo of your notes and ask questions about it.',
          'Take a practice quiz on any chapter and see your mastery grow.',
        ].map((t) => (
          <li key={t} className="flex gap-2"><span aria-hidden className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rotate-45 bg-gold" />{t}</li>
        ))}
      </ul>
      {done && (
        <div className="mt-8 flex items-end gap-3">
          <Bindu size={64} mood="cheer" />
          <Speech className="mb-4 max-w-[30ch]">Let’s begin. <Link href="/physics" className="underline">Open a chapter</Link> or <Link href="/tutor" className="underline">ask me a question</Link>.</Speech>
        </div>
      )}
    </div>
  );
}