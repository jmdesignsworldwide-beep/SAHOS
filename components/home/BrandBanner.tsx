'use client';

import { FadeUp } from '@/components/motion/Reveal';

// Editorial brand band — a full-bleed burgundy strip (see globals.css) that
// opens the collection in cream on wine: a gold kicker over a fine gold rule,
// then the collection headline. Reveals softly, staggered, on scroll.
export function BrandBanner() {
  return (
    <section className="brandbanner" id="collection-intro">
      <div className="brandbanner__inner">
        <FadeUp as="p" className="label brandbanner__kicker">
          The Marilyn Collection &mdash; Summer &rsquo;26
        </FadeUp>
        <span className="brandbanner__rule" aria-hidden />
        <FadeUp as="h2" className="brandbanner__title" delay={0.08}>
          Introducing our latest designs
        </FadeUp>
      </div>
    </section>
  );
}
