import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@insforge/sdk/ssr/middleware';

// Keeps the auth cookies fresh before a page renders.
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  await updateSession({ requestCookies: request.cookies, responseCookies: response.cookies });
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png|robots.txt|sitemap.xml|api/auth/refresh|.*\\.(?:png|jpg|svg|webp|ico)$).*)'],
};
