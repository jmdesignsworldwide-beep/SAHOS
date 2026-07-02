'use client';

import Link from 'next/link';
import { PRODUCTS } from '@/lib/products';
import { ProductCard } from '@/components/product/ProductCard';
import { FadeUp } from '@/components/motion/Reveal';
import type { Product } from '@/lib/types';

// The pieces (spec §4.1). A clean grid; each card reveals on scroll. Products
// are passed from the server (Supabase) so portal edits appear here too.
export function CollectionGrid({ products = PRODUCTS }: { products?: Product[] }) {
  return (
    <section className="collection" id="collection">
      <div className="collection__head">
        <FadeUp as="h2" className="collection__title">
          The Collection
        </FadeUp>
        <FadeUp as="div" delay={0.05}>
          <Link href="/collection" className="link-underline label">
            View all — {products.length} pieces
          </Link>
        </FadeUp>
      </div>

      <div className="pgrid">
        {products.map((product, i) => (
          <ProductCard key={product.slug} product={product} index={i} />
        ))}
      </div>
    </section>
  );
}
