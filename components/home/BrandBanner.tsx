'use client';

import { FadeUp } from '@/components/motion/Reveal';

// Editorial brand band — a full-bleed burgundy strip (see globals.css) that
// carries the collection's guiding phrase in cream: a fine gold rule over a
// two-weight display line. Clean — just the phrase, with air. Reveals softly.
export function BrandBanner() {
  return (
    <section className="brandbanner" id="collection-intro">
      <div className="brandbanner__inner">
        <span className="brandbanner__rule" aria-hidden />
        <FadeUp as="h2" className="brandbanner__title" delay={0.06}>
          <span className="brandbanner__lead">Old Hollywood glamour</span>
          <span className="brandbanner__tail">meets vintage allure</span>
        </FadeUp>
      </div>
    </section>
  );
}
