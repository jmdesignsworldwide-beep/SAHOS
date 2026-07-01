'use client';

import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger, prefersReducedMotion } from '@/lib/gsap';

// Manifesto (spec §4.1): each word lights from grey → ink as it scrolls through
// the pinned range. A scrubbed ScrollTrigger toggles `.is-lit` per word.
const COPY = 'Soft glamour, made to be seen. Five pieces — not a wardrobe, a confession.';

export function Manifesto() {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const words = Array.from(el.querySelectorAll<HTMLElement>('.manifesto__word'));
    if (prefersReducedMotion()) {
      words.forEach((w) => w.classList.add('is-lit'));
      return;
    }
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top 75%',
      end: 'bottom 60%',
      scrub: true,
      onUpdate: (self) => {
        const lit = Math.round(self.progress * words.length);
        words.forEach((w, i) => w.classList.toggle('is-lit', i < lit));
      },
    });
    return () => st.kill();
  }, []);

  return (
    <section className="manifesto" id="manifesto">
      <p ref={ref} className="manifesto__text">
        {COPY.split(' ').map((word, i) => (
          <span key={i} className="manifesto__word">
            {word}
            {i < COPY.split(' ').length - 1 ? ' ' : ''}
          </span>
        ))}
      </p>
    </section>
  );
}
