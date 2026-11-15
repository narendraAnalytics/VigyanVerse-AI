'use client';

import Link from 'next/link';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { authPost, useAuth } from '@/lib/auth';
import { insforge } from '@/lib/insforge';
import { Bindu, Speech } from '@/components/mascot/Bindu';
import { Cover } from '@/components/book/Cover';

const ROLE_KEY = 'vv-signup-role';

// ---------------------------------------------------------------------------
// Left page art for the account pages
// ---------------------------------------------------------------------------
export function AccountArt({ kind }: { kind: 'sign-in' | 'sign-up' | 'reset' }) {
  const line = {
    'sign-in': 'Welcome back. Your chats, notes and progress are waiting.',
    'sign-up': 'One account is all you need. Your chats, notes and progress stay private to you.',
    reset: 'It happens. We will email you a 6-digit code.',
  }[kind];
  return (
    <div className="flex h-full min-h-[28rem] flex-col">
      <div className="relative mx-auto mt-2 aspect-[3/4] w-[min(100%,300px,32vh)] overflow-hidden rounded-sm shadow-[6px_8px_0_rgba(34,30,23,.12)]">
        <Cover />
      </div>
      <div className="mt-auto flex items-end gap-3 pt-6">
        <Bindu size={70} />
        <Speech className="mb-5 max-w-[32ch]">{line}</Speech>
      </div>
      <p className="mt-3 text-sm text-ink-faint">Your account keeps your chats, notes and uploaded photos private to you.</p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-md pl-10">
      <h1 data-page-heading tabIndex={-1} className="font-display text-4xl outline-none">{title}</h1>
      <div aria-hidden className="deco-rule mt-3" />
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Field({ label, hint, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const id = useId();
  return (
    <div className="mb-5">
      <label htmlFor={id} className="block text-sm font-semibold text-ink-soft">{label}</label>
      <input id={id} className="field text-lg" aria-describedby={hint ? `${id}-h` : undefined} {...props} />
      {hint && <p id={`${id}-h`} className="mt-1 text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

function ErrorText({ children }: { children: ReactNode }) {
  return children ? <p role="alert" className="mb-4 text-sm text-pencil">{children}</p> : null;
}

function OAuthButtons() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const go = async (provider: 'google' | 'github') => {
    setBusy(provider); setError(null);
    try {
      const { url } = await authPost<{ url: string }>('oauth', { provider });
      window.location.assign(url);
    } catch (e) {
      setError((e as Error).message); setBusy(null);
    }
  };
  return (
    <div className="mt-6">
      <div className="flex items-center gap-3 text-xs text-ink-faint"><span className="h-px flex-1 bg-ink/15" />or<span className="h-px flex-1 bg-ink/15" /></div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {(['google', 'github'] as const).map((p) => (
          <button key={p} type="button" onClick={() => go(p)} disabled={!!busy} className="ghost-button justify-center">
            {busy === p && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
            {p === 'google' ? 'Google' : 'GitHub'}
          </button>
        ))}
      </div>
      <ErrorText>{error}</ErrorText>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sign in
// ---------------------------------------------------------------------------
export function SignInForm() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [needsCode, setNeedsCode] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('insforge_status') === 'success') setNotice('Email verified. Sign in with your email and password.');
    if (q.get('error')) setError('Signing in with that provider did not work. Try again or use your email.');
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await authPost('sign-in', { email, password });
      await refresh();
      // A new account has no bookplate yet: go there first, otherwise to the book.
      const { data } = await insforge().database.from('students').select('onboarding_completed_at').limit(1);
      const done = (data as { onboarding_completed_at: string | null }[] | null)?.[0]?.onboarding_completed_at;
      router.push(done ? '/learning' : '/onboarding');
    } catch (err) {
      const e2 = err as Error & { code?: string };
      if (e2.code === 'EMAIL_NOT_VERIFIED') setNeedsCode(true);
      setError(e2.message);
    } finally {
      setBusy(false);
    }
  };

  if (needsCode) return <Card title="Check your email"><VerifyCode email={email} onDone={async () => { await refresh(); router.push('/onboarding'); }} /></Card>;

  return (
    <Card title="Sign in">
      {notice && <p className="mb-4 text-sm text-emerald">{notice}</p>}
      <form onSubmit={submit} noValidate>
        <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <ErrorText>{error}</ErrorText>
        <div className="flex flex-wrap items-center gap-4">
          <button className="ink-button" disabled={busy || !email || !password}>{busy && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />} Sign in</button>
          <Link href="/reset-password" className="text-sm text-ink-soft underline decoration-gold underline-offset-4">Forgot your password?</Link>
        </div>
      </form>
      <OAuthButtons />
      <p className="mt-8 text-sm text-ink-soft">New here? <Link href="/sign-up" className="font-semibold text-emerald underline underline-offset-4">Create an account</Link></p>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Sign up (student or parent) -> 6-digit email code -> profile row
// ---------------------------------------------------------------------------
export function SignUpForm() {
  const router = useRouter();
  const { refresh } = useAuth();
  const role = 'student' as const;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<'form' | 'code'>('form');

  const passwordOk = password.length >= 8 && /\d/.test(password);

  const finish = async () => {
    // The profile row: role and display name. Students then fill in their bookplate.
    const { data } = await insforge().auth.getCurrentUser();
    if (data?.user) {
      await insforge().database.from('profiles').insert([{ id: data.user.id, role, display_name: name.trim(), preferred_language: 'en' }]);
    }
    try { sessionStorage.removeItem(ROLE_KEY); } catch { /* ignore */ }
    await refresh();
    router.push('/onboarding');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const r = await authPost<{ requireEmailVerification: boolean }>('sign-up', { email, password, name: name.trim() });
      try { sessionStorage.setItem(ROLE_KEY, JSON.stringify({ role, name: name.trim() })); } catch { /* ignore */ }
      if (r.requireEmailVerification) setStage('code');
      else await finish();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (stage === 'code') return <Card title="Check your email"><VerifyCode email={email} onDone={finish} /></Card>;

  return (
    <Card title="Create an account">
      <form onSubmit={submit} noValidate>
        <Field label="Your first name" hint="Only your first name. We do not ask for your full name, phone or address." autoComplete="given-name" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
        <Field label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Password" type="password" autoComplete="new-password" hint="At least 8 characters, including a number." value={password} onChange={(e) => setPassword(e.target.value)} />
        <ErrorText>{error}</ErrorText>
        <button className="ink-button" disabled={busy || !name.trim() || !email || !passwordOk}>{busy && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />} Create account</button>
      </form>
      <p className="mt-8 text-sm text-ink-soft">Already have an account? <Link href="/sign-in" className="font-semibold text-emerald underline underline-offset-4">Sign in</Link></p>
    </Card>
  );
}

function VerifyCode({ email, onDone }: { email: string; onDone: () => Promise<void> }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await authPost('verify', { email, otp: code });
      await onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit}>
      <p className="mb-5 text-ink-soft">We sent a 6-digit code to <strong className="text-ink">{email}</strong>. Enter it here. It works for a few minutes only.</p>
      <Field label="6-digit code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
      <ErrorText>{error}</ErrorText>
      <div className="flex flex-wrap items-center gap-4">
        <button className="ink-button" disabled={busy || code.length !== 6}>{busy && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />} Verify email</button>
        <button type="button" className="text-sm text-ink-soft underline decoration-gold underline-offset-4" onClick={async () => { await authPost('resend', { email }).catch(() => {}); setSent(true); }}>
          {sent ? 'Sent again' : 'Send the code again'}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Password reset by code
// ---------------------------------------------------------------------------
export function ResetForm() {
  const [stage, setStage] = useState<'email' | 'code' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError(null);
    try { await fn(); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };

  return (
    <Card title="Reset your password">
      {stage === 'email' && (
        <form onSubmit={(e) => { e.preventDefault(); void run(async () => { await authPost('forgot', { email }); setStage('code'); }); }}>
          <Field label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <ErrorText>{error}</ErrorText>
          <button className="ink-button" disabled={busy || !email}>{busy && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />} Email me a code</button>
        </form>
      )}
      {stage === 'code' && (
        <form onSubmit={(e) => { e.preventDefault(); void run(async () => { await authPost('reset', { email, code, newPassword: password }); setStage('done'); }); }}>
          <p className="mb-5 text-ink-soft">If an account uses <strong className="text-ink">{email}</strong>, a 6-digit code is on its way.</p>
          <Field label="6-digit code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
          <Field label="New password" type="password" autoComplete="new-password" hint="At least 8 characters, including a number." value={password} onChange={(e) => setPassword(e.target.value)} />
          <ErrorText>{error}</ErrorText>
          <button className="ink-button" disabled={busy || code.length !== 6 || password.length < 8 || !/\d/.test(password)}>{busy && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />} Change password</button>
        </form>
      )}
      {stage === 'done' && (
        <div>
          <p className="text-ink-soft">Your password is changed.</p>
          <Link href="/sign-in" className="ink-button mt-5">Sign in</Link>
        </div>
      )}
    </Card>
  );
}
