'use client';

import { useEffect, useRef, useState } from 'react';
import { SmartImage } from '@/components/ui/SmartImage';
import type { SiteMediaType } from '@/lib/site-images';

// Renders a portal-managed site slot as either a still image or a looping video.
// Luxury video treatment: muted + autoplay + loop + playsInline, no controls, no
// play button (Gucci/Saint Laurent). object-fit: cover, same framing as images.
// Robust: under prefers-reduced-motion, or if the video errors / the browser
// can't play it, it shows the poster image instead — never a black hole. Videos
// below the fold lazy-load (poster shown until near the viewport).
export function SiteMedia({
  type,
  src,
  poster,
  alt,
  sizes,
  priority = false,
  placeholderLabel,
  tone,
  className,
}: {
  type: SiteMediaType;
  src: string;
  poster: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  placeholderLabel?: string;
  tone?: string;
  className?: string;
}) {
  const [reduced, setReduced] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  // Image slot, or a video we shouldn't/can't play → render the still (poster
  // for video, otherwise the image src). SmartImage adds the SAHOS fallback.
  if (type !== 'video' || reduced || failed) {
    const imgSrc = type === 'video' ? poster : src;
    return (
      <SmartImage
        src={imgSrc}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        placeholderLabel={placeholderLabel}
        tone={tone}
        className={className}
      />
    );
  }

  return <SiteVideo src={src} poster={poster} priority={priority} alt={alt} onFail={() => setFailed(true)} />;
}

function SiteVideo({
  src,
  poster,
  priority,
  alt,
  onFail,
}: {
  src: string;
  poster: string;
  priority: boolean;
  alt: string;
  onFail: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  // Hero (priority) loads immediately; others wait until near the viewport.
  const [near, setNear] = useState(priority);

  useEffect(() => {
    if (priority || near) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: '250px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [priority, near]);

  useEffect(() => {
    if (near) ref.current?.play?.().catch(() => {});
  }, [near]);

  return (
    <video
      ref={ref}
      className={`site-video ${''}`}
      poster={poster || undefined}
      autoPlay
      muted
      loop
      playsInline
      // A11y: decorative loop; the poster/alt carry meaning via aria-label.
      aria-label={alt}
      preload={near ? 'auto' : 'none'}
      onError={onFail}
      src={near ? src : undefined}
    />
  );
}
