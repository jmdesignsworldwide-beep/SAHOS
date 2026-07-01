import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAllSlugs, getProduct, modelImages, garmentImages, PRODUCTS } from '@/lib/products';
import { Gallery } from '@/components/product/Gallery';
import { BuyPanel } from '@/components/product/BuyPanel';
import { Product360 } from '@/components/product/Product360';
import { ProductCard } from '@/components/product/ProductCard';
import { Footer } from '@/components/layout/Footer';
import { FadeUp } from '@/components/motion/Reveal';

// Pre-render every product at build time.
export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const product = getProduct(params.slug);
  if (!product) return { title: 'Not found' };
  return {
    title: `${product.name} — ${product.subtitle}`,
    description: product.description,
  };
}

export default function ProductPage({ params }: { params: { slug: string } }) {
  const product = getProduct(params.slug);
  if (!product) notFound();

  const gallery = modelImages(product);
  const frames = garmentImages(product).map((g) => ({ url: g.url, alt: g.alt }));
  const related = PRODUCTS.filter((p) => p.slug !== product.slug).slice(0, 3);

  return (
    <>
      <div className="product">
        {/* LV/Gucci layout: model gallery (hero) + sticky buy panel */}
        <div className="product__main">
          <Gallery images={gallery} name={product.name} />
          <BuyPanel product={product} />
        </div>

        {/* Secondary 360 module — a lux complement, never the protagonist */}
        {frames.length > 0 && (
          <section className="viewer-section">
            <div className="viewer-section__head">
              <FadeUp as="p" className="label">
                The piece, in the round
              </FadeUp>
              <FadeUp as="h2" className="viewer-section__title" delay={0.05}>
                {product.name} — 360°
              </FadeUp>
            </div>
            <Product360 images={frames} label={product.name} />
          </section>
        )}

        {/* You may also like */}
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
      </div>

      <Footer />
    </>
  );
}
