import { createClient } from '@insforge/sdk';
import { readEnv, requireEnv } from './env.ts';

export function corsHeaders(): Record<string, string> {
  return {
    // Set ALLOWED_ORIGIN to the frontend URL in production; '*' only for local dev.
    'Access-Control-Allow-Origin': readEnv('ALLOWED_ORIGIN') ?? '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  });
}

export function preflight(req: Request): Response | null {
  return req.method === 'OPTIONS' ? new Response(null, { status: 204, headers: corsHeaders() }) : null;
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
