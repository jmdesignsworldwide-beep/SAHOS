'use client';

import Link from 'next/link';
import { PRODUCTS, modelImages, garmentImages } from '@/lib/products';
import { SharedImage } from '@/components/product/SharedImage';
import { SmartImage } from '@/components/ui/SmartImage';
import { FadeUp, ClipReveal } from '@/components/motion/Reveal';
import { formatPrice } from '@/lib/format';
import type { Product } from '@/lib/types';

// The Marilyn Collection, as stacked editorial banners (one per piece). Each
// banner pairs two product shots (model + garment/detail) with the name, price,
// subtitle and a SHOP link. The primary shot uses SharedImage so the collection→
// product photo morph still fires. Banners alternate side for lookbook rhythm.
export function CollectionShowcase({ products = PRODUCTS }: { products?: Product[] }) {
  return (
    <section className="showcase" id="collection">
      <div className="showcase__head">
        <FadeUp as="p" className="label showcase__kicker">
          The Marilyn Collection
        </FadeUp>
        <FadeUp as="h2" className="showcase__title" delay={0.05}>
          The Marilyn Collection — Summer &rsquo;26
        </FadeUp>
      </div>

      <div className="showcase__banners">
        {products.map((product, i) => (
          <ProductBanner key={product.slug} product={product} reverse={i % 2 === 1} />
        ))}
      </div>
    </section>
  );
}

function ProductBanner({ product, reverse }: { product: Product; reverse: boolean }) {
  const models = modelImages(product);
  const garments = garmentImages(product);
  const primary = models[0];
  const secondary = garments[0] ?? models[1] ?? models[0];

  return (
    <article className={`show-banner ${reverse ? 'show-banner--rev' : ''}`}>
      <div className="show-media">
        <ClipReveal className="show-frame">
          <SharedImage
            slug={product.slug}
            kind="card"
            url={primary?.url ?? ''}
            alt={`${product.name} — look`}
            sizes="(max-width: 900px) 50vw, 34vw"
            placeholderLabel={product.name}
            tone="#EDE4D4"
          />
        </ClipReveal>
        <ClipReveal className="show-frame" delay={0.08}>
          <SmartImage
            src={secondary?.url ?? ''}
            alt={`${product.name} — detail`}
            fill
            sizes="(max-width: 900px) 50vw, 34vw"
            placeholderLabel={product.name}
            tone="#EDE4D4"
          />
        </ClipReveal>
      </div>

      <div className="show-info">
        <FadeUp as="p" className="label show-info__kicker">
          The Marilyn Collection
        </FadeUp>
        <FadeUp as="h3" className="show-info__name" delay={0.04}>
          {product.name}
        </FadeUp>
        <FadeUp as="p" className="show-info__sub" delay={0.08}>
          {product.subtitle}
        </FadeUp>
        <FadeUp as="p" className="show-info__price" delay={0.12}>
          {formatPrice(product.priceCents, product.currency)}
        </FadeUp>
        <FadeUp as="div" delay={0.16}>
          <Link href={`/product/${product.slug}`} className="btn-fill show-info__cta" data-cursor="interactive">
            Shop
          </Link>
        </FadeUp>
      </div>
    </article>
  );
}
