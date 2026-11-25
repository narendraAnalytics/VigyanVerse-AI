import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// Served at /robots.txt. Signed-in pages are NOT blocked here on purpose: they carry a noindex tag,
// and Google can only see that tag if it may fetch the page. Only the auth API is off limits.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/api/' },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
