'use client';

import Link from 'next/link';
import { SharedImage } from '@/components/product/SharedImage';
import { ClipReveal } from '@/components/motion/Reveal';
import { formatPrice } from '@/lib/format';
import { modelImages } from '@/lib/products';
import type { Product } from '@/lib/types';

// Collection card (spec §4.1, §4.2): image-clip reveal on enter, slow zoom on
// hover; the piece name + price sit beneath. (No corner index numbers.)
export function ProductCard({ product }: { product: Product; index?: number }) {
  const [first] = modelImages(product);

  return (
    <Link href={`/product/${product.slug}`} className="pcard" data-cursor="interactive">
      <ClipReveal className="pcard__media">
        <SharedImage
          slug={product.slug}
          kind="card"
          url={first?.url ?? ''}
          alt={product.name}
          sizes="(max-width: 900px) 50vw, 33vw"
          placeholderLabel={product.name}
          tone="#EFEBE6"
        />
      </ClipReveal>
      <div className="pcard__meta">
        <div>
          <span className="pcard__name">{product.name}</span>
          <p className="pcard__sub">{product.subtitle}</p>
        </div>
        <span className="pcard__price">{formatPrice(product.priceCents, product.currency)}</span>
      </div>
    </Link>
  );
}
