'use client';

import { FadeUp } from '@/components/motion/Reveal';

// Editorial brand banner (replaces the loose manifesto text). Lookbook cover
// feel: cream field, gold hairline, burgundy display serif, italic collection
// subtitle. No black box. Reveals softly on scroll.
export function BrandBanner() {
  return (
    <section className="brandbanner" id="collection-intro">
      <div className="brandbanner__inner">
        <FadeUp as="p" className="label brandbanner__kicker">
          Womenswear · Lookbook
        </FadeUp>
        <FadeUp as="p" className="brandbanner__sub" delay={0.05}>
          The Marilyn Collection
        </FadeUp>
        <span className="brandbanner__rule" aria-hidden />
        <FadeUp as="h2" className="brandbanner__title" delay={0.1}>
          Old Hollywood glamour meets vintage allure
        </FadeUp>
        <FadeUp as="p" className="brandbanner__body" delay={0.15}>
          Discover styles that make you feel like a star, blending vintage allure with modern
          sophistication.
        </FadeUp>
      </div>
    </section>
  );
}
