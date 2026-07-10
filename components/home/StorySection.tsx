'use client';

import { type ReactNode } from 'react';
import { FadeUp } from '@/components/motion/Reveal';

// Reusable editorial copy block for the brand story on the home: a fine gold
// rule, a burgundy serif title, and a serif paragraph — centered in a
// comfortable reading column, with generous air so each block breathes.
export function StorySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="homecopy">
      <div className="homecopy__inner">
        <span className="rule-gold" aria-hidden />
        <FadeUp as="h2" className="homecopy__title" delay={0.04}>
          {title}
        </FadeUp>
        <FadeUp as="p" className="homecopy__body" delay={0.1}>
          {children}
        </FadeUp>
      </div>
    </section>
  );
}
