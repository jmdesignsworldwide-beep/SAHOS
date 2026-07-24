'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageView } from '@/lib/track';

// Emits one page_view per public page view (with first-touch referrer + UTM on
// entry). Runs AFTER paint via useEffect and fire-and-forget, so it never
// delays rendering, navigation, or the store's smooth-scroll / GSAP motion.
// Mounted only in AppShell's public branch, and the endpoint rejects /portal
// paths too — the admin portal is never tracked.
export function VisitTracker() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    if (pathname === '/portal' || pathname.startsWith('/portal/')) return;
    if (last.current === pathname) return; // guard re-renders
    last.current = pathname;
    trackPageView(pathname);
  }, [pathname]);

  return null;
}
