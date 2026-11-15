'use client';

// Hand-offs between pages ("ask the tutor about this chapter", "practise this chapter").
// Kept in memory, not the URL, so pages stay statically renderable.
import { createStore } from './store';
import type { Subject } from './api';

export const tutorIntent = createStore<{ subject: Subject | null; draft: string | null }>({ subject: null, draft: null });
export const learningIntent = createStore<{ quizChapterId: string | null }>({ quizChapterId: null });
