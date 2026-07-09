'use client';

import { SiteMedia } from '@/components/ui/SiteMedia';
import { SplitReveal } from '@/components/motion/SplitReveal';
import { useParallax } from '@/hooks/useReveal';
import type { ResolvedMedia } from '@/lib/site-images';

// Full-bleed editorial hero (spec §4.1). The founder image — or a looping video —
// is the hero; the title reveals letter-by-letter; the media drifts on a scrubbed
// parallax. Portal-managed (site_images slot "home_hero"), each slot a still or a
// clip. The SAHOS wordmark lives in the top nav only — no duplicate logo is
// overlaid on the media.
const DEFAULT_MEDIA: ResolvedMedia = {
  type: 'image',
  src: '/home/hero-founder.jpg',
  alt: 'SAHOS — the founder',
  poster: '/home/hero-founder.jpg',
};

export function Hero({ media = DEFAULT_MEDIA }: { media?: ResolvedMedia } = {}) {
  const parallaxRef = useParallax<HTMLDivElement>(90);

  return (
    <section className="hero">
      <div ref={parallaxRef} className="hero__media">
        <SiteMedia
          type={media.type}
          src={media.src}
          poster={media.poster}
          alt={media.alt}
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
