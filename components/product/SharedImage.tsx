'use client';

import { useEffect, useRef, useState } from 'react';
import { SmartImage } from '@/components/ui/SmartImage';
import { useSharedTransition } from '@/components/providers/SharedTransition';

// An image that participates in the shared-element (grow/shrink) transition.
// Wraps SmartImage; on mount it claims any pending fly INTO this spot, then
// becomes the source for the next navigation. While its slug is mid-flight the
// real image stays hidden so only the fixed clone is seen, then it cross-fades
// in as the clone lands. Falls back to plain rendering under reduced-motion or
// when the piece has no photo.
export function SharedImage({
  slug,
  kind,
  url,
  alt,
  sizes,
  priority,
  placeholderLabel,
  tone,
}: {
  slug: string;
  kind: 'card' | 'hero';
  url: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  placeholderLabel?: string;
  tone?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { report, claim, willReceiveFly, flyingSlug, enabled } = useSharedTransition();

  // Start hidden if a fly is going to land here, so the real image never flashes
  // at full size for a frame before the clone starts. Cleared once the fly ends.
  const [awaiting, setAwaiting] = useState(() => enabled && willReceiveFly(slug, kind));
  const sawFly = useRef(false);

  const measure = (): { top: number; left: number; width: number; height: number } | null => {
    const el = ref.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top, left: r.left, width: r.width, height: r.height };
  };

  useEffect(() => {
    if (!enabled) return;
    const rect = measure();
    if (rect) claim(slug, kind, url, alt, rect);

    const update = () => {
      const r = measure();
      if (r) report(slug, kind, url, alt, r);
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, kind, url, alt, enabled]);

  // Reveal when this slug's fly finishes (or after a safety timeout, so a missed
  // fly can never leave the image stuck hidden).
  useEffect(() => {
    if (!awaiting) return;
    if (flyingSlug === slug) sawFly.current = true;
    if (sawFly.current && flyingSlug !== slug) {
      setAwaiting(false);
      return;
    }
    const t = setTimeout(() => setAwaiting(false), 1600);
    return () => clearTimeout(t);
  }, [awaiting, flyingSlug, slug]);

  const hidden = enabled && (awaiting || flyingSlug === slug);

  return (
    <div
      ref={ref}
      className="shared-media"
      data-shared-hidden={hidden ? '' : undefined}
      onPointerDown={() => {
        // Capture a fresh rect the instant before a click navigates away.
        if (!enabled) return;
        const r = measure();
        if (r) report(slug, kind, url, alt, r);
      }}
    >
      <SmartImage
        src={url}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        placeholderLabel={placeholderLabel}
        tone={tone}
      />
    </div>
  );
}
