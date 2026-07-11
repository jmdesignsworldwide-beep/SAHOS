import type { MetadataRoute } from 'next';
import { fetchAllProducts } from '@/lib/catalog';
import { SITE_URL } from '@/lib/seo';

// Dynamic sitemap for the public store: home, every active product, Our Story
// and Contact — on the canonical www.sahoshop.com origin. Products come from the
// catalog (Supabase, falling back to the static five) so new pieces added in the
// portal appear automatically. Private surfaces (/portal, /api, /checkout) are
// intentionally excluded and also blocked in robots.ts.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/our-story`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: 'yearly', priority: 0.5 },
  ];

  let productEntries: MetadataRoute.Sitemap = [];
  try {
    const products = await fetchAllProducts();
    productEntries = products.map((p) => ({
      url: `${SITE_URL}/product/${p.slug}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    }));
  } catch {
    // fetchAllProducts already falls back to the static catalog on error; this
    // extra guard just ensures the sitemap still renders the static pages.
    productEntries = [];
  }

  return [...staticEntries, ...productEntries];
}
