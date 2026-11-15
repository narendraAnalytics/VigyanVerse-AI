'use client';

// The navbar: cloth bookmark ribbons tucked into the top of the book. The open section's
// ribbon hangs lower. Each one is an ordinary link, so history and direct URLs work.
import Link from 'next/link';
import { clsx } from 'clsx';
import { Atom, BookOpen, FlaskConical, Leaf, MessageCircleQuestion, NotebookPen } from 'lucide-react';
import { MAIN_SECTIONS, type SectionId } from '@/lib/sections';

const ICONS: Record<string, typeof Atom> = {
  home: BookOpen, physics: Atom, chemistry: FlaskConical, biology: Leaf, tutor: MessageCircleQuestion, learning: NotebookPen,
};

export function Ribbons({ current, width }: { current: SectionId; width: number }) {
  return (
    <nav aria-label="Sections" className="relative z-20 w-full" style={{ maxWidth: width || undefined }}>
      <ul className="flex items-end gap-1 overflow-x-auto px-1 pt-1 [scrollbar-width:none] sm:gap-2 sm:px-8">
        {MAIN_SECTIONS.map((s) => {
          const active = s.id === current;
          const Icon = ICONS[s.id];
          return (
            <li key={s.id} className="shrink-0">
              <Link
                href={s.path}
                aria-current={active ? 'page' : undefined}
                className={clsx(
                  'group relative flex items-center gap-1.5 rounded-t-md px-3 text-[0.82rem] font-semibold text-paper transition-[padding,transform] duration-300 sm:px-4 sm:text-sm',
                  active ? 'pb-3 pt-2.5' : 'pb-1.5 pt-2 opacity-85 hover:-translate-y-0.5 hover:opacity-100',
                )}
                style={{
                  background: `linear-gradient(180deg, color-mix(in srgb, ${s.color} 80%, white) 0%, ${s.color} 30%, color-mix(in srgb, ${s.color} 85%, black) 100%)`,
                  boxShadow: active ? '0 -2px 10px rgba(0,0,0,.35), inset 0 -2px 0 rgba(0,0,0,.18)' : 'inset 0 -6px 8px -6px rgba(0,0,0,.45)',
                }}
              >
                <Icon aria-hidden className="h-4 w-4 opacity-90" strokeWidth={2} />
                <span>{s.label}</span>
                {active && (
                  <span aria-hidden className="absolute -bottom-[10px] left-0 right-0 h-[10px]" style={{ background: s.color, clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 35%, 0 100%)' }} />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
