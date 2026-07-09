'use client';

import { SiteMedia } from '@/components/ui/SiteMedia';
import { useParallax } from '@/hooks/useReveal';
import type { ResolvedMedia } from '@/lib/site-images';

// Full-bleed editorial hero (spec §4.1). A clean, full-screen founder image — or
// a looping video — with NO text overlaid; the media drifts on a scrubbed
// parallax. Portal-managed (site_images slot "home_hero"), each slot a still or a
// clip. Only the top nav sits over the photo (kept legible by a whisper-soft top
// gradient). The SAHOS wordmark lives in the nav — never burned onto the media.
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
    </section>
  );
}
