'use client';

import Link from 'next/link';
import { SmartImage } from '@/components/ui/SmartImage';
import { ClipReveal } from '@/components/motion/Reveal';
import { formatPrice, twoDigit } from '@/lib/format';
import { modelImages } from '@/lib/products';
import type { Product } from '@/lib/types';

// Collection card (spec §4.1, §4.2): image-clip reveal on enter, slow zoom on
// hover; the piece name + price sit beneath.
export function ProductCard({ product, index }: { product: Product; index: number }) {
  const [first] = modelImages(product);

  return (
    <Link href={`/product/${product.slug}`} className="pcard" data-cursor="interactive">
      <ClipReveal className="pcard__media">
        <span className="pcard__index">{twoDigit(index + 1)}</span>
        <SmartImage
          src={first?.url ?? ''}
          alt={product.name}
          fill
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
