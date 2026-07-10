'use client';

import { SiteMedia } from '@/components/ui/SiteMedia';
import { ClipReveal, FadeUp } from '@/components/motion/Reveal';
import type { ResolvedMedia } from '@/lib/site-images';

// Home brand-story block, sibling to "Crafting beauty" (House) but MIRRORED:
// image on the RIGHT, text on the LEFT — so the two editorial splits alternate
// down the page. Reuses the .house* visual language (same image treatment and
// text size) with a .house--reverse modifier for the reversed columns. Media is
// portal-managed (site_images slot "home_uniquely"); if empty, the elegant SAHOS
// placeholder shows so there is never a black hole.
const DEFAULT_MEDIA: ResolvedMedia = {
  type: 'image',
  src: '/home/uniquely-yours.jpg',
  alt: 'SAHOS — uniquely yours, designed with intention',
  poster: '/home/uniquely-yours.jpg',
};

export function UniquelyYours({ media = DEFAULT_MEDIA }: { media?: ResolvedMedia } = {}) {
  return (
    <section className="house house--reverse" id="uniquely">
      <ClipReveal className="house__media">
        <SiteMedia
          type={media.type}
          src={media.src}
          poster={media.poster}
          alt={media.alt}
          sizes="(max-width: 900px) 100vw, 55vw"
          placeholderLabel="Uniquely Yours"
          tone="#EAE6E1"
        />
      </ClipReveal>

      <div>
        <span className="rule-gold rule-gold--left" aria-hidden />
        <FadeUp as="h2" className="house__title" delay={0.05}>
          Uniquely yours, designed with intention
        </FadeUp>
        <FadeUp as="p" className="house__body" delay={0.1}>
          In a world of fast trends, SAHOS stands for something slow and intentional. We believe
          every woman deserves to feel confident in her clothes, without the need for tailoring or
          enhancements. Our designs are meticulously developed to complement all body types,
          focusing on curves and waists to ensure you feel your absolute best. It&rsquo;s this
          dedication that makes each piece truly special and takes significant time to perfect.
        </FadeUp>
      </div>
    </section>
  );
}
