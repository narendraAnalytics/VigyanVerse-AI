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

/** Side padding that keeps lines a comfortable length however wide the page gets. */
const PAD = 'max(var(--page-pad), calc((100% - 46rem) / 2))';

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
  /** A full-page layer behind the content (e.g. the image page's graph paper). */
  backdrop?: ReactNode;
}

export function PageFrame({ side, scrollKey, children, className, ruled = false, margin = false, runningHead, folio, backdrop }: PageFrameProps) {
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
      // the navbar is printed over the top of every page
      style={{ paddingTop: 'var(--head-h, 0px)' }}
    >
      {backdrop}
      {ruled && <div aria-hidden className="paper-ruled pointer-events-none absolute inset-x-0 bottom-0" style={{ top: 'var(--head-h, 0px)' }} />}
      {margin && <div aria-hidden className="margin-line" style={{ left: `calc(${PAD} + 1.6rem)`, top: 'var(--head-h, 0px)' }} />}
      {runningHead && (
        <div className="relative z-[1] flex items-center justify-between pt-4 text-[0.78rem] italic text-ink-faint" style={{ paddingInline: PAD }}>
          {runningHead}
        </div>
      )}
      <div ref={ref} className={clsx('page-scroll relative z-[1] min-h-0 flex-1 pb-8 pt-4', className)} style={{ paddingInline: PAD }}>
        {children}
      </div>
      {folio && (
        <div style={{ paddingInline: PAD }} className={clsx('relative z-[1] pb-3 font-display text-sm italic text-ink-faint', side === 'left' ? 'text-left' : 'text-right')}>
          {folio}
        </div>
      )}
    </div>
  );
}
