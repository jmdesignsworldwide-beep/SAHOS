'use client';

import { FadeUp } from '@/components/motion/Reveal';

// The collection's opening description — the lead paragraph that sits just under
// the burgundy band. Elegant serif, centered, a comfortable reading column with
// generous air (no full-bleed wall of text).
export function CollectionIntro() {
  return (
    <section className="homecopy homecopy--intro">
      <div className="homecopy__inner">
        <span className="rule-gold" aria-hidden />
        <FadeUp as="p" className="homecopy__body" delay={0.05}>
          Our current collection is a captivating crossover where Old Hollywood glamour meets the
          iconic style of Marilyn Monroe. We adore a &ldquo;waist snatcher,&rdquo; and every piece
          in this collection is designed with a cinched waist to provide maximum confidence and
          enhance your natural shape. Discover styles that make you feel like a star, blending
          vintage allure with modern sophistication.
        </FadeUp>
      </div>
    </section>
  );
}
