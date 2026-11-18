'use client';

// The navbar, printed across the top of the open book. Each section has an ink "stamp" in its
// subject colour; the open section's stamp is filled in and a coloured ink stroke under it slides
// to the next section when the page turns. A faint pencil-grey wash follows the pointer between
// links (no coloured link backgrounds), and each icon has its own small hover animation
// (atom spins, flask swirls, leaf sways...). Motion respects prefers-reduced-motion.
// Each item is an ordinary link, so history and direct URLs work.
import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { clsx } from 'clsx';
import { MotionConfig, motion } from 'motion/react';
import { Atom, BookOpen, FlaskConical, Leaf, MessageCircleQuestion, NotebookPen } from 'lucide-react';
import { visibleSections, type SectionId } from '@/lib/sections';
import { useAuth } from '@/lib/auth';

const ICONS: Partial<Record<SectionId, { Icon: typeof Atom; anim: string }>> = {
  home: { Icon: BookOpen, anim: 'nav-anim-flip' },
  physics: { Icon: Atom, anim: 'nav-anim-spin' },
  chemistry: { Icon: FlaskConical, anim: 'nav-anim-swirl' },
  biology: { Icon: Leaf, anim: 'nav-anim-sway' },
  tutor: { Icon: MessageCircleQuestion, anim: 'nav-anim-hop' },
  learning: { Icon: NotebookPen, anim: 'nav-anim-write' },
};

const SPRING = { type: 'spring', stiffness: 420, damping: 34 } as const;

export function Ribbons({ current, className }: { current: SectionId; className?: string }) {
  const { user } = useAuth();
  const sections = visibleSections(!!user);
  const [hovered, setHovered] = useState<SectionId | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Phones scroll the bar sideways: keep the open section in view after a page turn.
  useEffect(() => {
    const list = listRef.current;
    const link = list?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!list || !link || list.scrollWidth <= list.clientWidth) return;
    const left = link.offsetLeft - (list.clientWidth - link.offsetWidth) / 2;
    list.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }, [current, sections.length]);

  return (
    <MotionConfig reducedMotion="user">
      <nav aria-label="Sections" className={clsx('relative', className)} onMouseLeave={() => setHovered(null)}>
        <ul
          ref={listRef}
          className="flex items-center gap-0.5 overflow-x-auto py-1 pl-1 pr-7 [mask-image:linear-gradient(to_right,#000_calc(100%-28px),transparent)] [scrollbar-width:none] sm:gap-1.5 lg:justify-center lg:gap-2 lg:pr-1 lg:[mask-image:none]"
        >
          {sections.map((s) => {
            const active = s.id === current;
            const { Icon, anim } = ICONS[s.id] ?? ICONS.home!;
            return (
              <li key={s.id} className="shrink-0">
                <Link
                  href={s.path}
                  aria-current={active ? 'page' : undefined}
                  onMouseEnter={() => setHovered(s.id)}
                  onFocus={() => setHovered(s.id)}
                  onBlur={() => setHovered(null)}
                  style={{ '--nav-c': s.color } as CSSProperties}
                  className={clsx(
                    'nav-link group relative isolate flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 font-display text-[1rem] outline-none transition-colors duration-200 sm:text-[1.08rem]',
                    active ? 'text-ink' : 'text-ink-soft hover:text-ink',
                  )}
                >
                  {hovered === s.id && (
                    <motion.span
                      layoutId="nav-hover"
                      aria-hidden
                      className="absolute inset-0 -z-10 rounded-full bg-ink/[0.06] ring-1 ring-ink/10"
                      transition={SPRING}
                    />
                  )}
                  <span aria-hidden className={clsx('nav-stamp', active && 'nav-stamp-on')}>
                    <Icon className={clsx('h-[15px] w-[15px]', anim)} strokeWidth={active ? 2.1 : 1.9} />
                  </span>
                  <span className="whitespace-nowrap">{s.label}</span>
                  {active && (
                    <motion.span
                      layoutId="nav-active"
                      aria-hidden
                      className="absolute -bottom-0.5 left-3 right-3 h-[2.5px] rounded-full"
                      style={{ background: s.color }}
                      transition={SPRING}
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </MotionConfig>
  );
}
