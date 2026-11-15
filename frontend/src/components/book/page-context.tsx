'use client';

import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { clsx } from 'clsx';

/**
 * A page drawn on a turning leaf is a "preview": it must look like the real page but stay
 * cheap and inert (no WebGL canvas, no timers, no focusable controls).
 */
const PreviewContext = createContext(false);
export const PreviewProvider = PreviewContext.Provider;
export function usePreview(): boolean {
  return useContext(PreviewContext);
}

/** 'spread' = two pages side by side; 'single' = one tall page (phones, portrait tablets). */
const LayoutContext = createContext<'spread' | 'single'>('spread');
export const LayoutProvider = LayoutContext.Provider;
export function usePageLayout() {
  return useContext(LayoutContext);
}

// Remember each page's scroll position so the copy on the turning leaf matches it.
const scrollMemory = new Map<string, number>();

interface PageFrameProps {
  side: 'left' | 'right' | 'single';
  scrollKey: string;
  children: ReactNode;
  className?: string;
  ruled?: boolean;
  margin?: boolean;
  /** A small running head at the top of the page, like a printed textbook. */
  runningHead?: ReactNode;
  folio?: ReactNode;
}

export function PageFrame({ side, scrollKey, children, className, ruled = false, margin = false, runningHead, folio }: PageFrameProps) {
  const preview = usePreview();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = scrollMemory.get(scrollKey) ?? 0;
    if (preview) return;
    const onScroll = () => scrollMemory.set(scrollKey, el.scrollTop);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [scrollKey, preview]);

  return (
    <div
      className={clsx(
        'paper grain absolute inset-0 flex flex-col overflow-hidden',
        side === 'left' && 'paper-left',
        side === 'right' && 'paper-right',
      )}
    >
      {ruled && <div aria-hidden className="paper-ruled pointer-events-none absolute inset-0" />}
      {margin && <div aria-hidden className="margin-line" style={{ left: 'calc(var(--page-pad) + 1.6rem)' }} />}
      {runningHead && (
        <div className="relative z-[1] flex items-center justify-between px-[var(--page-pad)] pt-4 text-[0.78rem] italic text-ink-faint">
          {runningHead}
        </div>
      )}
      <div ref={ref} className={clsx('page-scroll relative z-[1] min-h-0 flex-1 px-[var(--page-pad)] pb-8 pt-4', className)}>
        {children}
      </div>
      {folio && (
        <div className={clsx('relative z-[1] px-[var(--page-pad)] pb-3 font-display text-sm italic text-ink-faint', side === 'left' ? 'text-left' : 'text-right')}>
          {folio}
        </div>
      )}
    </div>
  );
}
