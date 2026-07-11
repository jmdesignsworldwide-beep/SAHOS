'use client';

import { useEffect, useRef } from 'react';
import { SiteMedia } from '@/components/ui/SiteMedia';
import { gsap, prefersReducedMotion } from '@/lib/gsap';
import type { ResolvedMedia } from '@/lib/site-images';

// "The Marilyn Collection" as a cinematic Old-Hollywood title card: a full-bleed
// campaign photo (portal-managed slot "home_marilyn_bg") under a warm dark scrim,
// a slow Ken Burns zoom, a scrubbed parallax, animated film grain and a soft
// vignette, with the serif title fading up like film credits. All motion is
// pure transform/opacity and disabled under prefers-reduced-motion (the section
// then renders as a still photo + text).
export function MarilynTitle({ media }: { media: ResolvedMedia }) {
  const sectionRef = useRef<HTMLElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const items = textRef.current?.querySelectorAll<HTMLElement>('[data-mt]');

    if (prefersReducedMotion()) {
      if (items) gsap.set(items, { autoAlpha: 1, y: 0, scale: 1 });
      return;
    }

    const ctx = gsap.context(() => {
      // Background drifts slower than the text on scroll (cinematic depth). The
      // bg layer is oversized (see CSS) so the drift never reveals an edge.
      if (bgRef.current) {
        gsap.fromTo(
          bgRef.current,
          { yPercent: -8 },
          {
            yPercent: 8,
            ease: 'none',
            scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: true },
          }
        );
      }
      // Title credits: fade + slow rise + a whisper of scale, staggered.
      if (items?.length) {
        gsap.fromTo(
          items,
          { autoAlpha: 0, y: 30, scale: 0.98 },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 1.15,
            ease: 'expo.out',
            stagger: 0.14,
            scrollTrigger: { trigger: section, start: 'top 72%', once: true },
          }
        );
      }
    }, section);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="mtitle">
      <div ref={bgRef} className="mtitle__bg">
        <div className="mtitle__kb">
          <SiteMedia
            type={media.type}
            src={media.src}
            poster={media.poster}
            alt={media.alt}
            sizes="100vw"
            placeholderLabel=""
            tone="#2a1418"
          />
        </div>
      </div>
      <div className="mtitle__scrim" aria-hidden />
      <div className="mtitle__smoke" aria-hidden />
      <div className="mtitle__spot" aria-hidden />
      <div className="mtitle__grain" aria-hidden />
      <div className="mtitle__vignette" aria-hidden />

      <div ref={textRef} className="mtitle__inner">
        <p className="mtitle__kicker" data-mt>
          The Collection
        </p>
        <h2 className="mtitle__title" data-mt>
          <span className="mtitle__line">
            The <em>Marilyn</em>
          </span>
          <span className="mtitle__line mtitle__line--big">Collection</span>
        </h2>
        <span className="mtitle__rule" data-mt aria-hidden />
        <p className="mtitle__year" data-mt>
          N&deg; 01 · Summer &rsquo;26
        </p>
      </div>
    </section>
  );
}
