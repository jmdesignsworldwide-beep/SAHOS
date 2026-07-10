'use client';

import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '@/lib/gsap';

// Custom magnetic cursor (spec §3.4): a dot + a ring that trails with lerp; the
// ring grows over interactive elements. Hidden on touch / reduced-motion.
// Pure rAF + transforms — no per-frame React state, so it never re-renders.

export function MagneticCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    // Skip on touch / coarse pointers.
    if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;
    let hovering = false;
    let overBrand = false;
    let raf = 0;

    // Start hidden until the first real move, so no stray ring/dot sits at the
    // viewport centre before the pointer is used.
    dot.style.opacity = '0';
    ring.style.opacity = '0';

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
      const el = e.target as HTMLElement | null;
      // Keep the centred brand wordmark pristine — hide the cursor entirely over
      // it so the ring + dot never read as a symbol clashing with the letters.
      const nowOverBrand = !!el?.closest('.nav__brand');
      if (nowOverBrand !== overBrand) {
        overBrand = nowOverBrand;
        dot.style.opacity = overBrand ? '0' : '1';
        ring.style.opacity = overBrand ? '0' : 'var(--ring-opacity, 0.55)';
      } else if (!overBrand) {
        dot.style.opacity = '1';
        ring.style.opacity = 'var(--ring-opacity, 0.55)';
      }
      const interactive = !overBrand && !!el?.closest('a, button, [data-cursor="interactive"], input, select, textarea');
      if (interactive !== hovering) {
        hovering = interactive;
        ring.style.setProperty('--ring-scale', interactive ? '2.1' : '1');
        ring.style.setProperty('--ring-opacity', interactive ? '0.9' : '0.55');
      }
    };

    const render = () => {
      ringX += (mouseX - ringX) * 0.16;
      ringY += (mouseY - ringY) * 0.16;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) scale(var(--ring-scale, 1))`;
      raf = requestAnimationFrame(render);
    };

    const onLeave = () => {
      dot.style.opacity = '0';
      ring.style.opacity = '0';
    };
    const onEnter = () => {
      dot.style.opacity = '1';
      ring.style.opacity = 'var(--ring-opacity, 0.55)';
    };

    document.documentElement.classList.add('has-custom-cursor');
    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);
    raf = requestAnimationFrame(render);

    return () => {
      document.documentElement.classList.remove('has-custom-cursor');
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div ref={ringRef} aria-hidden className="cursor-ring" />
      <div ref={dotRef} aria-hidden className="cursor-dot" />
    </>
  );
}
