'use client';

import { SiteMedia } from '@/components/ui/SiteMedia';
import { ClipReveal, FadeUp } from '@/components/motion/Reveal';
import type { ResolvedMedia } from '@/lib/site-images';

// Home brand-story section (spec §4.1): an editorial image paired with the
// "slow fashion" narrative. Media is portal-managed (site_images slot
// "house_packaging"); defaults to the current file so nothing breaks if unset.
const DEFAULT_MEDIA: ResolvedMedia = {
  type: 'image',
  src: '/products/house/packaging.jpg',
  alt: 'SAHOS velvet hangers and packaging',
  poster: '/products/house/packaging.jpg',
};

export function House({ media = DEFAULT_MEDIA }: { media?: ResolvedMedia } = {}) {
  return (
    <section className="house" id="house">
      <ClipReveal className="house__media">
        <SiteMedia
          type={media.type}
          src={media.src}
          poster={media.poster}
          alt={media.alt}
          sizes="(max-width: 900px) 100vw, 55vw"
          placeholderLabel="SAHOS"
          tone="#EAE6E1"
        />
      </ClipReveal>

      <div>
        <span className="rule-gold rule-gold--left" aria-hidden />
        <FadeUp as="h2" className="house__title" delay={0.05}>
          Crafting beauty: Our slow fashion journey
        </FadeUp>
        <FadeUp as="p" className="house__body" delay={0.1}>
          Our inspiration blends high fashion with everyday elegance, proving that style can be both
          sexy and attainable when a designer genuinely cares about the female form. At SAHOS, slow
          fashion means we pour care into every stitch, ensuring our customers receive the highest
          form of satisfaction. Each garment is crafted with intention, reflecting our commitment to
          quality and timeless design.
        </FadeUp>
      </div>
    </section>
  );
}
