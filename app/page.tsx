import { Intro } from '@/components/motion/Intro';
import { Hero } from '@/components/home/Hero';
import { Manifesto } from '@/components/home/Manifesto';
import { CollectionGrid } from '@/components/home/CollectionGrid';
import { Campaign } from '@/components/home/Campaign';
import { House } from '@/components/home/House';
import { Footer } from '@/components/layout/Footer';

// Home (spec §4.1): intro → hero → manifesto → collection → campaign → house →
// footer. Sections are client components carrying their own scroll timelines.
export default function HomePage() {
  return (
    <>
      <Intro />
      <main>
        <Hero />
        <Manifesto />
        <CollectionGrid />
        <Campaign
          image="/products/campaign/campaign-1.jpg"
          label="Campaign"
          line="Not a wardrobe. A confession."
          tone="#D8D2CB"
        />
        <House />
        <Campaign
          image="/products/campaign/campaign-2.jpg"
          label="Campaign"
          line="Made to be seen."
          tone="#CFC9C1"
        />
      </main>
      <Footer />
    </>
  );
}
