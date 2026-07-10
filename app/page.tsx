import { Intro } from '@/components/motion/Intro';
import { Hero } from '@/components/home/Hero';
import { BrandBanner } from '@/components/home/BrandBanner';
import { CollectionShowcase } from '@/components/home/CollectionShowcase';
import { StorySection } from '@/components/home/StorySection';
import { Campaign } from '@/components/home/Campaign';
import { House } from '@/components/home/House';
import { Footer } from '@/components/layout/Footer';
import { fetchAllProducts } from '@/lib/catalog';
import { getSiteImageMap } from '@/lib/site-images.server';
import { resolveSiteMedia } from '@/lib/site-images';

// Reflect portal edits per request (source of truth: Supabase).
export const dynamic = 'force-dynamic';

// Home (spec §4.1): intro → hero → manifesto → collection → campaign → house →
// footer. Sections are client components carrying their own scroll timelines.
// Fixed media (hero, campaign, packaging) are portal-managed via site_images —
// each slot can be a still image OR a looping video.
export default async function HomePage() {
  const [products, siteImages] = await Promise.all([fetchAllProducts(), getSiteImageMap()]);
  const hero = resolveSiteMedia(siteImages, 'home_hero');
  const campaign1 = resolveSiteMedia(siteImages, 'campaign_1');
  const campaign2 = resolveSiteMedia(siteImages, 'campaign_2');
  const packaging = resolveSiteMedia(siteImages, 'house_packaging');

  return (
    <>
      <Intro />
      <main>
        <Hero media={hero} />
        <BrandBanner />
        <CollectionShowcase products={products} />
        <Campaign media={campaign1} label="Campaign" tone="#D8D2CB" />
        <StorySection title="Uniquely yours, designed with intention">
          In a world of fast trends, SAHOS stands for something slow and intentional. We believe
          every woman deserves to feel confident in her clothes, without the need for tailoring or
          enhancements. Our designs are meticulously developed to complement all body types,
          focusing on curves and waists to ensure you feel your absolute best. It&rsquo;s this
          dedication that makes each piece truly special and takes significant time to perfect.
        </StorySection>
        <Campaign media={campaign2} label="Campaign" tone="#CFC9C1" />
        <House media={packaging} />
      </main>
      <Footer />
    </>
  );
}
