// The one public address Google should index (vigyanverseai.vercel.app stays as a working fallback,
// but every page names this domain as its canonical URL, so the two never compete in search).
export const SITE_URL = 'https://vigyanverseai.live';

// Public pages anyone can read without signing in: these go in sitemap.xml and get a canonical link.
// Signed-in pages (tutor, learning, wallet, onboarding, parent, reset-password) are noindex instead.
export const PUBLIC_PAGES = [
  '/',
  '/physics',
  '/chemistry',
  '/biology',
  '/story',
  '/faq',
  '/pricing',
  '/about',
  '/contact',
  '/terms',
  '/privacy',
  '/refunds',
] as const;
