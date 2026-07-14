'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

// Fires one lightweight, non-blocking ping to /api/track per public page view.
// It runs AFTER paint (useEffect) and uses fetch(keepalive) so it never delays
// rendering or navigation. Geography is derived server-side from Vercel's edge
// headers — nothing about the visitor is read or sent from the browser beyond
// the path they're on. The portal is never tracked (this only mounts on the
// public store, and the endpoint rejects /portal paths too).
export function VisitTracker() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    if (pathname === '/portal' || pathname.startsWith('/portal/')) return;
    // Guard against double-firing for the same path (e.g. re-renders).
    if (last.current === pathname) return;
    last.current = pathname;

    const body = JSON.stringify({ path: pathname });
    try {
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
        cache: 'no-store',
      }).catch(() => {
        /* analytics is best-effort; never surface an error to the visitor */
      });
    } catch {
      /* ignore */
    }
  }, [pathname]);

  return null;
}
