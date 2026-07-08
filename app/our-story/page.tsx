import type { Metadata } from 'next';
import { Footer } from '@/components/layout/Footer';
import { FadeUp, ClipReveal } from '@/components/motion/Reveal';
import { SiteMedia } from '@/components/ui/SiteMedia';
import { getSiteImageMap } from '@/lib/site-images.server';
import { resolveSiteMedia } from '@/lib/site-images';

// Reflect portal image edits without a redeploy.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Our Story',
  description:
    'The story behind SAHOS — a brand born from passion, craftsmanship, and a deep commitment to empowering women through slow fashion.',
};

// Our Story (spec: brand narrative). Five airy sections in the house serif, no
// full-bleed imagery — every photo is contained within its column with generous
// margin so the WhatsApp-grade source compression reads softer. Section figures
// carry a slow Ken Burns breathe (globals.css) plus the site-wide clip reveal.
// The three photos are portal-managed via site_images (slots our_story_*),
// falling back to the /public files until the owner uploads originals.
export default async function OurStoryPage() {
  const siteImages = await getSiteImageMap();
  const founder = resolveSiteMedia(siteImages, 'our_story_founder');
  const philosophy = resolveSiteMedia(siteImages, 'our_story_philosophy');
  const design = resolveSiteMedia(siteImages, 'our_story_design');

  return (
    <>
      {/* Section 1 — Intro */}
      <header className="story-intro">
        <FadeUp as="p" className="label story-intro__kicker">
          Our Story
        </FadeUp>
        <FadeUp as="h1" className="story-intro__title" delay={0.05}>
          Our journey to intentional fashion
        </FadeUp>
        <FadeUp as="p" className="story-intro__body" delay={0.1}>
          Discover the story behind SAHOS — a brand born from passion, craftsmanship, and a deep
          commitment to empowering women through slow fashion. We believe every garment should be
          intentional, made to celebrate your unique beauty.
        </FadeUp>
      </header>

      <main className="story">
        {/* Section 2 — Founder story · image left / text right */}
        <section className="story-row">
          <ClipReveal className="story-figure">
            <SiteMedia
              type={founder.type}
              src={founder.src}
              poster={founder.poster}
              alt={founder.alt}
              sizes="(max-width: 900px) 100vw, 45vw"
              placeholderLabel="Founder"
              tone="#EAE6E1"
              className="story-figure__img"
            />
          </ClipReveal>
          <div className="story-copy">
            <FadeUp as="h2" className="story-copy__title">
              From hardship to creativity
            </FadeUp>
            <FadeUp as="p" className="story-copy__body" delay={0.05}>
              Born and raised in New York with a passion for fashion, I turned my hardships into
              creativity. My goal for SAHOS is to show women that fashion can still be intentional
              and made for every body. I want women to feel confident and flaunt their best
              features. It took nearly two years of trial and error to perfect this collection,
              and I&rsquo;m committed to creating clothing that truly makes you feel your best.
            </FadeUp>
          </div>
        </section>

        {/* Section 3 — Philosophy · text left / image right */}
        <section className="story-row story-row--reverse">
          <ClipReveal className="story-figure">
            <SiteMedia
              type={philosophy.type}
              src={philosophy.src}
              poster={philosophy.poster}
              alt={philosophy.alt}
              sizes="(max-width: 900px) 100vw, 45vw"
              placeholderLabel="Philosophy"
              tone="#EAE6E1"
              className="story-figure__img"
            />
          </ClipReveal>
          <div className="story-copy">
            <FadeUp as="h2" className="story-copy__title">
              Confidence in every stitch
            </FadeUp>
            <FadeUp as="p" className="story-copy__body" delay={0.05}>
              When women wear SAHOS, I want them to remember that the features they so often try to
              hide can become their greatest confidence — with the right design and craftsmanship.
              Every piece is thoughtfully created to enhance your natural beauty, embracing both
              your outer and inner confidence.
            </FadeUp>
          </div>
        </section>
      </main>

      {/* Section 4 — Testimonial · centered on a subtle cream band */}
      <section className="story-quote">
        <FadeUp as="blockquote" className="story-quote__text">
          &ldquo;SAHOS truly understands women&rsquo;s needs. Their clothing makes me feel elegant
          and confident, unlike anything I&rsquo;ve worn before.&rdquo;
        </FadeUp>
        <FadeUp as="p" className="story-quote__by" delay={0.08}>
          — Women
        </FadeUp>
      </section>

      <main className="story">
        {/* Section 5 — Design philosophy · image left / text right */}
        <section className="story-row">
          <ClipReveal className="story-figure">
            <SiteMedia
              type={design.type}
              src={design.src}
              poster={design.poster}
              alt={design.alt}
              sizes="(max-width: 900px) 100vw, 45vw"
              placeholderLabel="Design"
              tone="#EAE6E1"
              className="story-figure__img"
            />
          </ClipReveal>
          <div className="story-copy">
            <FadeUp as="h2" className="story-copy__title">
              Our unique design philosophy
            </FadeUp>
            <FadeUp as="p" className="story-copy__body" delay={0.05}>
              Our design process is a labor of love that took nearly two years to develop and
              perfect. Every detail is built around women&rsquo;s bodies and needs. SAHOS stands
              apart because it isn&rsquo;t fast fashion — it&rsquo;s intentional. We are committed to
              slow fashion, craftsmanship, and attention to detail, ensuring every garment feels
              tailored and unique.
            </FadeUp>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
