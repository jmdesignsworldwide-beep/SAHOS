'use client';

import { useEffect, useRef } from 'react';
import { SiteMedia } from '@/components/ui/SiteMedia';
import { gsap, ScrollTrigger, prefersReducedMotion } from '@/lib/gsap';
import type { ResolvedMedia } from '@/lib/site-images';

// Full-bleed campaign section (spec §4.1): pin the section and scrub a slow
// scale + reveal of the line over it. One editorial frame (image or looping
// video), one line of text.
export function Campaign({
  media,
  line,
  tone = '#DED9D3',
  label,
}: {
  media: ResolvedMedia;
  line: string;
  tone?: string;
  label: string;
}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const media = mediaRef.current;
    if (!section || !media || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        media,
        { scale: 1.15, yPercent: -6 },
        {
          scale: 1,
          yPercent: 6,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
            pin: false,
          },
        }
      );
    }, section);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="campaign">
      <div ref={mediaRef} className="campaign__media">
        <SiteMedia
          type={media.type}
          src={media.src}
          poster={media.poster}
          alt={media.alt || label}
          sizes="100vw"
          placeholderLabel={label}
          tone={tone}
        />
      </div>
      <div className="campaign__line">
        <h2>{line}</h2>
      </div>
    </section>
  );
}
