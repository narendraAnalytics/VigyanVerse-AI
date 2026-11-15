'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { insforge } from './insforge';
import type { Lang } from './api';

export interface Profile {
  id: string;
  role: 'student' | 'parent' | 'teacher' | 'admin';
  display_name: string;
  preferred_language: Lang;
}

export interface StudentRow {
  profile_id: string;
  board_code: string | null;
  grade: number;
  birth_year: number | null;
  onboarding_completed_at: string | null;
}

interface AuthState {
  loading: boolean;
  user: { id: string; email: string; name?: string } | null;
  profile: Profile | null;
  student: StudentRow | null;
  /** Reload the session, profile and student rows (after sign-in, onboarding, ...). */
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  language: Lang;
  setLanguage: (lang: Lang) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export async function authPost<T = Record<string, unknown>>(action: string, body: unknown): Promise<T> {
  const res = await fetch(`/api/auth/${action}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message ?? 'Something went wrong.'), { code: data.error, status: res.status });
  return data as T;
}

interface SessionUser { id: string; email: string; name?: string }

function cookieValue(name: string): string | null {
  const m = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
  return m ? decodeURIComponent(m.slice(name.length + 1)) : null;
}

function jwtUser(token: string | null): SessionUser | null {
  if (!token) return null;
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const p = JSON.parse(decodeURIComponent(escape(atob(part)))) as { sub?: string; email?: string; exp?: number; profile?: { name?: string } };
    if (!p.sub || (p.exp && p.exp * 1000 < Date.now() + 15_000)) return null;
    return { id: p.sub, email: p.email ?? '', name: p.profile?.name };
  } catch {
    return null;
  }
}

/**
 * The signed-in user. The SDK's browser client does not read its own login cookie in
 * getCurrentUser(), so read the short-lived access-token cookie directly and, if it is missing
 * or about to expire, renew it through the app's refresh route (which holds the httpOnly cookie).
 */
async function readSession(): Promise<SessionUser | null> {
  const fromCookie = jwtUser(cookieValue('insforge_access_token'));
  if (fromCookie) return fromCookie;
  try {
    const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include', headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const body = (await res.json()) as { user?: { id: string; email: string; profile?: { name?: string } } };
    if (!body.user) return null;
    return { id: body.user.id, email: body.user.email, name: body.user.profile?.name };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthState['user']>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [student, setStudent] = useState<StudentRow | null>(null);
  const [language, setLang] = useState<Lang>('en');

  const refresh = useCallback(async () => {
    const client = insforge();
    const u = await readSession();
    if (!u) {
      setUser(null); setProfile(null); setStudent(null); setLoading(false);
      return;
    }
    const name = u.name;
    // The client was built before this login: hand it the fresh token from the cookie.
    const fresh = cookieValue('insforge_access_token');
    if (fresh) client.setAccessToken(fresh);
    setUser({ id: u.id, email: u.email, name });
    const [p, s] = await Promise.all([
      client.database.from('profiles').select('id, role, display_name, preferred_language').eq('id', u.id).limit(1),
      client.database.from('students').select('profile_id, board_code, grade, birth_year, onboarding_completed_at').eq('profile_id', u.id).limit(1),
    ]);
    const prof = (p.data as Profile[] | null)?.[0] ?? null;
    setProfile(prof);
    setStudent((s.data as StudentRow[] | null)?.[0] ?? null);
    if (prof) setLang(prof.preferred_language);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    await authPost('sign-out', {}).catch(() => {});
    setUser(null); setProfile(null); setStudent(null);
  }, []);

  const setLanguage = useCallback((lang: Lang) => {
    setLang(lang);
    if (profile) void insforge().database.from('profiles').update({ preferred_language: lang }).eq('id', profile.id);
  }, [profile]);

  const value = useMemo(
    () => ({ loading, user, profile, student, refresh, signOut, language, setLanguage }),
    [loading, user, profile, student, refresh, signOut, language, setLanguage],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}

/** Where a signed-in account should go next, or null when it is ready to learn. */
export function nextSetupStep(state: Pick<AuthState, 'user' | 'profile' | 'student'>): '/sign-in' | '/onboarding' | '/parent' | null {
  if (!state.user) return '/sign-in';
  if (!state.profile) return '/onboarding';
  if (state.profile.role === 'parent') return '/parent';
  if (state.profile.role === 'student' && !state.student?.onboarding_completed_at) return '/onboarding';
  return null;
}
