'use client';

import { createClient } from '@insforge/sdk';
import { createBrowserClient } from '@insforge/sdk/ssr';

type BrowserClient = ReturnType<typeof createBrowserClient>;
let client: BrowserClient | null = null;
let anon: ReturnType<typeof createClient> | null = null;

/** An anonymous client for public reference data (chapters), usable before sign-in. */
export function publicClient() {
  if (!anon) anon = createClient({ baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL, anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY });
  return anon;
}

/**
 * The browser SDK client. It reads the short-lived access token cookie and refreshes it through
 * /api/auth/refresh. Sign-in / sign-up / sign-out run on the server (src/app/api/auth/*) so the
 * refresh token stays in an httpOnly cookie.
 */
export function insforge(): BrowserClient {
  // Edge Functions may take up to their 30 s limit: give the request a little longer.
  if (!client) client = createBrowserClient({ timeout: 40_000 });
  return client;
}
