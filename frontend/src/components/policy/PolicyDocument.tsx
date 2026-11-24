// One policy page, printed like the back matter of a textbook. No hooks and no 'use client':
// the same markup renders on a book page (client) and in the route's plain server HTML.
import { Mail, MapPin, Phone, Store } from 'lucide-react';
import { BUSINESS, UPDATED, type Block, type PolicyDoc } from '@/lib/policies';

interface Props {
  doc: PolicyDoc;
  /** Replace a table's rows (the Pricing page passes the live packs / prices). */
  rowsFor?: (kind: 'packs' | 'prices') => [string, string][] | null;
  /** The book page marks its heading so focus can move there after a page turn. */
  bookHeading?: boolean;
}

export function PolicyDocument({ doc, rowsFor, bookHeading = false }: Props) {
  return (
    <article className="pl-10" aria-labelledby={`${doc.id}-title`}>
      <h1
        id={`${doc.id}-title`}
        {...(bookHeading ? { 'data-page-heading': true, tabIndex: -1 } : {})}
        className="font-display text-[clamp(1.7rem,2.4vw,2.4rem)] leading-tight text-ink outline-none"
      >
        {doc.title}
      </h1>
      <p className="mt-1 text-sm italic text-ink-faint">Last updated {UPDATED} · {BUSINESS.legalName}</p>
      <p className="mt-4 max-w-[60ch] text-ink-soft">{doc.intro}</p>

      {doc.sections.map((s) => (
        <section key={s.heading} className="mt-7">
          <h2 className="font-display text-xl text-ink">{s.heading}</h2>
          <div className="mt-2.5 space-y-3">
            {s.blocks.map((b, i) => <BlockView key={i} block={b} rowsFor={rowsFor} />)}
          </div>
        </section>
      ))}
    </article>
  );
}

function BlockView({ block, rowsFor }: { block: Block; rowsFor?: Props['rowsFor'] }) {
  if ('p' in block) return <p className="max-w-[62ch] text-[0.97rem] leading-relaxed text-ink-soft">{block.p}</p>;
  if ('list' in block) {
    return (
      <ul className="max-w-[62ch] space-y-2 text-[0.97rem] leading-relaxed text-ink-soft">
        {block.list.map((item) => (
          <li key={item} className="flex gap-2.5">
            <span aria-hidden className="mt-[0.62em] h-1.5 w-1.5 shrink-0 rotate-45 bg-gold" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }
  if ('qa' in block) {
    // <details>: opens without JavaScript, so the server copy and the book page behave the same.
    return (
      <div className="max-w-[62ch] divide-y divide-dashed divide-ink/15 border-y border-gold/50">
        {block.qa.map(([q, a]) => (
          <details key={q} className="group py-2.5">
            <summary className="flex cursor-pointer list-none items-start gap-2.5 text-[0.98rem] font-semibold text-ink marker:hidden hover:text-emerald [&::-webkit-details-marker]:hidden">
              <span aria-hidden className="-mt-[0.05em] w-4 shrink-0 text-center text-xl font-bold leading-none text-gold-deep transition-transform group-open:rotate-45">+</span>
              <span>{q}</span>
            </summary>
            <p className="ml-[1.6rem] mt-1.5 text-[0.95rem] leading-relaxed text-ink-soft">{a}</p>
          </details>
        ))}
      </div>
    );
  }
  if ('rows' in block) {
    const rows = (block.kind && rowsFor?.(block.kind)) || block.rows;
    return (
      <div className="max-w-[62ch]">
        <dl className="divide-y divide-dashed divide-ink/15 border-y border-gold/50">
          {rows.map(([k, v]) => (
            <div key={k} className="flex flex-col gap-x-4 py-2 sm:flex-row sm:items-baseline sm:justify-between">
              <dt className="text-[0.95rem] text-ink-soft">{k}</dt>
              <dd className="font-semibold tabular-nums text-ink sm:text-right">{v}</dd>
            </div>
          ))}
        </dl>
        {block.caption && <p className="mt-1.5 text-sm italic text-ink-faint">{block.caption}</p>}
      </div>
    );
  }
  return <ContactCard />;
}

function ContactCard() {
  const line = 'flex items-start gap-3 py-2.5';
  const icon = 'mt-0.5 h-5 w-5 shrink-0 text-emerald';
  return (
    <div className="deco-frame max-w-[62ch] bg-[#fbf6ea] px-5 py-3">
      <p className={line}>
        <Store aria-hidden className={icon} />
        <span><span className="block text-sm text-ink-faint">Business</span>{BUSINESS.legalName}</span>
      </p>
      <p className={line}>
        <Mail aria-hidden className={icon} />
        <span>
          <span className="block text-sm text-ink-faint">Email (replies {BUSINESS.replyTime})</span>
          <a href={`mailto:${BUSINESS.email}`} className="break-all font-semibold text-emerald underline decoration-gold underline-offset-4 hover:text-emerald-deep">{BUSINESS.email}</a>
        </span>
      </p>
      {BUSINESS.phone && (
        <p className={line}>
          <Phone aria-hidden className={icon} />
          <span>
            <span className="block text-sm text-ink-faint">Phone</span>
            <a href={`tel:${BUSINESS.phone.replace(/\s+/g, '')}`} className="font-semibold text-emerald underline decoration-gold underline-offset-4">{BUSINESS.phone}</a>
          </span>
        </p>
      )}
      {BUSINESS.address && (
        <p className={line}>
          <MapPin aria-hidden className={icon} />
          <span><span className="block text-sm text-ink-faint">Address</span>{BUSINESS.address}</span>
        </p>
      )}
    </div>
  );
}
