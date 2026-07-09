'use client';

import { FadeUp } from '@/components/motion/Reveal';

// Editorial brand band — a full-bleed burgundy strip (see globals.css) that
// carries the collection's guiding phrase in cream. Composed like a lookbook
// cover: a gold kicker over a fine gold rule, a two-weight display line, and a
// small gold collection mark below. Reveals softly, staggered, on scroll.
export function BrandBanner() {
  return (
    <section className="brandbanner" id="collection-intro">
      <div className="brandbanner__inner">
        <FadeUp as="p" className="label brandbanner__kicker">
          The Marilyn Collection
        </FadeUp>
        <span className="brandbanner__rule" aria-hidden />
        <FadeUp as="h2" className="brandbanner__title" delay={0.06}>
          <span className="brandbanner__lead">Old Hollywood glamour</span>
          <span className="brandbanner__tail">meets vintage allure</span>
        </FadeUp>
        <FadeUp as="p" className="label brandbanner__index" delay={0.14}>
          N&deg; 01 · Summer &rsquo;26
        </FadeUp>
      </div>
    </section>
  );
}
