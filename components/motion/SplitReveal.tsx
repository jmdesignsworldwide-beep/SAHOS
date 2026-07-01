'use client';

import { useEffect, useRef } from 'react';
import SplitType from 'split-type';
import { gsap, prefersReducedMotion } from '@/lib/gsap';

// Split-letter reveal for the hero title (spec §3.2): characters rise from
// behind a per-line mask with a fine stagger. Fires on mount (hero is above
// the fold). No-JS and reduced-motion users simply see the static text.

export function SplitReveal({
  text,
  className,
  delay = 0.2,
  as: Tag = 'h1',
}: {
  text: string;
  className?: string;
  delay?: number;
  as?: 'h1' | 'h2';
}) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    const split = new SplitType(el, { types: 'lines,chars', lineClass: 'split-line' });
    const ctx = gsap.context(() => {
      gsap.fromTo(
        split.chars,
        { yPercent: 120 },
        { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.028, delay }
      );
    }, el);

    return () => {
      ctx.revert();
      split.revert();
    };
  }, [text, delay]);

  const Comp = Tag;
  return (
    <Comp ref={ref as React.RefObject<HTMLHeadingElement>} className={className}>
      {text}
    </Comp>
  );
}
