// "Our Story", printed like a textbook's preface. No hooks and no 'use client': the same markup
// renders on the book pages (client) and in the /story route's plain server HTML. Text: src/lib/story.ts.
import { Globe, Handshake, Lightbulb, Mail } from 'lucide-react';
import { STORY } from '@/lib/story';

const C = 'var(--story)';

/** Left page: the idea, how it works, who it helps, the AI behind it. */
export function StoryIdea({ bookHeading = false }: { bookHeading?: boolean }) {
  return (
    <article aria-labelledby="story-title">
      <div className="flex items-end gap-4">
        <Lightbulb aria-hidden className="h-16 w-16 shrink-0" style={{ color: C }} strokeWidth={1.4} />
        <div>
          <h1
            id="story-title"
            {...(bookHeading ? { 'data-page-heading': true, tabIndex: -1 } : {})}
            className="font-display text-5xl leading-none outline-none"
          >
            {STORY.title}
          </h1>
          <p className="mt-1 font-display text-xl italic" style={{ color: C }}>{STORY.idea.heading}</p>
        </div>
      </div>
      <div aria-hidden className="deco-rule mt-4" style={{ borderColor: C }} />
      <p className="mt-4 max-w-[52ch] text-ink-soft">{STORY.idea.intro}</p>

      <section className="mt-7" aria-labelledby="story-how">
        <h2 id="story-how" className="font-display text-2xl">How it works</h2>
        <ol className="mt-3 grid gap-3 sm:grid-cols-2">
          {STORY.how.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full font-display text-lg text-paper" style={{ background: C }}>{i + 1}</span>
              <span>
                <span className="block font-display text-lg leading-tight">{s.title}</span>
                <span className="block text-[0.93rem] leading-snug text-ink-soft">{s.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-7" aria-labelledby="story-benefits">
        <h2 id="story-benefits" className="font-display text-2xl">How it helps you</h2>
        <ul className="mt-3 space-y-2.5">
          {STORY.benefits.map((b) => (
            <li key={b.title} className="flex gap-2.5">
              <span aria-hidden className="mt-[0.55rem] h-2 w-2 shrink-0 rotate-45" style={{ background: C }} />
              <p className="max-w-[58ch] text-[0.95rem] leading-snug text-ink-soft">
                <b className="font-display text-[1.02rem] font-normal text-ink">{b.title}: </b>{b.text}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="deco-frame mt-7 bg-[#f7efdc] p-4 sm:p-5" aria-labelledby="story-ai">
        <h2 id="story-ai" className="font-display text-xl italic" style={{ color: C }}>{STORY.ai.heading}</h2>
        <dl className="mt-2 space-y-2.5">
          {STORY.ai.lines.map((l) => (
            <div key={l.title}>
              <dt className="font-display text-lg leading-tight">{l.title}</dt>
              <dd className="text-[0.93rem] leading-snug text-ink-soft">{l.text}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 font-hand text-lg leading-snug" style={{ color: C }}>{STORY.ai.motto}</p>
      </section>
    </article>
  );
}

/** Right page: the plans, the promise that plans are never sold, and where to find us. */
export function StoryNext({ bookHeading = false }: { bookHeading?: boolean }) {
  return (
    <article className="pl-10" aria-labelledby="story-next-title">
      <h2
        id="story-next-title"
        {...(bookHeading ? { 'data-page-heading': true, tabIndex: -1 } : {})}
        className="font-display text-[clamp(1.7rem,2.4vw,2.4rem)] leading-tight outline-none"
      >
        {STORY.next.heading}
      </h2>
      <p className="mt-1 max-w-[52ch] text-ink-soft">{STORY.next.intro}</p>

      <ol className="mt-5 space-y-4">
        {STORY.next.plans.map((p, i) => (
          <li key={p.title} className="flex items-baseline">
            <span aria-hidden className="w-8 shrink-0 font-display italic" style={{ color: C }}>{String.fromCharCode(97 + i)}.</span>
            <span>
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-display text-lg">{p.title}</span>
                <span className="rounded-full px-2 py-px font-hand text-[0.85rem] leading-tight" style={{ color: C, boxShadow: `inset 0 0 0 1px ${C}` }}>planned</span>
              </span>
              <span className="block max-w-[54ch] text-[0.95rem] leading-snug text-ink-soft">{p.text}</span>
            </span>
          </li>
        ))}
      </ol>

      <p className="mt-6 max-w-[56ch] border-l-2 pl-4 text-[0.93rem] italic text-ink-soft" style={{ borderColor: C }}>{STORY.next.promise}</p>

      <section className="deco-frame mt-7 bg-[#f7efdc] p-4 sm:p-5" aria-labelledby="story-work">
        <h2 id="story-work" className="flex items-center gap-2 font-display text-xl italic" style={{ color: C }}>
          <Handshake aria-hidden className="h-5 w-5" /> {STORY.work.heading}
        </h2>
        <p className="mt-1.5 max-w-[56ch] text-[0.95rem] leading-snug text-ink-soft">{STORY.work.text}</p>
        <p className="mt-2 text-[0.95rem]">
          {STORY.work.ask}{' '}
          <a
            href={`mailto:${STORY.find.email}?subject=${encodeURIComponent(STORY.work.subject)}`}
            className="inline-flex items-center gap-1.5 text-emerald underline decoration-gold underline-offset-4 hover:text-emerald-deep"
          >
            <Mail aria-hidden className="h-4 w-4" /> {STORY.find.email}
          </a>
        </p>
      </section>

      <section className="mt-7" aria-labelledby="story-find">
        <h2 id="story-find" className="font-display text-xl">{STORY.find.heading}</h2>
        <ul className="mt-2 space-y-1.5 text-[0.95rem]">
          <li>
            <a href={STORY.find.website} className="inline-flex items-center gap-1.5 text-emerald underline decoration-gold underline-offset-4 hover:text-emerald-deep">
              <Globe aria-hidden className="h-4 w-4" /> {STORY.find.website.replace(/^https:\/\//, '')}
            </a>
          </li>
          <li>
            <a href={`mailto:${STORY.find.email}`} className="inline-flex items-center gap-1.5 text-emerald underline decoration-gold underline-offset-4 hover:text-emerald-deep">
              <Mail aria-hidden className="h-4 w-4" /> {STORY.find.email}
            </a>
          </li>
        </ul>
      </section>
    </article>
  );
}

/** The whole story for the route's plain server HTML (hidden on screen, where the book shows it). */
export function StoryPlainCopy() {
  return (
    <div hidden>
      <StoryIdea />
      <StoryNext />
    </div>
  );
}
