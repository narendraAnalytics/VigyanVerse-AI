// OAuth return: exchange the code on the server so the refresh token stays httpOnly.
import { NextResponse, type NextRequest } from 'next/server';
import { createAuthActions } from '@insforge/sdk/ssr';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('insforge_code');
  const verifier = request.cookies.get('insforge_code_verifier')?.value;
  if (!code || !verifier) return NextResponse.redirect(new URL('/sign-in?error=oauth_failed', request.url));

  // The home page shows a "finish your bookplate" button for accounts that have no profile yet.
  const response = NextResponse.redirect(new URL('/', request.url));
  const auth = createAuthActions({ requestCookies: request.cookies, responseCookies: response.cookies });
  const { data, error } = await auth.exchangeOAuthCode(code, verifier);
  if (error || !data?.user) return NextResponse.redirect(new URL('/sign-in?error=oauth_failed', request.url));
  response.cookies.delete('insforge_code_verifier');
  return response;
}
