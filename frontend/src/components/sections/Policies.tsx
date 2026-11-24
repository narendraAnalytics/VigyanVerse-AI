'use client';

// Back matter of the book: About, Contact, FAQ, Pricing, Terms, Privacy, Refunds. The left page is
// an index of all of them ("The fine print"); the right page is the chosen policy. Text lives in
// src/lib/policies.ts; the Pricing page swaps in the live packs and prices from the backend.
import Link from 'next/link';
import { useEffect } from 'react';
import clsx from 'clsx';
import { Mail } from 'lucide-react';
import { BUSINESS, POLICIES, packRows, policyById, priceRows, type PolicyId } from '@/lib/policies';
import { useStore } from '@/lib/store';
import { loadCatalogue, wallet } from '@/lib/wallet-store';
import { usePreview } from '@/components/book/page-context';
import { PolicyDocument } from '@/components/policy/PolicyDocument';
import { Bindu, Speech } from '@/components/mascot/Bindu';

export function PolicyIndex({ current }: { current: PolicyId }) {
  return (
    <div className="pl-10">
      <h2 className="font-display text-3xl text-ink">The fine print</h2>
      <p className="mt-1 max-w-[44ch] text-ink-soft">Everything about who we are, what things cost and how we look after your data.</p>
      <ol className="mt-6 space-y-3.5">
        {POLICIES.map((p, i) => {
          const on = p.id === current;
          return (
            <li key={p.id}>
              <Link href={p.path} aria-current={on ? 'page' : undefined} className="group block rounded-sm outline-offset-4">
                <span className="flex items-baseline">
                  <span className="w-8 shrink-0 font-display italic text-gold-deep">{String.fromCharCode(65 + i)}</span>
                  <span className={clsx('font-display text-lg', on ? 'text-emerald underline decoration-gold decoration-2 underline-offset-4' : 'group-hover:text-emerald')}>{p.title}</span>
                </span>
                <span className="ml-8 block text-[0.9rem] text-ink-soft">{p.summary}</span>
              </Link>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 border-l-2 border-gold pl-4 text-[0.92rem] text-ink-soft">
        <p className="font-display text-base text-ink">{BUSINESS.brand}</p>
        <p>Run by {BUSINESS.legalName}, India</p>
        <a href={`mailto:${BUSINESS.email}`} className="mt-1 inline-flex items-center gap-1.5 text-emerald underline decoration-gold underline-offset-4 hover:text-emerald-deep">
          <Mail aria-hidden className="h-4 w-4" /> {BUSINESS.email}
        </a>
      </div>

      <div className="mt-8 flex items-end gap-3">
        <Bindu size={56} />
        <Speech className="mb-4 max-w-[26ch]">No small print tricks here. If anything is unclear, just write to us!</Speech>
      </div>
    </div>
  );
}

export function PolicyPage({ id }: { id: PolicyId }) {
  const preview = usePreview();
  const w = useStore(wallet);
  useEffect(() => {
    if (id === 'pricing' && !preview) void loadCatalogue();
  }, [id, preview]);

  const rowsFor = id === 'pricing'
    ? (kind: 'packs' | 'prices') => {
        if (kind === 'packs') return w.packs.length ? packRows(w.packs) : null;
        return w.prices.length ? priceRows(new Map(w.prices.map((p) => [p.task, p.price_paise]))) : null;
      }
    : undefined;

  return <PolicyDocument doc={policyById(id)} rowsFor={rowsFor} bookHeading />;
}
