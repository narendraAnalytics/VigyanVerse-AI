'use client';

// The rupee wallet: header balance pill, the Add-money sheet (Razorpay Checkout) and the Wallet
// page. Every number comes from the backend (wallets, wallet_ledger, topup_packs, task_prices).
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import {
  ArrowDownLeft, ArrowUpRight, Check, CircleAlert, Clock, Loader2, Lock, Plus, RotateCcw, ShieldCheck, Sparkles, Wallet as WalletIcon, X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';
import { usePreview } from '@/components/book/page-context';
import {
  buyPack, closeAddMoney, loadActivity, loadCatalogue, openAddMoney, priceOf, rupees, syncWallet, TASK_LABEL, toneOf, wallet,
  type Pack, type Tone,
} from '@/lib/wallet-store';
import { StudentGate } from '@/components/sections/Gate';

const TONE: Record<Tone, { pill: string; dot: string; text: string; word: string }> = {
  good:  { pill: 'border-emerald/45 bg-emerald/10 text-emerald-deep', dot: 'bg-emerald', text: 'text-emerald', word: 'Plenty' },
  mid:   { pill: 'border-[#b7791f]/50 bg-[#f6c453]/20 text-[#7a4f0d]', dot: 'bg-[#d4920f]', text: 'text-[#9a6410]', word: 'Okay' },
  low:   { pill: 'border-pencil/50 bg-pencil/10 text-pencil', dot: 'bg-pencil', text: 'text-pencil', word: 'Low' },
  empty: { pill: 'border-pencil/60 bg-pencil/[.14] text-pencil', dot: 'bg-pencil', text: 'text-pencil', word: 'Empty' },
};

/** How many tutor questions a balance pays for (from the live price). */
function questionsFor(paise: number): number {
  const p = priceOf('tutor_turn');
  return p > 0 ? Math.floor(paise / p) : 0;
}

// ---------------------------------------------------------------------------
// Keeps the balance in step with sign-in (mounted once, by the Add-money sheet)
// ---------------------------------------------------------------------------
function useWalletSync() {
  const { user, profile, loading } = useAuth();
  const isStudent = !!user && profile?.role !== 'parent';
  useEffect(() => {
    if (!loading) syncWallet(isStudent);
  }, [loading, isStudent, user?.id]);
}

// ---------------------------------------------------------------------------
// Header pill
// ---------------------------------------------------------------------------
export function BalancePill() {
  const { user, profile } = useAuth();
  const w = useStore(wallet);
  if (!user || profile?.role === 'parent') return null;
  if (w.balancePaise === null) return <span className="h-8 w-20 animate-pulse rounded-full bg-ink/10" aria-hidden />;

  // One control in every state: the balance itself is the top-up button (no separate "Add" text).
  const tone = toneOf(w.balancePaise);
  const t = TONE[tone];
  return (
    <button
      type="button"
      onClick={() => openAddMoney()}
      title={`Your credits: ${rupees(w.balancePaise)}. Click to top up.`}
      aria-label={`Credits ${rupees(w.balancePaise)}, ${t.word.toLowerCase()}. Top up`}
      className={clsx('group flex items-center gap-1.5 whitespace-nowrap rounded-full border py-1 pl-2.5 pr-1 text-sm font-semibold tabular-nums shadow-[inset_0_1px_0_rgba(255,255,255,.35)] transition hover:brightness-95', t.pill)}
    >
      <span className="relative flex h-4 w-4 items-center justify-center">
        <WalletIcon aria-hidden className="h-4 w-4" />
        <span aria-hidden className={clsx('absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full ring-1 ring-paper', t.dot, (tone === 'low' || tone === 'empty') && 'animate-pulse')} />
      </span>
      <span>
        {rupees(w.balancePaise)}
        <span className="ml-1 hidden font-normal opacity-80 sm:inline">credits</span>
      </span>
      {tone === 'low' && <span className="rounded-full bg-pencil px-1.5 py-px text-[0.65rem] font-bold uppercase tracking-wide text-paper">Low</span>}
      <span aria-hidden className={clsx('flex h-6 w-6 items-center justify-center rounded-full transition group-hover:scale-110', tone === 'empty' ? 'bg-pencil text-paper' : 'bg-white/60')}>
        <Plus className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Pack cards (sheet + Wallet page)
// ---------------------------------------------------------------------------
function PackCard({ pack, selected, onPick }: { pack: Pack; selected: boolean; onPick: () => void }) {
  const bonus = pack.credit_paise - pack.price_paise;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onPick}
      className={clsx(
        'relative flex flex-col items-start overflow-hidden rounded-lg border-[1.5px] bg-[#fbf6ea] px-4 pb-3 pt-4 text-left transition',
        selected ? 'border-emerald shadow-[0_0_0_3px_rgba(31,95,91,.18)]' : 'border-ink/15 hover:-translate-y-0.5 hover:border-gold-deep hover:shadow-md',
      )}
    >
      {/* ticket perforation */}
      <span aria-hidden className="absolute inset-x-3 top-1.5 h-0 border-t-2 border-dotted border-gold/50" />
      {pack.highlight && (
        <span className="absolute -right-8 top-3 rotate-45 bg-gold px-8 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider text-ink shadow">Popular</span>
      )}
      <span className="font-display text-3xl leading-none text-ink">{rupees(pack.price_paise)}</span>
      <span className="mt-1 text-sm text-ink-soft">
        {bonus > 0 ? <>you get <b className="text-emerald">{rupees(pack.credit_paise)}</b></> : 'in your wallet'}
      </span>
      {bonus > 0 && (
        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-gold/25 px-2 py-0.5 text-xs font-semibold text-gold-deep">
          <Sparkles aria-hidden className="h-3 w-3" /> +{rupees(bonus)} extra
        </span>
      )}
      <span className="mt-2 text-xs text-ink-faint">about {questionsFor(pack.credit_paise)} questions</span>
      {selected && <Check aria-hidden className="absolute bottom-3 right-3 h-5 w-5 rounded-full bg-emerald p-0.5 text-paper" />}
    </button>
  );
}

function PriceList({ compact = false }: { compact?: boolean }) {
  const { prices } = useStore(wallet);
  if (!prices.length) return null;
  return (
    <ul className={clsx('divide-y divide-dashed divide-ink/15', compact ? 'text-sm' : '')}>
      {prices.map((p) => (
        <li key={p.task} className="flex items-baseline justify-between gap-3 py-1.5">
          <span className="text-ink-soft">{p.label}</span>
          <span className="shrink-0 font-semibold tabular-nums text-ink">{p.price_paise ? rupees(p.price_paise) : 'free'}</span>
        </li>
      ))}
      <li className="flex items-baseline justify-between gap-3 py-1.5">
        <span className="text-ink-soft">Answer checking, progress and revision</span>
        <span className="shrink-0 font-semibold text-emerald">free</span>
      </li>
    </ul>
  );
}

// ---------------------------------------------------------------------------
// The Add-money sheet (mounted once by BookShell)
// ---------------------------------------------------------------------------
export function AddMoneySheet() {
  useWalletSync();
  const { user, profile } = useAuth();
  const w = useStore(wallet);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!w.sheetOpen) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeAddMoney(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [w.sheetOpen]);

  if (!w.sheetOpen || !user) return null;
  const pack = w.packs.find((p) => p.code === w.selected);
  const busy = w.phase === 'starting' || w.phase === 'paying' || w.phase === 'confirming';
  const balance = w.balancePaise ?? 0;
  const pay = () => void buyPack({ id: user.id, email: user.email, name: profile?.display_name ?? user.name ?? null });

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-desk/70 backdrop-blur-[2px] sm:items-center" onMouseDown={(e) => { if (e.target === e.currentTarget) closeAddMoney(); }}>
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-money-h"
        className="paper relative max-h-[92dvh] w-full max-w-[34rem] overflow-y-auto rounded-t-2xl px-5 pb-5 pt-6 shadow-2xl outline-none ring-1 ring-gold/60 sm:mx-4 sm:rounded-xl sm:px-7"
      >
        <button type="button" onClick={closeAddMoney} disabled={w.phase === 'starting' || w.phase === 'confirming'} aria-label="Close" className="absolute right-3 top-3 rounded-full p-1.5 text-ink-faint hover:bg-ink/10 hover:text-ink disabled:opacity-40">
          <X aria-hidden className="h-5 w-5" />
        </button>

        {w.phase === 'done' || w.phase === 'slow' ? (
          <div className="py-6 text-center" aria-live="polite">
            <span className={clsx('mx-auto flex h-16 w-16 items-center justify-center rounded-full', w.phase === 'done' ? 'bg-emerald text-paper' : 'bg-gold/30 text-gold-deep')}>
              {w.phase === 'done' ? <Check aria-hidden className="h-9 w-9" /> : <Clock aria-hidden className="h-8 w-8" />}
            </span>
            <h2 id="add-money-h" className="mt-4 font-display text-3xl">{w.phase === 'done' ? `${rupees(w.lastCreditPaise)} added!` : 'Payment received'}</h2>
            <p className="mt-2 text-ink-soft">
              {w.phase === 'done'
                ? <>You now have <b className={TONE[toneOf(balance)].text}>{rupees(balance)}</b> in credits. Happy learning!</>
                : <>Your bank is still confirming it. {rupees(w.lastCreditPaise)} will show in your credits within a few minutes.</>}
            </p>
            <button type="button" onClick={closeAddMoney} className="ink-button mt-6">Back to learning</button>
          </div>
        ) : (
          <>
            <p className="font-hand text-lg text-gold-deep">Your wallet</p>
            <h2 id="add-money-h" className="font-display text-3xl leading-tight">Top up credits</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Your credits: <b className={clsx('tabular-nums', TONE[toneOf(balance)].text)}>{rupees(balance)}</b>
              <span className="text-ink-faint"> · 1 credit = ₹1</span>
            </p>

            {w.need && (
              <p className="mt-3 flex items-start gap-2 rounded-md border border-pencil/30 bg-pencil/[.07] px-3 py-2 text-sm text-pencil" role="status">
                <CircleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                <span>That needs <b>{rupees(w.need.pricePaise)}</b> and you have <b>{rupees(w.need.balancePaise)}</b>. Top up a little and try again.</span>
              </p>
            )}

            <div role="radiogroup" aria-label="Choose an amount" className="mt-4 grid grid-cols-2 gap-3">
              {w.packs.length
                ? w.packs.map((p) => <PackCard key={p.code} pack={p} selected={p.code === w.selected} onPick={() => !busy && wallet.set({ selected: p.code, phase: 'idle', payError: null })} />)
                : Array.from({ length: 4 }, (_, i) => <span key={i} className="h-28 animate-pulse rounded-lg bg-ink/10" />)}
            </div>

            <div className="mt-4 min-h-[1.5rem] text-sm" aria-live="polite">
              {w.phase === 'paying' && <span className="text-ink-soft">Finish the payment in the Razorpay window…</span>}
              {w.phase === 'confirming' && <span className="flex items-center gap-2 text-emerald"><Loader2 aria-hidden className="h-4 w-4 animate-spin" /> Payment received. Adding {pack ? rupees(pack.credit_paise) : 'it'} to your credits…</span>}
              {w.phase === 'cancelled' && <span className="text-ink-soft">Payment not completed. No money was taken. You can try again.</span>}
              {w.phase === 'failed' && <span className="text-pencil">{w.payError}</span>}
            </div>

            <button type="button" onClick={pay} disabled={!pack || busy} className="ink-button mt-2 w-full justify-center !py-3 text-base">
              {w.phase === 'starting' ? <><Loader2 aria-hidden className="h-4 w-4 animate-spin" /> Opening secure payment…</>
                : w.phase === 'paying' || w.phase === 'confirming' ? <><Loader2 aria-hidden className="h-4 w-4 animate-spin" /> Waiting for payment…</>
                : w.phase === 'cancelled' || w.phase === 'failed' ? <><RotateCcw aria-hidden className="h-4 w-4" /> Try again: pay {pack ? rupees(pack.price_paise) : ''}</>
                : <><Lock aria-hidden className="h-4 w-4" /> Pay {pack ? rupees(pack.price_paise) : ''} securely</>}
            </button>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-ink-faint">
              <ShieldCheck aria-hidden className="h-3.5 w-3.5" /> UPI, cards and net banking through Razorpay. We never see your card or UPI PIN.
            </p>

            <details className="mt-5 rounded-md border border-ink/10 bg-white/30 px-3 py-2">
              <summary className="cursor-pointer text-sm font-semibold text-ink-soft">What things cost</summary>
              <div className="mt-1"><PriceList compact /></div>
              <p className="mt-2 text-xs text-ink-faint">If the AI cannot answer, the money goes back to your wallet automatically.</p>
            </details>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Wallet page (/wallet)
// ---------------------------------------------------------------------------
function tagline(paise: number): string {
  const n = questionsFor(paise);
  switch (toneOf(paise)) {
    case 'good': return `You're all set: enough for about ${n} tutor questions.`;
    case 'mid': return `Enough for about ${n} tutor questions. Top up before a big revision day.`;
    case 'low': return `Running low: about ${n} question${n === 1 ? '' : 's'} left. Top up to keep going.`;
    default: return 'Top up your credits to ask the tutor, take quizzes and read photos of your notes.';
  }
}

function when(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export function WalletLeft() {
  const preview = usePreview();
  const w = useStore(wallet);
  const { user } = useAuth();
  useEffect(() => { if (!preview && user) void loadActivity(); }, [preview, user]);

  return (
    <StudentGate what="your wallet">
      <h1 className="font-display text-4xl leading-tight">Your wallet</h1>
      {w.balancePaise === null ? (
        <div className="mt-5 h-36 animate-pulse rounded-xl bg-ink/10" />
      ) : (
        <div className="relative mt-5 overflow-hidden rounded-xl bg-gradient-to-br from-[#16403c] via-emerald to-[#2a7a72] p-5 text-paper shadow-[0_14px_30px_-12px_rgba(18,60,57,.7)]">
          <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full border-[14px] border-gold/25" />
          <span aria-hidden className="pointer-events-none absolute -bottom-14 right-16 h-28 w-28 rounded-full bg-gold/15" />
          <p className="flex items-center gap-2 text-sm text-paper/80"><WalletIcon aria-hidden className="h-4 w-4" /> Your credits</p>
          <p className="mt-1 font-display text-5xl tabular-nums">{rupees(w.balancePaise)}</p>
          <p className="mt-1 flex items-center gap-2 text-sm">
            <span className={clsx('h-2 w-2 rounded-full', TONE[toneOf(w.balancePaise)].dot, toneOf(w.balancePaise) === 'good' && '!bg-[#7ee0c3]')} />
            <span className="text-paper/90">{tagline(w.balancePaise)}</span>
          </p>
          <button type="button" onClick={() => openAddMoney()} className="mt-4 inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-bold text-ink shadow hover:bg-[#d8b45c]">
            <Plus aria-hidden className="h-4 w-4" /> Top up
          </button>
        </div>
      )}

      <h2 className="mt-8 font-display text-2xl">Recent activity</h2>
      {!w.activityLoaded ? (
        <p className="mt-2 text-ink-faint">Loading…</p>
      ) : w.activity.length === 0 ? (
        <p className="font-hand mt-2 text-lg text-ink-soft">Nothing yet. Your top-ups and what you spend will show here.</p>
      ) : (
        <ul className="mt-2 divide-y divide-dashed divide-ink/15">
          {w.activity.map((r) => {
            const plus = r.delta_paise > 0;
            const label = r.kind === 'topup' ? 'Added money' : r.kind === 'refund' ? `Refund: ${TASK_LABEL[r.task ?? ''] ?? 'task'}` : TASK_LABEL[r.task ?? ''] ?? 'AI task';
            return (
              <li key={r.id} className="flex items-center gap-3 py-2">
                <span className={clsx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', plus ? 'bg-emerald/15 text-emerald' : 'bg-ink/[.07] text-ink-soft')}>
                  {plus ? <ArrowDownLeft aria-hidden className="h-4 w-4" /> : <ArrowUpRight aria-hidden className="h-4 w-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{label}</span>
                  <span className="block text-xs text-ink-faint">{when(r.created_at)}</span>
                </span>
                <span className={clsx('shrink-0 text-right font-semibold tabular-nums', plus ? 'text-emerald' : 'text-ink')}>
                  {plus ? '+' : '−'}{rupees(Math.abs(r.delta_paise))}
                  <span className="block text-xs font-normal text-ink-faint">left {rupees(r.balance_after_paise)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </StudentGate>
  );
}

export function WalletRight() {
  const preview = usePreview();
  const w = useStore(wallet);
  useEffect(() => { if (!preview) void loadCatalogue(); }, [preview]);

  return (
    <StudentGate what="your wallet" quiet>
      <h2 className="font-display text-3xl">Top up</h2>
      <p className="mt-1 text-ink-soft">Pick an amount. Bigger packs come with a little extra.</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {w.packs.map((p) => <PackCard key={p.code} pack={p} selected={false} onPick={() => { wallet.set({ selected: p.code }); openAddMoney(); wallet.set({ selected: p.code }); }} />)}
      </div>

      <h2 className="mt-8 font-display text-2xl">What things cost</h2>
      <div className="mt-2"><PriceList /></div>
      <ul className="mt-5 space-y-2 text-sm text-ink-soft">
        <li className="flex gap-2"><RotateCcw aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-emerald" /> If the AI cannot answer, the money goes back to your wallet automatically.</li>
        <li className="flex gap-2"><ShieldCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-emerald" /> Payments are handled by Razorpay (UPI, cards, net banking).</li>
      </ul>
      <p className="mt-6 text-sm"><Link href="/learning" className="underline decoration-gold underline-offset-4 hover:text-emerald">Back to My Learning</Link></p>
    </StudentGate>
  );
}
