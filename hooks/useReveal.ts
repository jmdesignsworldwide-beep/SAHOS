'use client';

import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger, prefersReducedMotion } from '@/lib/gsap';

// Reusable reveal system (spec §3.2). Every hook returns a ref you attach to
// the target; the animation fires once as it enters the viewport via
// ScrollTrigger, and no-ops (content simply visible) under reduced-motion.

type RevealOptions = {
  delay?: number;
  duration?: number;
  y?: number;
  start?: string;
  once?: boolean;
};

/** Fade + rise. The workhorse for paragraphs, labels, small blocks. */
export function useFadeUp<T extends HTMLElement = HTMLDivElement>(opts: RevealOptions = {}) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      gsap.set(el, { autoAlpha: 1, y: 0 });
      return;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { autoAlpha: 0, y: opts.y ?? 24 },
        {
          autoAlpha: 1,
          y: 0,
          duration: opts.duration ?? 1.1,
          delay: opts.delay ?? 0,
          ease: 'expo.out',
          scrollTrigger: { trigger: el, start: opts.start ?? 'top 85%', once: opts.once ?? true },
        }
      );
    });
    return () => ctx.revert();
  }, [opts.delay, opts.duration, opts.y, opts.start, opts.once]);
  return ref;
}

/**
 * Image clip reveal (spec §3.2): inset(100% 0 0 0) → inset(0), expo.out, ~1.2s.
 * Attach to the wrapper around a next/image fill.
 */
export function useClipReveal<T extends HTMLElement = HTMLDivElement>(opts: RevealOptions = {}) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      gsap.set(el, { clipPath: 'inset(0% 0 0 0)', autoAlpha: 1 });
      return;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { clipPath: 'inset(100% 0 0 0)', autoAlpha: 1 },
        {
          clipPath: 'inset(0% 0 0 0)',
          duration: opts.duration ?? 1.2,
          delay: opts.delay ?? 0,
          ease: 'expo.out',
          scrollTrigger: { trigger: el, start: opts.start ?? 'top 88%', once: opts.once ?? true },
        }
      );
    });
    return () => ctx.revert();
  }, [opts.delay, opts.duration, opts.start, opts.once]);
  return ref;
}

/**
 * Line-by-line mask reveal for a container of block children. Each direct child
 * is wrapped conceptually by an overflow-hidden parent in markup; here we lift
 * the children from below with a stagger.
 */
export function useLinesReveal<T extends HTMLElement = HTMLDivElement>(opts: RevealOptions & { stagger?: number } = {}) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const lines = el.querySelectorAll<HTMLElement>('[data-line]');
    if (!lines.length) return;
    if (prefersReducedMotion()) {
      gsap.set(lines, { yPercent: 0, autoAlpha: 1 });
      return;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(
        lines,
        { yPercent: 120 },
        {
          yPercent: 0,
          duration: opts.duration ?? 1.1,
          ease: 'expo.out',
          stagger: opts.stagger ?? 0.09,
          scrollTrigger: { trigger: el, start: opts.start ?? 'top 82%', once: opts.once ?? true },
        }
      );
    });
    return () => ctx.revert();
  }, [opts.duration, opts.start, opts.once, opts.stagger]);
  return ref;
}

/**
 * Cinematic parallax for a product shot: the media inside the frame is zoomed
 * a touch and drifts slower than the scroll. We translate the inner image only
 * (not the measured `.shared-media` box), so the collection→product morph keeps
 * flying from the correct on-screen rect. `amount` is the drift in % of height.
 */
export function useShotParallax<T extends HTMLElement = HTMLDivElement>(amount = 6) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const media = el.querySelector<HTMLElement>('img, .smart-image-fallback');
    if (!media) return;
    const ctx = gsap.context(() => {
      gsap.set(media, { scale: 1.14, transformOrigin: 'center center', willChange: 'transform' });
      gsap.fromTo(
        media,
        { yPercent: -amount },
        {
          yPercent: amount,
          ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
        }
      );
    });
    return () => ctx.revert();
  }, [amount]);
  return ref;
}

/** Parallax on a full-bleed element, scrubbed to scroll. `amount` in px. */
export function useParallax<T extends HTMLElement = HTMLDivElement>(amount = 80) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { yPercent: -amount / 10 },
        {
          yPercent: amount / 10,
          ease: 'none',
          scrollTrigger: { trigger: el.parentElement ?? el, start: 'top bottom', end: 'bottom top', scrub: true },
        }
      );
    });
    return () => ctx.revert();
  }, [amount]);
  return ref;
}
