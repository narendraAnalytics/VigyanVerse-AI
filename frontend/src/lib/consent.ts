'use client';

import { useEffect } from 'react';
import { createStore, useStore } from './store';
import { CONSENT_TYPES, rpc, type ConsentType } from './api';
import { useAuth } from './auth';

type ConsentMap = Record<ConsentType, boolean>;
const empty = Object.fromEntries(CONSENT_TYPES.map((t) => [t, false])) as ConsentMap;
const consentStore = createStore<{ forUser: string | null; consent: ConsentMap; loaded: boolean }>({ forUser: null, consent: empty, loaded: false });

export async function loadConsent(userId: string) {
  const values = await Promise.all(
    CONSENT_TYPES.map((t) => rpc<boolean>('has_consent', { p_student: userId, p_consent_type: t }).catch(() => false)),
  );
  consentStore.set({ forUser: userId, loaded: true, consent: Object.fromEntries(CONSENT_TYPES.map((t, i) => [t, values[i] === true])) as ConsentMap });
}

/** The signed-in student's current parental consent (the backend checks it again on every call). */
export function useConsent() {
  const { user, profile } = useAuth();
  const state = useStore(consentStore);
  const id = user?.id ?? null;
  useEffect(() => {
    if (id && profile?.role === 'student' && state.forUser !== id) void loadConsent(id);
  }, [id, profile?.role, state.forUser]);
  return { ...state, reload: () => (id ? loadConsent(id) : Promise.resolve()) };
}
