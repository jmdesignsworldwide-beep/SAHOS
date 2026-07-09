'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useLenis } from '@/components/providers/SmoothScrollProvider';

// Smoothly resolves in-page hash links (e.g. "Collection" → "/#collection")
// through Lenis instead of the browser's instant jump, and scrolls to the
// target after a cross-page navigation that lands with a hash. Fixed nav
// height is compensated with a small negative offset.
const NAV_OFFSET = -72;

export function AnchorScroll() {
  const { scrollTo } = useLenis();
  const pathname = usePathname();

  // After navigating to a new page with a hash (e.g. /#collection from
  // another route), scroll to the target once its content has mounted.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (!hash || hash.length < 2) return;
    const t = setTimeout(() => {
      const el = document.querySelector(hash);
      if (el instanceof HTMLElement) scrollTo(el, { offset: NAV_OFFSET });
    }, 120);
    return () => clearTimeout(t);
  }, [pathname, scrollTo]);

  // Intercept same-page hash link clicks so the jump is smoothed by Lenis.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href) return;
      const hashIndex = href.indexOf('#');
      if (hashIndex === -1) return;
      const path = href.slice(0, hashIndex) || '/';
      const id = href.slice(hashIndex);
      if (id.length < 2) return;
      // Only intercept when the target lives on the current page.
      if (path !== window.location.pathname) return;
      const el = document.querySelector(id);
      if (!(el instanceof HTMLElement)) return;
      e.preventDefault();
      history.replaceState(null, '', id);
      scrollTo(el, { offset: NAV_OFFSET });
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [scrollTo]);

  return null;
}
