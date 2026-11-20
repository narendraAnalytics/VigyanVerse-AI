'use client';

// The navbar, printed across the top of the open book. Each section has an ink "stamp" in its
// subject colour; the open section's stamp is filled in and a coloured ink stroke under it slides
// to the next section when the page turns. A faint pencil-grey wash follows the pointer between
// links (no coloured link backgrounds), and each icon has its own small hover animation
// (atom spins, flask swirls, leaf sways...). Motion respects prefers-reduced-motion.
// Each item is an ordinary link, so history and direct URLs work.
// Signed in (more sections, labels were cut off): icons only; hovering or focusing an icon shows its name on a
// small hand-written sticky note (Kalam), each in its own warm colour (owner 2026-11-20: no white / black / blue).
import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { clsx } from 'clsx';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
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

/** Sticky-note colours for the icon-only navbar: paper and ink per section (warm, never white / black / blue). */
const NOTES: Partial<Record<SectionId, { paper: string; ink: string; edge: string }>> = {
  home: { paper: '#fbe6a2', ink: '#6b4a12', edge: '#d9b24c' },
  physics: { paper: '#fdd3b0', ink: '#7a3812', edge: '#e0915a' },
  chemistry: { paper: '#f8c4b4', ink: '#8a2c1e', edge: '#d9786a' },
  biology: { paper: '#d3e9c3', ink: '#2f5a24', edge: '#86b46c' },
  tutor: { paper: '#f6c8d5', ink: '#7a2347', edge: '#d97c9c' },
  learning: { paper: '#e6d1ef', ink: '#5b2a70', edge: '#b48ac8' },
};

const SPRING = { type: 'spring', stiffness: 420, damping: 34 } as const;

export function Ribbons({ current, className }: { current: SectionId; className?: string }) {
  const { user } = useAuth();
  const sections = visibleSections(!!user);
  const iconOnly = !!user;
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
      <nav aria-label="Sections" className={clsx('relative', iconOnly && 'z-40', className)} onMouseLeave={() => setHovered(null)}>
        <ul
          ref={listRef}
          className={iconOnly
            // icons fit on every screen: no sideways scroll (it would also clip the name notes)
            ? 'flex items-center justify-center gap-1.5 py-1 sm:gap-3 lg:gap-3.5'
            : 'flex items-center gap-0.5 overflow-x-auto py-1 pl-1 pr-7 [mask-image:linear-gradient(to_right,#000_calc(100%-28px),transparent)] [scrollbar-width:none] sm:gap-1.5 lg:justify-center lg:gap-2 lg:pr-1 lg:[mask-image:none]'}
        >
          {sections.map((s) => {
            const active = s.id === current;
            const { Icon, anim } = ICONS[s.id] ?? ICONS.home!;
            const note = NOTES[s.id] ?? NOTES.home!;
            return (
              <li key={s.id} className="shrink-0">
                <Link
                  href={s.path}
                  aria-current={active ? 'page' : undefined}
                  aria-label={iconOnly ? s.label : undefined}
                  onMouseEnter={() => setHovered(s.id)}
                  onFocus={() => setHovered(s.id)}
                  onBlur={() => setHovered(null)}
                  style={{ '--nav-c': s.color } as CSSProperties}
                  className={clsx(
                    'nav-link group relative isolate flex items-center gap-2 rounded-full font-display text-[1rem] outline-none transition-colors duration-200 sm:text-[1.08rem]',
                    iconOnly ? 'p-1.5' : 'py-1.5 pl-1.5 pr-3',
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
                  <span aria-hidden className={clsx('nav-stamp', active && 'nav-stamp-on', iconOnly && '!h-8 !w-8')}>
                    <Icon className={clsx(iconOnly ? 'h-[17px] w-[17px]' : 'h-[15px] w-[15px]', anim)} strokeWidth={active ? 2.1 : 1.9} />
                  </span>
                  {!iconOnly && <span className="whitespace-nowrap">{s.label}</span>}
                  <AnimatePresence>
                    {iconOnly && hovered === s.id && (
                      <motion.span
                        key="note"
                        aria-hidden
                        className="nav-note"
                        style={{ '--note-paper': note.paper, '--note-ink': note.ink, '--note-edge': note.edge } as CSSProperties}
                        initial={{ opacity: 0, y: -6, rotate: 0, scale: 0.92 }}
                        animate={{ opacity: 1, y: 0, rotate: -2.5, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 520, damping: 26 }}
                      >
                        {s.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {active && (
                    <motion.span
                      layoutId="nav-active"
                      aria-hidden
                      className={clsx('absolute -bottom-0.5 h-[2.5px] rounded-full', iconOnly ? 'left-2.5 right-2.5' : 'left-3 right-3')}
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
