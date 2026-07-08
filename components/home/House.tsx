'use client';

import { SmartImage } from '@/components/ui/SmartImage';
import { ClipReveal, FadeUp } from '@/components/motion/Reveal';

// "Our Story" home section (spec §4.1): the velvet hangers / packaging framed
// as ceremony. (Eyebrow reads "Our Story"; kept the #house id/section shape.)
// Image is portal-managed (site_images slot "house_packaging"); props default
// to the current file so nothing breaks if unset.
export function House({
  src = '/products/house/packaging.jpg',
  alt = 'SAHOS velvet hangers and packaging',
}: {
  src?: string;
  alt?: string;
} = {}) {
  return (
    <section className="house" id="house">
      <ClipReveal className="house__media">
        <SmartImage
          src={src}
          alt={alt}
          fill
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
