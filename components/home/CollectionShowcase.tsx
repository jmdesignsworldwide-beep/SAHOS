'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { PRODUCTS, modelImages, garmentImages } from '@/lib/products';
import { SharedImage } from '@/components/product/SharedImage';
import { SmartImage } from '@/components/ui/SmartImage';
import { FadeUp, ClipReveal } from '@/components/motion/Reveal';
import type { Product } from '@/lib/types';

// The Marilyn Collection, as editorial banners (one per piece). Each banner
// shows two product shots SIDE BY SIDE (50/50, full-bleed), with an editorial
// index number, name, subtitle and a SHOP link centered below (price lives on
// the product page, not on the showcase). The primary shot uses SharedImage so
// the collection→product photo morph still fires. Both shots are fixed-height
// cream wells — identical across all five pieces — with the photo shown WHOLE
// (object-fit: contain) so the full garment is always visible, never cropped.
export function CollectionShowcase({ products = PRODUCTS }: { products?: Product[] }) {
  return (
    <section className="showcase" id="collection">
      <div className="showcase__head">
        <FadeUp as="h2" className="showcase__title showcase__collection">
          The Marilyn Collection
        </FadeUp>
        <span className="rule-gold" aria-hidden />
        <FadeUp as="p" className="label showcase__index" delay={0.05}>
          N&deg; 01 · Summer &rsquo;26
        </FadeUp>
      </div>

      <div className="showcase__banners">
        {products.map((product, i) => (
          <ProductBanner key={product.slug} product={product} index={i + 1} />
        ))}
      </div>
    </section>
  );
}

// One frame: clip-reveal wrapper holding the image. No parallax zoom here — the
// image is shown WHOLE (object-fit: contain), so any scale/scrub would re-crop
// the garment. The frame paints a cream field behind the letterboxed photo.
function Shot({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <ClipReveal className="show-frame" delay={delay}>
      {children}
    </ClipReveal>
  );
}

function ProductBanner({ product, index }: { product: Product; index: number }) {
  const models = modelImages(product);
  const garments = garmentImages(product);
  const primary = models[0];
  const secondary = garments[0] ?? models[1] ?? models[0];
  const no = String(index).padStart(2, '0');

  return (
    <article className="show-banner">
      <div className="show-media">
        <Shot>
          <SharedImage
            slug={product.slug}
            kind="card"
            url={primary?.url ?? ''}
            alt={`${product.name} — look`}
            sizes="100vw"
            placeholderLabel={product.name}
            tone="#EDE4D4"
          />
        </Shot>
        <Shot delay={0.08}>
          <SmartImage
            src={secondary?.url ?? ''}
            alt={`${product.name} — detail`}
            fill
            sizes="100vw"
            placeholderLabel={product.name}
            tone="#EDE4D4"
          />
        </Shot>
      </div>

      <div className="show-info">
        <FadeUp as="p" className="label show-info__index">
          N&deg; {no}
        </FadeUp>
        <FadeUp as="h3" className="show-info__name" delay={0.04}>
          {product.name}
        </FadeUp>
        <FadeUp as="p" className="show-info__sub" delay={0.08}>
          {product.subtitle}
        </FadeUp>
        <FadeUp as="div" delay={0.12}>
          <Link href={`/product/${product.slug}`} className="btn-fill show-info__cta" data-cursor="interactive">
            Shop
          </Link>
        </FadeUp>
      </div>
    </article>
  );
}
