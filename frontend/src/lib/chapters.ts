'use client';

import { useEffect } from 'react';
import { createStore, useStore } from './store';
import { fetchChapters, type Chapter, type Subject } from './api';

const chapterStore = createStore<{ chapters: Chapter[]; loaded: boolean; error: string | null }>({ chapters: [], loaded: false, error: null });
let loading: Promise<void> | null = null;

function load() {
  if (!loading) {
    loading = fetchChapters()
      .then((chapters) => chapterStore.set({ chapters, loaded: true, error: null }))
      .catch((e: Error & { code?: string }) => {
        console.error('[chapters] load failed', e.code, e.message);
        chapterStore.set({ loaded: true, error: e.message || 'failed' });
        loading = null;
      });
  }
  return loading;
}

/** CBSE Class 10 chapters (public data), loaded once and shared by every page. */
export function useChapters(subject?: Subject) {
  const state = useStore(chapterStore);
  useEffect(() => { void load(); }, []);
  const chapters = subject ? state.chapters.filter((c) => c.subject_code === subject) : state.chapters;
  return { ...state, chapters, retry: () => { loading = null; void load(); } };
}
