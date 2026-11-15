// Auth mutations run on the server so the refresh token lands in an httpOnly cookie.
// POST /api/auth/sign-in | sign-up | verify | resend | sign-out | forgot | reset | oauth
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@insforge/sdk';
import { createAuthActions } from '@insforge/sdk/ssr';
import { z } from 'zod';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

const Email = z.string().trim().toLowerCase().email().max(200);
const Password = z.string().min(8).max(128);
const Code = z.string().trim().regex(/^\d{6}$/);

const schemas = {
  'sign-in': z.object({ email: Email, password: z.string().min(1).max(128) }),
  'sign-up': z.object({ email: Email, password: Password, name: z.string().trim().min(1).max(60) }),
  verify: z.object({ email: Email, otp: Code }),
  resend: z.object({ email: Email }),
  'sign-out': z.object({}).passthrough(),
  forgot: z.object({ email: Email }),
  reset: z.object({ email: Email, code: Code, newPassword: Password }),
  oauth: z.object({ provider: z.enum(['google', 'github']) }),
} as const;

type Action = keyof typeof schemas;

function fail(message: string, status = 400, code = 'AUTH_ERROR') {
  return NextResponse.json({ error: code, message }, { status });
}

function errorOf(error: { message?: string; statusCode?: number; error?: string } | null | undefined, fallback: string) {
  return fail(error?.message ?? fallback, error?.statusCode && error.statusCode >= 400 ? error.statusCode : 400, error?.error ?? 'AUTH_ERROR');
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  if (!(action in schemas)) return fail('Unknown action', 404, 'NOT_FOUND');
  const parsed = schemas[action as Action].safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the form and try again.');
  const body = parsed.data as Record<string, string>;

  const response = NextResponse.json({ ok: true });
  const auth = createAuthActions({ requestCookies: request.cookies, responseCookies: response.cookies });
  const reply = (payload: unknown) => NextResponse.json(payload, { headers: response.headers });

  switch (action as Action) {
    case 'sign-in': {
      const { data, error } = await auth.signInWithPassword({ email: body.email, password: body.password });
      if (error || !data?.user) {
        if (error?.statusCode === 403) return fail('Verify your email first. We sent you a 6-digit code.', 403, 'EMAIL_NOT_VERIFIED');
        return errorOf(error, 'Email or password is not right.');
      }
      return reply({ user: { id: data.user.id, email: data.user.email } });
    }
    case 'sign-up': {
      const { data, error } = await auth.signUp({ email: body.email, password: body.password, name: body.name, redirectTo: `${APP_URL}/sign-in` });
      if (error) return errorOf(error, 'Could not create the account.');
      return reply({ requireEmailVerification: Boolean(data?.requireEmailVerification), user: data?.user ? { id: data.user.id } : null });
    }
    case 'verify': {
      const { data, error } = await auth.verifyEmail({ email: body.email, otp: body.otp });
      if (error || !data?.user) return errorOf(error, 'That code is not right or has expired.');
      return reply({ user: { id: data.user.id, email: data.user.email } });
    }
    case 'resend': {
      const client = createClient({ baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL, anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY });
      await client.auth.resendVerificationEmail({ email: body.email, redirectTo: `${APP_URL}/sign-in` });
      // Same answer whether or not the email exists.
      return reply({ ok: true });
    }
    case 'sign-out': {
      await auth.signOut();
      return reply({ ok: true });
    }
    case 'forgot': {
      const client = createClient({ baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL, anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY });
      await client.auth.sendResetPasswordEmail({ email: body.email, redirectTo: `${APP_URL}/reset-password` });
      return reply({ ok: true });
    }
    case 'reset': {
      const client = createClient({ baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL, anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY });
      const exchanged = await client.auth.exchangeResetPasswordToken({ email: body.email, code: body.code });
      if (exchanged.error || !exchanged.data?.token) return errorOf(exchanged.error, 'That code is not right or has expired.');
      const done = await client.auth.resetPassword({ newPassword: body.newPassword, otp: exchanged.data.token });
      if (done.error) return errorOf(done.error, 'Could not change the password.');
      return reply({ ok: true });
    }
    case 'oauth': {
      const { data, error } = await auth.signInWithOAuth(body.provider as 'google' | 'github', {
        redirectTo: `${APP_URL}/api/auth/callback`,
        skipBrowserRedirect: true,
      });
      if (error || !data?.url || !data.codeVerifier) return errorOf(error, 'Could not start sign-in.');
      const res = reply({ url: data.url });
      res.cookies.set('insforge_code_verifier', data.codeVerifier, {
        httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 600,
      });
      return res;
    }
  }
}
