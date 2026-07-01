'use client';

import { SmartImage } from '@/components/ui/SmartImage';
import { SplitReveal } from '@/components/motion/SplitReveal';
import { useParallax } from '@/hooks/useReveal';

// Full-bleed editorial hero (spec §4.1). Model image is the hero; the title
// reveals letter-by-letter; the image drifts on a scrubbed parallax.
export function Hero() {
  const parallaxRef = useParallax<HTMLDivElement>(90);

  return (
    <section className="hero">
      <div ref={parallaxRef} className="hero__media">
        <SmartImage
          src="/products/campaign/hero.jpg"
          alt="SAHOS — The Marilyn Collection campaign"
          fill
          priority
          sizes="100vw"
          placeholderLabel="The Marilyn Collection"
          tone="#E9E5E0"
        />
      </div>
      <div className="hero__scrim" />

      <div className="hero__content">
        <p className="hero__eyebrow label">The Marilyn Collection</p>
        <SplitReveal text="Soft glamour, made to be seen." className="hero__title" />
      </div>

      <div className="hero__scroll">Scroll</div>
    </section>
  );
}
