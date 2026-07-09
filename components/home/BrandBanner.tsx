'use client';

import { FadeUp } from '@/components/motion/Reveal';

// Editorial brand banner (replaces the loose manifesto text). Lookbook cover
// feel: cream field, gold hairline, burgundy display serif. A single line —
// the collection's guiding phrase — with plenty of air. No black box, no
// repeated headers (the section title lives above the showcase). Reveals
// softly on scroll.
export function BrandBanner() {
  return (
    <section className="brandbanner" id="collection-intro">
      <div className="brandbanner__inner">
        <span className="brandbanner__rule" aria-hidden />
        <FadeUp as="h2" className="brandbanner__title" delay={0.05}>
          Old Hollywood glamour meets vintage allure
        </FadeUp>
      </div>
    </section>
  );
}
