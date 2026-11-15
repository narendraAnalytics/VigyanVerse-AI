'use client';

import { useSyncExternalStore } from 'react';

function mediaStore(query: string) {
  return {
    subscribe(fn: () => void) {
      if (typeof window === 'undefined') return () => {};
      const mq = window.matchMedia(query);
      mq.addEventListener('change', fn);
      return () => mq.removeEventListener('change', fn);
    },
    get() {
      return typeof window !== 'undefined' && window.matchMedia(query).matches;
    },
  };
}

const reduced = mediaStore('(prefers-reduced-motion: reduce)');
const spread = mediaStore('(min-width: 1024px)');

export function useReducedMotion(): boolean {
  return useSyncExternalStore(reduced.subscribe, reduced.get, () => false);
}

/** Two-page spread on wide screens; a single page on phones and portrait tablets. */
export function useSpread(): boolean {
  return useSyncExternalStore(spread.subscribe, spread.get, () => true);
}

/** Few cores, little memory or a data-saver setting: simpler 3D and page turns. */
export function isLowPower(): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  return (nav.hardwareConcurrency ?? 8) <= 2 || (nav.deviceMemory ?? 8) <= 2 || nav.connection?.saveData === true;
}

export function useLowPower(): boolean {
  return useSyncExternalStore(() => () => {}, isLowPower, () => false);
}
