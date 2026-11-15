'use client';

// The navbar, printed across the top of the open book: plain ink links with an icon.
// The open section is underlined in its subject colour. Each one is an ordinary link, so
// history and direct URLs work (the book turns its page when the URL changes).
import Link from 'next/link';
import { clsx } from 'clsx';
import { Atom, BookOpen, FlaskConical, Leaf, MessageCircleQuestion, NotebookPen } from 'lucide-react';
import { visibleSections, type SectionId } from '@/lib/sections';
import { useAuth } from '@/lib/auth';

const ICONS: Record<string, typeof Atom> = {
  home: BookOpen, physics: Atom, chemistry: FlaskConical, biology: Leaf, tutor: MessageCircleQuestion, learning: NotebookPen,
};

export function Ribbons({ current, className }: { current: SectionId; className?: string }) {
  const { user } = useAuth();
  const sections = visibleSections(!!user);
  return (
    <nav aria-label="Sections" className={clsx('relative', className)}>
      <ul className="flex items-center gap-5 overflow-x-auto px-1 [scrollbar-width:none] sm:gap-7 lg:justify-center lg:gap-8">
        {sections.map((s) => {
          const active = s.id === current;
          const Icon = ICONS[s.id];
          return (
            <li key={s.id} className="shrink-0">
              <Link
                href={s.path}
                aria-current={active ? 'page' : undefined}
                className={clsx(
                  'group relative flex items-center gap-1.5 py-1.5 font-display text-[1rem] transition-colors duration-200 sm:text-[1.08rem]',
                  active ? 'text-ink' : 'text-ink-soft hover:text-ink',
                )}
              >
                <Icon aria-hidden className="h-4 w-4 transition-colors" strokeWidth={1.8} style={{ color: active ? s.color : undefined }} />
                <span className="whitespace-nowrap">{s.label}</span>
                <span
                  aria-hidden
                  className={clsx('absolute -bottom-0.5 left-0 right-0 h-[2px] origin-left rounded-full transition-transform duration-300', active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100')}
                  style={{ background: s.color }}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
