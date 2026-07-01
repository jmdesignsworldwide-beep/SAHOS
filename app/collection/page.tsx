import type { Metadata } from 'next';
import { PRODUCTS } from '@/lib/products';
import { ProductCard } from '@/components/product/ProductCard';
import { Footer } from '@/components/layout/Footer';
import { FadeUp } from '@/components/motion/Reveal';

export const metadata: Metadata = {
  title: 'Collection',
  description: 'The Marilyn Collection — five pieces. Soft glamour, made to be seen.',
};

// Collection index (spec §4.2): a clean grid of the five pieces. No filters —
// there are five. Reveals stagger in on scroll.
export default function CollectionPage() {
  return (
    <>
      <header className="page-head">
        <FadeUp as="p" className="page-head__eyebrow label">
          The Marilyn Collection
        </FadeUp>
        <FadeUp as="h1" className="page-head__title" delay={0.05}>
          Five pieces.
        </FadeUp>
      </header>

      <main className="collection">
        <div className="pgrid">
          {PRODUCTS.map((product, i) => (
            <ProductCard key={product.slug} product={product} index={i} />
          ))}
        </div>
      </main>

      <Footer />
    </>
  );
}
