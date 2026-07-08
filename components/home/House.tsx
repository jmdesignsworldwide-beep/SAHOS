'use client';

import { SiteMedia } from '@/components/ui/SiteMedia';
import { ClipReveal, FadeUp } from '@/components/motion/Reveal';
import type { ResolvedMedia } from '@/lib/site-images';

// "Our Story" home section (spec §4.1): the velvet hangers / packaging framed
// as ceremony. (Eyebrow reads "Our Story"; kept the #house id/section shape.)
// Media is portal-managed (site_images slot "house_packaging"); defaults to the
// current file so nothing breaks if unset.
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
          placeholderLabel="Our Story"
          tone="#EAE6E1"
        />
      </ClipReveal>

      <div>
        <FadeUp as="p" className="label" >
          Our Story
        </FadeUp>
        <FadeUp as="h2" className="house__title" delay={0.05}>
          A confession, wrapped in ceremony.
        </FadeUp>
        <FadeUp as="p" className="house__body" delay={0.1}>
          Every piece arrives on a velvet hanger, folded into packaging made to be opened slowly.
          Not a wardrobe — five pieces, chosen. The ritual is part of the object.
        </FadeUp>
      </div>
    </section>
  );
}
