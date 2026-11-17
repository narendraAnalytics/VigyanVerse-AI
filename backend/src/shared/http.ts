import { createClient } from '@insforge/sdk';
import { readEnv, requireEnv } from './env.ts';

/**
 * ALLOWED_ORIGIN is a comma-separated list of site origins (e.g.
 * "http://localhost:3000,https://vigyanverse.vercel.app"); '*' or unset allows any (local dev only).
 * The caller's Origin is echoed back when it is on the list, otherwise the first entry is sent
 * (the browser then blocks the response). CORS is not an auth boundary: every call is still
 * authenticated by its Bearer token.
 */
export function pickOrigin(origin: string | null): string {
  const list = (readEnv('ALLOWED_ORIGIN') ?? '*').split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean);
  if (list.length === 0 || list.includes('*')) return '*';
  return origin && list.includes(origin) ? origin : list[0];
}

export function corsHeaders(origin: string | null = null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': pickOrigin(origin),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    Vary: 'Origin',
  };
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  });
}

export function preflight(req: Request): Response | null {
  return req.method === 'OPTIONS' ? new Response(null, { status: 204, headers: corsHeaders(req.headers.get('Origin')) }) : null;
}

/** Wrap a function handler so every response carries the caller's allowed origin. */
export function withCors(handler: (req: Request) => Promise<Response>): (req: Request) => Promise<Response> {
  return async (req) => {
    const res = await handler(req);
    try {
      res.headers.set('Access-Control-Allow-Origin', pickOrigin(req.headers.get('Origin')));
      res.headers.set('Vary', 'Origin');
      return res;
    } catch {
      // Immutable headers: copy into a new response.
      const headers = new Headers(res.headers);
      headers.set('Access-Control-Allow-Origin', pickOrigin(req.headers.get('Origin')));
      headers.set('Vary', 'Origin');
      return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
    }
  };
}

/**
 * Resolve the caller from their access token. Identity always comes from the
 * verified session, never from a student_id in the request body.
 * The returned client acts as that user, so table RLS applies to every query.
 */
export async function authenticate(req: Request) {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const client = createClient({ baseUrl: requireEnv('INSFORGE_BASE_URL'), accessToken: token });
  const { data } = await client.auth.getCurrentUser();
  const userId = data?.user?.id;
  return userId ? { userId, client } : null;
}
