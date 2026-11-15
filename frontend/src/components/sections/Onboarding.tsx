'use client';

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useConsent } from '@/lib/consent';
import { insforge } from '@/lib/insforge';
import { rpc, type ConsentType } from '@/lib/api';
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
  const [role, setRole] = useState<'student' | 'parent'>('student');
  const [name, setName] = useState('');
  const [birthYear, setBirthYear] = useState<number | ''>('');
  const [lang, setLang] = useState<'en' | 'te'>('en');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const nameId = useId();
  const yearId = useId();

  useEffect(() => {
    if (auth.profile) {
      setName(auth.profile.display_name); setLang(auth.profile.preferred_language);
      if (auth.profile.role === 'parent') setRole('parent');
    } else {
      try {
        const stored = JSON.parse(sessionStorage.getItem('vv-signup-role') ?? 'null') as { role?: 'student' | 'parent'; name?: string } | null;
        if (stored?.role) setRole(stored.role);
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

  const isParent = auth.profile?.role === 'parent' || (!auth.profile && role === 'parent');

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
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
        {!auth.profile && (
          <fieldset className="mt-4">
            <legend className="sr-only">Account type</legend>
            <div className="flex justify-center gap-2">
              {(['student', 'parent'] as const).map((r) => (
                <label key={r} className={`cursor-pointer rounded-full border px-4 py-1 text-sm ${role === r ? 'border-emerald bg-emerald text-paper' : 'border-ink/30'}`}>
                  <input type="radio" className="sr-only" name="bp-role" checked={role === r} onChange={() => setRole(r)} />
                  {r === 'student' ? 'I am a student' : 'I am a parent'}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <label htmlFor={nameId} className="sr-only">First name</label>
        <input id={nameId} className="field font-hand mt-4 text-center text-3xl" placeholder="your first name" maxLength={60} required value={name} onChange={(e) => setName(e.target.value)} />
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
            <fieldset>
              <legend className="text-ink-faint">Answers in</legend>
              <div className="mt-1 flex gap-2">
                {(['en', 'te'] as const).map((l) => (
                  <label key={l} className={`cursor-pointer rounded-full border px-2.5 py-0.5 ${lang === l ? 'border-emerald bg-emerald text-paper' : 'border-ink/30'}`}>
                    <input type="radio" className="sr-only" name="bp-lang" checked={lang === l} onChange={() => setLang(l)} />
                    {l === 'en' ? 'English' : <span lang="te">తెలుగు</span>}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        )}
        {!isParent && <p className="mt-4 text-left text-xs text-ink-faint">Andhra Pradesh SSC chapters will be added from the official syllabus. Until then the book follows CBSE.</p>}
        {error && <p role="alert" className="mt-3 text-sm text-pencil">{error}</p>}
        <button className="ink-button mt-5" disabled={busy || !name.trim()}>
          {busy ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : saved ? <Check aria-hidden className="h-4 w-4" /> : null}
          {saved ? 'Saved' : 'Save my bookplate'}
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Right page: invite a parent, and what they have allowed
// ---------------------------------------------------------------------------
export function BookplateRight() {
  const auth = useAuth();
  const { consent, loaded, reload } = useConsent();
  const [invite, setInvite] = useState<{ code: string; expires: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [linked, setLinked] = useState<number | null>(null);

  const ready = !!auth.user && auth.profile?.role === 'student' && !!auth.student;

  useEffect(() => {
    if (!ready) return;
    void insforge().database.from('parent_student_links').select('id').eq('status', 'active').limit(5)
      .then(({ data }) => setLinked(((data as unknown[] | null) ?? []).length));
  }, [ready]);

  if (!ready) {
    return (
      <div className="pl-10">
        <h2 className="font-display text-3xl">Invite a parent</h2>
        <p className="mt-3 text-ink-soft">
          {auth.profile?.role === 'parent' ? 'This page is for students. Parents use the permission slip.' : 'Save your bookplate first. Then you can make a code for a parent.'}
        </p>
        {auth.profile?.role === 'parent' && <Link href="/parent" className="ink-button mt-5">Open the permission slip</Link>}
      </div>
    );
  }

  const makeCode = async () => {
    setBusy(true); setError(null); setCopied(false);
    try {
      type Row = { invite_code: string; invite_expires_at: string };
      const rows = await rpc<Row[] | Row>('create_parent_invite');
      const r = Array.isArray(rows) ? rows[0] : rows;
      if (!r) throw new Error();
      setInvite({ code: r.invite_code, expires: r.invite_expires_at });
    } catch {
      setError('Could not make a code. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pl-10">
      <h2 className="font-display text-3xl">Invite a parent</h2>
      <p className="mt-2 text-ink-soft">The AI tutor, quizzes, photo uploads and voice questions switch on only when a parent or guardian allows them. Give them a code:</p>
      <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-[0.95rem] text-ink-soft">
        <li>Make a code below. It works once, for 48 hours.</li>
        <li>Your parent creates a parent account on VigyanVerse.</li>
        <li>They enter the code on their permission slip and choose what to allow.</li>
      </ol>

      <div className="mt-6">
        {invite ? (
          <div className="deco-frame inline-block bg-[#f7efdc] px-6 py-4">
            <p className="text-xs text-ink-faint">Your parent code</p>
            <p className="font-display text-3xl tracking-[0.12em] tabular-nums">{invite.code}</p>
            <p className="text-xs text-ink-faint">Works until {new Date(invite.expires).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</p>
            <button type="button" className="mt-2 flex items-center gap-1 text-sm text-emerald" onClick={async () => { await navigator.clipboard.writeText(invite.code).catch(() => {}); setCopied(true); }}>
              {copied ? <Check aria-hidden className="h-4 w-4" /> : <Copy aria-hidden className="h-4 w-4" />} {copied ? 'Copied' : 'Copy code'}
            </button>
          </div>
        ) : (
          <button type="button" className="ink-button" onClick={makeCode} disabled={busy}>
            {busy && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />} Make a parent code
          </button>
        )}
        {error && <p role="alert" className="mt-2 text-sm text-pencil">{error}</p>}
      </div>

      <section aria-labelledby="allowed-h" className="mt-9">
        <div className="flex items-center justify-between">
          <h3 id="allowed-h" className="font-display text-xl">What is allowed now</h3>
          <button type="button" onClick={() => void reload()} className="flex items-center gap-1 text-sm text-ink-soft hover:text-emerald"><RefreshCw aria-hidden className="h-3.5 w-3.5" /> Check again</button>
        </div>
        {linked === 0 && <p className="font-hand mt-1 text-lg text-pencil">No parent is linked yet.</p>}
        <ul className="mt-3 space-y-2">
          {(Object.keys(CONSENT_TEXT) as ConsentType[]).map((t) => (
            <li key={t} className="flex items-baseline gap-2 text-[0.95rem]">
              <span className={`h-2.5 w-2.5 shrink-0 rotate-45 ${consent[t] ? 'bg-emerald' : 'border border-ink/40'}`} aria-hidden />
              <span className="flex-1">{CONSENT_TEXT[t].title}</span>
              <span className={consent[t] ? 'text-emerald' : 'text-ink-faint'}>{!loaded ? '…' : consent[t] ? 'Allowed' : 'Not yet'}</span>
            </li>
          ))}
        </ul>
      </section>
      {auth.student?.onboarding_completed_at && (
        <div className="mt-9 flex items-end gap-3">
          <Bindu size={60} mood="cheer" />
          <Speech className="mb-4 max-w-[30ch]">Your bookplate is done. <Link href="/physics" className="underline">Open a chapter</Link> while you wait.</Speech>
        </div>
      )}
    </div>
  );
}
