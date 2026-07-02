import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';

// Keep the private admin portal out of search engines (spec §2).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/portal', '/portal/', '/checkout/'],
    },
    sitemap: `${env.siteUrl}/sitemap.xml`,
  };
}
