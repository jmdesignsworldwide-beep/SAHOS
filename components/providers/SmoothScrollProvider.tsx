'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import Lenis from '@studio-freight/lenis';
import { gsap, ScrollTrigger, prefersReducedMotion } from '@/lib/gsap';

// The soul of the "motionsite" feel (spec §3.1): global smooth scroll with
// inertia, driven by Lenis and hard-synced to GSAP's ticker + ScrollTrigger so
// every scrubbed timeline stays frame-perfect against the smoothed scroll.

interface LenisContextValue {
  lenis: Lenis | null;
  scrollTo: (target: string | number | HTMLElement, opts?: { offset?: number; immediate?: boolean }) => void;
}

const LenisContext = createContext<LenisContextValue>({ lenis: null, scrollTo: () => {} });

export const useLenis = () => useContext(LenisContext);

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    // Respect reduced-motion: skip inertia entirely, let native scroll run.
    if (prefersReducedMotion()) return;

    const instance = new Lenis({
      lerp: 0.09, // spec §3.1 — ~0.08–0.1
      wheelMultiplier: 1,
      smoothWheel: true,
      touchMultiplier: 1.4,
    });
    lenisRef.current = instance;
    setLenis(instance);

    instance.on('scroll', ScrollTrigger.update);

    const ticker = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(ticker);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(ticker);
      instance.destroy();
      lenisRef.current = null;
      setLenis(null);
    };
  }, []);

  const scrollTo: LenisContextValue['scrollTo'] = (target, opts) => {
    const l = lenisRef.current;
    if (l) {
      l.scrollTo(target, { offset: opts?.offset ?? 0, immediate: opts?.immediate });
    } else if (typeof window !== 'undefined') {
      // reduced-motion / SSR fallback
      const el = typeof target === 'string' ? document.querySelector(target) : null;
      if (el instanceof HTMLElement) el.scrollIntoView({ behavior: 'auto' });
      else if (typeof target === 'number') window.scrollTo(0, target);
    }
  };

  return <LenisContext.Provider value={{ lenis, scrollTo }}>{children}</LenisContext.Provider>;
}
