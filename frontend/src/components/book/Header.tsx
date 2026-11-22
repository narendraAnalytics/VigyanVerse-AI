'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, LogOut, ScrollText, UserRound, Wallet } from 'lucide-react';
import { BalancePill } from '@/components/wallet/Wallet';
import { useAuth } from '@/lib/auth';
import type { SectionId } from '@/lib/sections';
import { Ribbons } from './Ribbons';

export function Header({ current }: { current: SectionId }) {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', close);
    return () => { window.removeEventListener('mousedown', close); window.removeEventListener('keydown', close); };
  }, [open]);

  return (
    <header className="relative flex flex-wrap items-center justify-between gap-x-4 px-[var(--page-pad)] pb-1 pt-1">
      <Link href="/" className="flex shrink-0 items-center gap-2.5 py-2 text-ink">
        <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-[#fbf6ea] ring-1 ring-gold sm:h-10 sm:w-10">
          <Image src="/logo.png" alt="" fill sizes="40px" className="object-contain p-0.5" priority />
        </span>
        <span className="whitespace-nowrap font-display text-lg leading-none sm:text-2xl">
          VigyanVerse <span className="italic text-gold-deep">AI</span>
        </span>
      </Link>

      {/* navbar: its own row on small screens, centred between logo and controls on wide ones */}
      <Ribbons current={current} className="order-last w-full pb-1 lg:order-none lg:w-auto lg:min-w-0 lg:flex-1 lg:pb-0" />

      <div className="flex shrink-0 items-center gap-2 py-2 sm:gap-3">
        {/* English / Telugu switch removed for now (owner 2026-11-16): English only; Telugu comes back later. */}
        {loading ? (
          <span className="h-8 w-20 animate-pulse rounded-full bg-ink/10" />
        ) : user ? (
          <>
          <BalancePill />
          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-expanded={open}
              aria-haspopup="menu"
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-full border border-ink/25 px-3 py-1.5 text-sm text-ink hover:bg-gold/15"
            >
              <UserRound aria-hidden className="h-4 w-4" />
              <span className="max-w-[10ch] truncate">{profile?.display_name ?? 'Account'}</span>
              <ChevronDown aria-hidden className="h-3.5 w-3.5" />
            </button>
            {open && (
              <div role="menu" className="paper absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-md text-sm shadow-xl ring-1 ring-gold/50">
                <p className="border-b border-ink/10 px-4 py-2.5 text-ink-faint">{user.email}</p>
                {profile?.role !== 'parent' && (
                  <>
                  <Link role="menuitem" href="/onboarding" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2.5 hover:bg-gold/15">
                    <ScrollText aria-hidden className="h-4 w-4" /> Your bookplate
                  </Link>
                  <Link role="menuitem" href="/wallet" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2.5 hover:bg-gold/15">
                    <Wallet aria-hidden className="h-4 w-4" /> Credits and payments
                  </Link>
                  </>
                )}
                {profile?.role === 'parent' && (
                  <Link role="menuitem" href="/parent" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2.5 hover:bg-gold/15">
                    <ScrollText aria-hidden className="h-4 w-4" /> Permission slip
                  </Link>
                )}
                <button
                  role="menuitem"
                  type="button"
                  onClick={async () => { setOpen(false); await signOut(); router.push('/'); }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-gold/15"
                >
                  <LogOut aria-hidden className="h-4 w-4" /> Sign out
                </button>
              </div>
            )}
          </div>
          </>
        ) : (
          <Link href="/sign-in" className="whitespace-nowrap rounded-full bg-emerald px-3 py-1.5 text-sm font-semibold text-paper hover:bg-emerald-deep sm:px-4">
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
