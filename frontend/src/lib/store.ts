'use client';

// A tiny external store. Feature state (chat, quiz, uploads) lives here instead of inside a
// component, so the copy of a page drawn on a turning leaf shows the same content as the page.
import { useSyncExternalStore } from 'react';

export interface Store<T> {
  get: () => T;
  set: (next: Partial<T> | ((prev: T) => Partial<T>)) => void;
  subscribe: (fn: () => void) => () => void;
  reset: () => void;
}

export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set: (next) => {
      const patch = typeof next === 'function' ? next(state) : next;
      state = { ...state, ...patch };
      listeners.forEach((l) => l());
    },
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    reset: () => {
      state = initial;
      listeners.forEach((l) => l());
    },
  };
}

export function useStore<T extends object>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
