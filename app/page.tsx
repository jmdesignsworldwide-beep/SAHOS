import { Intro } from '@/components/motion/Intro';
import { Hero } from '@/components/home/Hero';
import { BrandBanner } from '@/components/home/BrandBanner';
import { CollectionShowcase } from '@/components/home/CollectionShowcase';
import { Campaign } from '@/components/home/Campaign';
import { House } from '@/components/home/House';
import { Footer } from '@/components/layout/Footer';
import { fetchAllProducts } from '@/lib/catalog';
import { getSiteImageMap } from '@/lib/site-images.server';
import { resolveSiteImage } from '@/lib/site-images';

// Reflect portal edits per request (source of truth: Supabase).
export const dynamic = 'force-dynamic';

// Home (spec §4.1): intro → hero → manifesto → collection → campaign → house →
// footer. Sections are client components carrying their own scroll timelines.
// Fixed images (hero, campaign, packaging) are portal-managed via site_images.
export default async function HomePage() {
  const [products, siteImages] = await Promise.all([fetchAllProducts(), getSiteImageMap()]);
  const hero = resolveSiteImage(siteImages, 'home_hero');
  const campaign1 = resolveSiteImage(siteImages, 'campaign_1');
  const campaign2 = resolveSiteImage(siteImages, 'campaign_2');
  const packaging = resolveSiteImage(siteImages, 'house_packaging');

  return (
    <>
      <Intro />
      <main>
        <Hero src={hero.src} alt={hero.alt} />
        <BrandBanner />
        <CollectionShowcase products={products} />
        <Campaign
          image={campaign1.src}
          alt={campaign1.alt}
          label="Campaign"
          line="Not a wardrobe. A confession."
          tone="#D8D2CB"
        />
        <House src={packaging.src} alt={packaging.alt} />
        <Campaign
          image={campaign2.src}
          alt={campaign2.alt}
          label="Campaign"
          line="Made to be seen."
          tone="#CFC9C1"
        />
      </main>
      <Footer />
    </>
  );
}
