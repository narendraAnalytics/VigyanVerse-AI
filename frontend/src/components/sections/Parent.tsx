'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useState } from 'react';
import { Check, Loader2, Unlink } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { insforge } from '@/lib/insforge';
import { CONSENT_TYPES, rpc, type ConsentType } from '@/lib/api';
import { createStore, useStore } from '@/lib/store';
import { usePreview } from '@/components/book/page-context';
import { Bindu, Speech } from '@/components/mascot/Bindu';
import { CONSENT_TEXT } from './Onboarding';

const POLICY_VERSION = '2026-11-v1';

interface Child { id: string; name: string; consent: Record<ConsentType, boolean> }
const family = createStore({ children: [] as Child[], loaded: false });

async function loadChildren() {
  const db = insforge().database;
  const { data } = await db.from('parent_student_links').select('student_id').eq('status', 'active').limit(10);
  const ids = ((data as { student_id: string }[] | null) ?? []).map((r) => r.student_id);
  if (!ids.length) { family.set({ children: [], loaded: true }); return; }
  const profiles = await db.from('profiles').select('id, display_name').in('id', ids);
  const names = new Map(((profiles.data as { id: string; display_name: string }[] | null) ?? []).map((p) => [p.id, p.display_name]));
  const children = await Promise.all(ids.map(async (id) => {
    const values = await Promise.all(CONSENT_TYPES.map((t) => rpc<boolean>('has_consent', { p_student: id, p_consent_type: t }).catch(() => false)));
    return { id, name: names.get(id) ?? 'Your child', consent: Object.fromEntries(CONSENT_TYPES.map((t, i) => [t, values[i] === true])) as Record<ConsentType, boolean> };
  }));
  family.set({ children, loaded: true });
}

// ---------------------------------------------------------------------------
// Left page: what this is, and the code from the student
// ---------------------------------------------------------------------------
export function ParentLeft() {
  const auth = useAuth();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const codeId = useId();

  const accept = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const studentId = await rpc<string | null>('accept_parent_invite', { p_code: code });
      if (!studentId) setMsg({ ok: false, text: 'That code is not right, was already used, or has expired. Ask your child to make a new one.' });
      else { setMsg({ ok: true, text: 'Linked. Now choose what to allow on the right.' }); setCode(''); await loadChildren(); }
    } catch (err) {
      const m = (err as Error).message ?? '';
      setMsg({ ok: false, text: m.includes('too many') ? 'Too many tries. Wait an hour and try again.' : 'Could not use the code. Try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 data-page-heading tabIndex={-1} className="font-display text-4xl leading-tight outline-none">Permission slip</h1>
      <p className="mt-3 max-w-[48ch] text-ink-soft">
        VigyanVerse helps your child with Class 10 Science. Because students are under 18, the AI features stay off until you allow them,
        and you can change your mind at any time.
      </p>
      <ul className="mt-5 space-y-2 text-[0.95rem] text-ink-soft">
        {[
          'We keep only a first name, class, board and birth year.',
          'You can see your child’s chapter progress. You cannot see their chats or photos.',
          'Recordings of your child’s voice are never stored.',
          'Each student has a daily usage limit.',
        ].map((t) => (
          <li key={t} className="flex gap-2"><span aria-hidden className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rotate-45 bg-gold" />{t}</li>
        ))}
      </ul>

      {auth.loading ? null : !auth.user ? (
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/sign-up?role=parent" className="ink-button">Create a parent account</Link>
          <Link href="/sign-in" className="ghost-button">Sign in</Link>
        </div>
      ) : auth.profile?.role !== 'parent' ? (
        <p className="mt-7 text-ink-soft">You are signed in as a student. A parent needs their own account to give permission. <Link href="/onboarding" className="text-emerald underline">Get a parent code</Link></p>
      ) : (
        <form onSubmit={accept} className="mt-8">
          <label htmlFor={codeId} className="font-display text-xl">Link your child’s account</label>
          <p className="text-sm text-ink-faint">Your child makes the code on their bookplate page. It looks like ABCD-1234-EF56.</p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <input id={codeId} className="field font-display max-w-[16rem] text-2xl uppercase tracking-[0.12em]" placeholder="XXXX-XXXX-XXXX" maxLength={14}
              value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} autoComplete="off" />
            <button className="ink-button" disabled={busy || code.replace(/[^0-9A-Z]/g, '').length !== 12}>
              {busy && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />} Link
            </button>
          </div>
          {msg && <p role="status" className={`mt-3 text-sm ${msg.ok ? 'text-emerald' : 'text-pencil'}`}>{msg.text}</p>}
        </form>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Right page: one slip per linked child
// ---------------------------------------------------------------------------
export function ParentRight() {
  const auth = useAuth();
  const preview = usePreview();
  const f = useStore(family);
  const isParent = auth.profile?.role === 'parent';

  useEffect(() => { if (!preview && isParent) void loadChildren(); }, [preview, isParent]);

  if (!isParent) {
    return (
      <div className="pl-10">
        <div className="flex items-end gap-3">
          <Bindu size={70} />
          <Speech className="mb-5 max-w-[30ch]">Parents: sign in with a parent account to see the permission slip.</Speech>
        </div>
      </div>
    );
  }

  return (
    <div className="pl-10">
      <h2 className="font-display text-3xl">Your decisions</h2>
      {!f.loaded ? <p className="mt-3 text-ink-faint">Loading…</p> : f.children.length === 0 ? (
        <p className="mt-3 text-ink-soft">No child is linked yet. Enter your child’s code on the left.</p>
      ) : (
        f.children.map((c) => <Slip key={c.id} child={c} />)
      )}
    </div>
  );
}

function Slip({ child }: { child: Child }) {
  const [choice, setChoice] = useState(child.consent);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => setChoice(child.consent), [child.consent]);
  const changed = CONSENT_TYPES.filter((t) => choice[t] !== child.consent[t]);

  const save = useCallback(async () => {
    setBusy(true); setMsg(null);
    try {
      for (const t of changed) {
        await rpc('record_consent', { p_student: child.id, p_consent_type: t, p_granted: choice[t], p_policy_version: POLICY_VERSION });
      }
      await loadChildren();
      setMsg('Saved.');
    } catch {
      setMsg('Could not save. Try again.');
    } finally {
      setBusy(false);
    }
  }, [changed, child.id, choice]);

  const unlink = async () => {
    if (!window.confirm(`Unlink ${child.name}? Permissions you gave will stop counting.`)) return;
    await rpc('revoke_parent_link', { p_other: child.id }).catch(() => {});
    await loadChildren();
  };

  return (
    <section className="deco-frame mt-5 bg-[#f7efdc] px-5 py-4" aria-label={`Permissions for ${child.name}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-hand text-2xl">{child.name}</h3>
        <button type="button" onClick={unlink} className="flex items-center gap-1 text-xs text-ink-faint hover:text-pencil"><Unlink aria-hidden className="h-3.5 w-3.5" /> Unlink</button>
      </div>
      <ul className="mt-3 space-y-3">
        {CONSENT_TYPES.map((t) => (
          <li key={t}>
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--emerald)]" checked={choice[t]} onChange={(e) => setChoice((c) => ({ ...c, [t]: e.target.checked }))} />
              <span>
                <span className="block font-semibold">{CONSENT_TEXT[t].title}</span>
                <span className="block text-sm text-ink-soft">{CONSENT_TEXT[t].body}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center gap-3">
        <button type="button" className="ink-button" disabled={busy || changed.length === 0} onClick={save}>
          {busy ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : msg === 'Saved.' ? <Check aria-hidden className="h-4 w-4" /> : null} Save decisions
        </button>
        {msg && <span role="status" className="text-sm text-ink-soft">{msg}</span>}
      </div>
      <p className="mt-3 text-xs text-ink-faint">By saving you confirm you are this student’s parent or guardian. Each decision is recorded with the date.</p>
    </section>
  );
}
