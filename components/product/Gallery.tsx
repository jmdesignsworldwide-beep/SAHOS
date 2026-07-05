'use client';

import { SmartImage } from '@/components/ui/SmartImage';
import { SharedImage } from '@/components/product/SharedImage';
import { ClipReveal } from '@/components/motion/Reveal';
import type { ProductImage } from '@/lib/types';

// Left column, the protagonist (spec §4.3): a vertical stack of model shots,
// natural scroll, each frame clip-revealing as it enters. The FIRST frame is the
// hero — it participates in the shared-element transition (grows from / shrinks
// back to the collection card), so it renders via SharedImage without the clip
// reveal (which would fight the morph); the rest keep the clip reveal on scroll.
export function Gallery({ images, name, slug }: { images: ProductImage[]; name: string; slug: string }) {
  return (
    <div className="gallery">
      {images.map((img, i) =>
        i === 0 ? (
          <div key={img.url} className="gallery__frame">
            <SharedImage
              slug={slug}
              kind="hero"
              url={img.url}
              alt={img.alt}
              priority
              sizes="(max-width: 900px) 100vw, 60vw"
              placeholderLabel={name}
              tone="#EFEBE6"
            />
          </div>
        ) : (
          <ClipReveal key={img.url} className="gallery__frame">
            <SmartImage
              src={img.url}
              alt={img.alt}
              fill
              sizes="(max-width: 900px) 100vw, 60vw"
              placeholderLabel={name}
              tone="#EFEBE6"
            />
          </ClipReveal>
        )
      )}
    </div>
  );
}
