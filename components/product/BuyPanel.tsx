'use client';

import { useState } from 'react';
import type { Product, Size } from '@/lib/types';
import { formatPrice } from '@/lib/format';
import { swatchFor } from '@/lib/colors';
import { modelImages } from '@/lib/products';
import { useBag } from '@/components/providers/BagProvider';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { Accordion } from '@/components/product/Accordion';
import { SizeGuide } from '@/components/product/SizeGuide';

// Right column, sticky (spec §4.3): ref · name · price · color · size · add to
// bag · accordions. Small type, grey, lots of air — the LV pattern.
export function BuyPanel({ product }: { product: Product }) {
  const { add } = useBag();
  const [size, setSize] = useState<Size | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [error, setError] = useState(false);

  const hero = modelImages(product)[0]?.url ?? '';

  const addToBag = () => {
    if (!size) {
      setError(true);
      return;
    }
    add({
      slug: product.slug,
      name: product.name,
      subtitle: product.subtitle,
      size,
      qty: 1,
      priceCents: product.priceCents,
      image: hero,
      color: product.color,
    });
  };

  return (
    <aside className="buy">
      <div className="buy__inner">
        <p className="buy__ref">Ref. {product.factoryRef}</p>
        <h1 className="buy__name">{product.name}</h1>
        <p className="buy__sub">{product.subtitle}</p>
        <p className="buy__price">{formatPrice(product.priceCents, product.currency)}</p>

        {/* Color — single color per piece in this collection, shown for clarity */}
        <div className="buy__group">
          <div className="buy__glabel">
            <span>Color</span>
            <span>{product.color}</span>
          </div>
          <div className="swatches">
            <button
              className="swatch is-active"
              style={{ background: swatchFor(product.color) }}
              aria-label={product.color}
              aria-pressed
            />
          </div>
        </div>

        {/* Size */}
        <div className="buy__group">
          <div className="buy__glabel">
            <span>Size</span>
            <button className="size-guide-link" onClick={() => setGuideOpen(true)}>
              Size guide
            </button>
          </div>
          <div className="sizes">
            {product.sizes.map((s) => (
              <button
                key={s.size}
                className={`size-btn ${size === s.size ? 'is-active' : ''}`}
                disabled={s.stock <= 0}
                onClick={() => {
                  setSize(s.size);
                  setError(false);
                }}
              >
                {s.size}
              </button>
            ))}
          </div>
          {error && (
            <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#6b1f2a' }}>
              Please select a size.
            </p>
          )}
        </div>

        <div className="buy__cta">
          <MagneticButton className="btn-fill w-full" onClick={addToBag} strength={0.12}>
            Add to bag
          </MagneticButton>
        </div>

        <div className="buy__reassurance">
          <span>Complimentary shipping</span>
          <span>Delivered on a velvet hanger</span>
        </div>

        <Accordion>
          <Accordion.Item title="Details" defaultOpen>
            <ul>
              {product.details.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </Accordion.Item>
          <Accordion.Item title="Specifications">
            <ul>
              <li>Color — {product.color}</li>
              <li>Atelier reference — {product.factoryRef}</li>
              <li>Sizes — XS to L</li>
              <li>Composition — silk-like satin</li>
            </ul>
          </Accordion.Item>
          <Accordion.Item title="Shipping &amp; Returns">
            Complimentary insured shipping within the United States. Each piece is dispatched on a
            velvet hanger inside SAHOS packaging. Returns accepted within 14 days, unworn with tags.
          </Accordion.Item>
        </Accordion>
      </div>

      <SizeGuide open={guideOpen} onClose={() => setGuideOpen(false)} pieceName={product.name} />
    </aside>
  );
}
