'use client';

import { SmartImage } from '@/components/ui/SmartImage';
import { SplitReveal } from '@/components/motion/SplitReveal';
import { useParallax } from '@/hooks/useReveal';

// Full-bleed editorial hero (spec §4.1). The founder image is the hero; the
// title reveals letter-by-letter; the image drifts on a scrubbed parallax. The
// image is portal-managed (site_images slot "home_hero"). The SAHOS wordmark
// lives in the top nav only — no duplicate logo is overlaid on the photo.
export function Hero({
  src = '/home/hero-founder.jpg',
  alt = 'SAHOS — the founder',
}: {
  src?: string;
  alt?: string;
} = {}) {
  const parallaxRef = useParallax<HTMLDivElement>(90);

  return (
    <section className="hero">
      <div ref={parallaxRef} className="hero__media">
        <SmartImage
          src={src}
          alt={alt}
          fill
          priority
          sizes="100vw"
          placeholderLabel="SAHOS"
          tone="#E9E5E0"
        />
      </div>
      <div className="hero__scrim" />

      <div className="hero__content">
        <p className="hero__eyebrow label">The Marilyn Collection</p>
        <SplitReveal text="Not a wardrobe. A confession." className="hero__title" />
      </div>

      <div className="hero__scroll">Scroll</div>
    </section>
  );
}
