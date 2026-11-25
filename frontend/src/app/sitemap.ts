import type { MetadataRoute } from 'next';
import { PUBLIC_PAGES, SITE_URL } from '@/lib/site';

// Served at /sitemap.xml: only the public pages (see PUBLIC_PAGES).
export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PAGES.map((path) => ({
    url: path === '/' ? SITE_URL : `${SITE_URL}${path}`,
    changeFrequency: 'monthly',
    priority: path === '/' ? 1 : ['/physics', '/chemistry', '/biology', '/story'].includes(path) ? 0.8 : 0.5,
  }));
}
