import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

// Let search engines crawl the public store, but keep the private admin portal,
// the API routes and the checkout flow out of the index (spec §2). The sitemap
// is advertised on the canonical origin so Search Console picks it up.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/portal', '/portal/', '/api/', '/checkout/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
