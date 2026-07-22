'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { isSizeAvailable, type Product, type Size } from '@/lib/types';
import { formatPrice } from '@/lib/format';
import { swatchFor } from '@/lib/colors';
import { modelImages } from '@/lib/products';
import { useBag } from '@/components/providers/BagProvider';
import { useSharedTransition } from '@/components/providers/SharedTransition';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { Accordion } from '@/components/product/Accordion';
import { SizeGuide } from '@/components/product/SizeGuide';

// Right column, sticky (spec §4.3): ref · name · price · color · size · add to
// bag · accordions. Small type, grey, lots of air — the LV pattern.
export function BuyPanel({ product }: { product: Product }) {
  const { add } = useBag();
  const { willReceiveFly, flyingSlug } = useSharedTransition();
  const reduced = useReducedMotion();
  const [size, setSize] = useState<Size | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [error, setError] = useState(false);

  // When the hero grows in via the shared-element transition, hold the buy panel
  // back until the morph itself completes, then let it settle in — so the focus
  // is the photo first. Tied to the actual fly (not a guessed delay); on a direct
  // load there's no fly, so it eases in immediately. Safety timeout so it can
  // never stay hidden if the fly is missed.
  const [awaiting, setAwaiting] = useState(() => willReceiveFly(product.slug));
  const sawFly = useRef(false);
  useEffect(() => {
    if (!awaiting) return;
    if (flyingSlug === product.slug) sawFly.current = true;
    if (sawFly.current && flyingSlug !== product.slug) {
      setAwaiting(false);
      return;
    }
    const t = setTimeout(() => setAwaiting(false), 1600);
    return () => clearTimeout(t);
  }, [awaiting, flyingSlug, product.slug]);

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
    <motion.aside
      className="buy"
      initial={reduced ? false : { opacity: 0, y: 14 }}
      animate={reduced ? { opacity: 1, y: 0 } : { opacity: awaiting ? 0 : 1, y: awaiting ? 14 : 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: awaiting ? 0 : 0.08 }}
    >
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
                disabled={!isSizeAvailable(s)}
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
              <li>Composition — {product.composition ?? 'satin'}</li>
            </ul>
          </Accordion.Item>
          <Accordion.Item title="Shipping &amp; Returns">
            Insured flat-rate shipping within the United States, calculated at checkout. Each piece is
            dispatched on a velvet hanger inside SAHOS packaging. Returns accepted within 14 days,
            unworn with tags.
          </Accordion.Item>
        </Accordion>
      </div>

      <SizeGuide open={guideOpen} onClose={() => setGuideOpen(false)} pieceName={product.name} />
    </motion.aside>
  );
}
