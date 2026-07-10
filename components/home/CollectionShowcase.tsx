'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { PRODUCTS, modelImages, garmentImages } from '@/lib/products';
import { SharedImage } from '@/components/product/SharedImage';
import { SmartImage } from '@/components/ui/SmartImage';
import { FadeUp, ClipReveal } from '@/components/motion/Reveal';
import { useShotParallax } from '@/hooks/useReveal';
import type { Product } from '@/lib/types';

// The Marilyn Collection, as editorial banners (one per piece), Gucci-style.
// Each banner shows two product shots SIDE BY SIDE (50/50, full-bleed) at one
// fixed height shared by every piece. The piece's index, name, italic subtitle
// and a SHOP link are overlaid on the FIRST (left) shot, bottom-left, in white
// over a soft corner scrim so they read over any photo; the second (right) shot
// stays clean. The primary shot uses SharedImage so the collection→product photo
// morph still fires (SHOP and the image both lead to the product page).
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

// One frame: a fixed-height clip-reveal well. The image sits in an inner media
// layer that drifts slower than the scroll (subtle cinematic parallax); the
// parallax scales/translates only the inner <img>, so the frame's measured box
// — and the collection→product morph rect — stay exactly where they are. Any
// overlay is a sibling of the media layer, so it never moves with the parallax.
function Shot({ children, delay = 0, overlay }: { children: ReactNode; delay?: number; overlay?: ReactNode }) {
  const parallaxRef = useShotParallax<HTMLDivElement>(6);
  return (
    <ClipReveal className="show-frame" delay={delay}>
      <div ref={parallaxRef} className="show-frame__media">
        {children}
      </div>
      {overlay}
    </ClipReveal>
  );
}

function ProductBanner({ product, index }: { product: Product; index: number }) {
  const models = modelImages(product);
  const garments = garmentImages(product);
  const primary = models[0];
  const secondary = garments[0] ?? models[1] ?? models[0];
  const no = String(index).padStart(2, '0');

  const overlay = (
    <div className="show-overlay">
      <p className="show-overlay__index">N&deg; {no}</p>
      <h3 className="show-overlay__name">{product.name}</h3>
      <p className="show-overlay__sub">{product.subtitle}</p>
      <Link href={`/product/${product.slug}`} className="show-overlay__cta" data-cursor="interactive">
        Shop
      </Link>
    </div>
  );

  return (
    <article className="show-banner">
      <div className="show-media">
        <Shot overlay={overlay}>
          <SharedImage
            slug={product.slug}
            kind="card"
            url={primary?.url ?? ''}
            alt={`${product.name} — look`}
            sizes="50vw"
            placeholderLabel={product.name}
            tone="#EDE4D4"
          />
        </Shot>
        <Shot delay={0.08}>
          <SmartImage
            src={secondary?.url ?? ''}
            alt={`${product.name} — detail`}
            fill
            sizes="50vw"
            placeholderLabel={product.name}
            tone="#EDE4D4"
          />
        </Shot>
      </div>
    </article>
  );
}
