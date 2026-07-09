import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProduct, modelImages } from '@/lib/products';
import { getModelImages } from '@/lib/gallery';
import { fetchProductBySlug, fetchAllProducts } from '@/lib/catalog';
import { Gallery } from '@/components/product/Gallery';
import { BuyPanel } from '@/components/product/BuyPanel';
import { ProductCard } from '@/components/product/ProductCard';
import { Footer } from '@/components/layout/Footer';
import { FadeUp } from '@/components/motion/Reveal';

// Rendered per-request so the nonce-based CSP (middleware.ts) can stamp its
// nonce onto Next's inline scripts. Unknown slugs fall through to notFound().
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = (await fetchProductBySlug(params.slug)) ?? getProduct(params.slug);
  if (!product) return { title: 'Not found' };
  return {
    title: `${product.name} — ${product.subtitle}`,
    description: product.description,
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  // Source of truth: Supabase (product_images). Falls back to fs-detected files,
  // then the static placeholder set — so the store renders in every state.
  const dbProduct = await fetchProductBySlug(params.slug);
  const product = dbProduct ?? getProduct(params.slug);
  if (!product) notFound();

  const staticFallback = getProduct(product.slug) ?? product;

  const dbModel = dbProduct ? modelImages(dbProduct) : [];
  const gallery =
    dbModel.length > 0
      ? dbModel
      : getModelImages(product.slug, product.name).length > 0
        ? getModelImages(product.slug, product.name)
        : modelImages(staticFallback);

  const all = await fetchAllProducts();
  const related = all.filter((p) => p.slug !== product.slug).slice(0, 3);

  return (
    <>
      <div className="product">
        {/* LV/Gucci layout: model gallery (hero) + sticky buy panel */}
        <div className="product__main">
          <Gallery images={gallery} name={product.name} slug={product.slug} />
          <BuyPanel product={product} />
        </div>

        {/* You may also like */}
        {related.length > 0 && (
          <section className="related">
            <FadeUp as="h2" className="related__title">
              You may also like
            </FadeUp>
            <div className="pgrid">
              {related.map((p, i) => (
                <ProductCard key={p.slug} product={p} index={i} />
              ))}
            </div>
          </section>
        )}
      </div>

      <Footer />
    </>
  );
}
