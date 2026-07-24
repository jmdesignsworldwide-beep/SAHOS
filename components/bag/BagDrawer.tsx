'use client';

import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { useBag } from '@/components/providers/BagProvider';
import { formatPrice } from '@/lib/format';
import { track } from '@/lib/track';
import { MagneticButton } from '@/components/ui/MagneticButton';

// Slide-in bag drawer (spec §4.4). Framer Motion for the panel + scrim.
// "Proceed to checkout" posts the bag to the server, which re-prices it.

const ease = [0.76, 0, 0.24, 1] as const;

export function BagDrawer() {
  const { items, isOpen, close, remove, setQty, subtotalCents } = useBag();

  const checkout = async () => {
    // Funnel: mark that this session reached checkout, with the cart snapshot.
    track({
      t: 'checkout_started',
      value: subtotalCents ?? 0,
      items: items.map((i) => ({ slug: i.slug, size: i.size, qty: i.qty, value_cents: i.priceCents ?? null })),
    });
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: items.map((i) => ({ slug: i.slug, size: i.size, qty: i.qty })) }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url as string;
      } else {
        // Show the specific reason when the server provides one (e.g. a Stripe
        // configuration error), so a misconfiguration is obvious, not opaque.
        const msg = data.detail ? `${data.error}: ${data.detail}` : data.error;
        alert(msg ?? 'Checkout is not available yet.');
      }
    } catch {
      alert('Something went wrong. Please try again.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="bag-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            onClick={close}
            aria-hidden
          />
          <motion.aside
            className="bag-drawer"
            role="dialog"
            aria-label="Shopping bag"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.6, ease }}
          >
            <div className="bag-drawer__head">
              <span className="label">Your bag ({items.length})</span>
              <button onClick={close} className="bag-close" aria-label="Close bag">
                Close
              </button>
            </div>

            {items.length === 0 ? (
              <div className="bag-empty">
                <p>Your bag is empty.</p>
                <a href="/#collection" className="link-underline" onClick={close}>
                  Discover the collection
                </a>
              </div>
            ) : (
              <>
                <ul className="bag-list">
                  {items.map((i) => (
                    <li key={`${i.slug}-${i.size}`} className="bag-item">
                      <div className="bag-item__img">
                        <Image src={i.image} alt={i.name} fill sizes="96px" style={{ objectFit: 'cover' }} />
                      </div>
                      <div className="bag-item__body">
                        <div className="bag-item__row">
                          <span className="bag-item__name">{i.name}</span>
                          <span className="bag-item__price">{formatPrice(i.priceCents)}</span>
                        </div>
                        <span className="bag-item__sub">{i.subtitle}</span>
                        <span className="bag-item__meta">
                          {i.color} · Size {i.size}
                        </span>
                        <div className="bag-item__controls">
                          <div className="qty">
                            <button onClick={() => setQty(i.slug, i.size, i.qty - 1)} aria-label="Decrease quantity">
                              −
                            </button>
                            <span>{i.qty}</span>
                            <button onClick={() => setQty(i.slug, i.size, i.qty + 1)} aria-label="Increase quantity">
                              +
                            </button>
                          </div>
                          <button className="bag-remove" onClick={() => remove(i.slug, i.size)}>
                            Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="bag-drawer__foot">
                  <div className="bag-subtotal">
                    <span>Subtotal</span>
                    <span>{subtotalCents == null ? 'Price on request' : formatPrice(subtotalCents)}</span>
                  </div>
                  <p className="bag-note">Shipping &amp; taxes calculated at checkout.</p>
                  <MagneticButton className="btn-fill w-full" onClick={checkout} strength={0.12}>
                    Proceed to checkout
                  </MagneticButton>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
