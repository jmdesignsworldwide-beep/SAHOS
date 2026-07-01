'use client';

import { SmartImage } from '@/components/ui/SmartImage';
import { ClipReveal } from '@/components/motion/Reveal';
import type { ProductImage } from '@/lib/types';

// Left column, the protagonist (spec §4.3): a vertical stack of model shots,
// natural scroll, each frame clip-revealing as it enters.
export function Gallery({ images, name }: { images: ProductImage[]; name: string }) {
  return (
    <div className="gallery">
      {images.map((img, i) => (
        <ClipReveal key={img.url} className="gallery__frame" delay={i === 0 ? 0 : 0}>
          <SmartImage
            src={img.url}
            alt={img.alt}
            fill
            priority={i === 0}
            sizes="(max-width: 900px) 100vw, 60vw"
            placeholderLabel={name}
            tone="#EFEBE6"
          />
        </ClipReveal>
      ))}
    </div>
  );
}
