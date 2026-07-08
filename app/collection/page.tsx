import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchAllProducts } from '@/lib/catalog';
import { ProductCard } from '@/components/product/ProductCard';
import { Footer } from '@/components/layout/Footer';
import { FadeUp } from '@/components/motion/Reveal';

// Reflect portal edits per request (source of truth: Supabase).
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Collection',
  description: 'The Marilyn Collection — five pieces. Soft glamour, made to be seen.',
};

// Collection index (spec §4.2): a clean grid of the pieces. Reveals stagger in.
export default async function CollectionPage() {
  const products = await fetchAllProducts();
  return (
    <>
      <header className="page-head">
        <FadeUp as="p" className="page-head__eyebrow label">
          The Marilyn Collection
        </FadeUp>
        <FadeUp as="h1" className="page-head__title page-head__title--collection" delay={0.05}>
          Old Hollywood glamour meets vintage allure
        </FadeUp>
        <FadeUp as="p" delay={0.1} className="page-head__link-wrap">
          <Link href="/collection" className="link-underline label">
            The Collection — View all
          </Link>
        </FadeUp>
      </header>

      <main className="collection">
        <div className="pgrid">
          {products.map((product, i) => (
            <ProductCard key={product.slug} product={product} index={i} />
          ))}
        </div>
      </main>

      <Footer />
    </>
  );
}
