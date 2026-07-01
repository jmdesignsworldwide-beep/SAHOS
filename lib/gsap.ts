'use client';

// Single GSAP entry point. Registers ScrollTrigger once (guarded for HMR / RSC)
// and re-exports so components never import gsap plugins ad hoc.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';

// registerPlugin is idempotent, so calling it on each client load is safe.
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export { gsap, ScrollTrigger };

/** Honors the OS "reduce motion" setting (spec §3, §12). */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
