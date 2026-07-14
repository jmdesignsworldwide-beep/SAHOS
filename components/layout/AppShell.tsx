'use client';

import { type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { SmoothScrollProvider } from '@/components/providers/SmoothScrollProvider';
import { BagProvider } from '@/components/providers/BagProvider';
import { SharedTransitionProvider } from '@/components/providers/SharedTransition';
import { PageTransition } from '@/components/providers/PageTransition';
import { MagneticCursor } from '@/components/motion/MagneticCursor';
import { AnchorScroll } from '@/components/motion/AnchorScroll';
import { Nav } from '@/components/layout/Nav';
import { BagDrawer } from '@/components/bag/BagDrawer';
import { VisitTracker } from '@/components/analytics/VisitTracker';

// Composes every global client concern for the public STORE:
// smooth scroll → bag state → cursor + nav + drawer + page-transition wrapper.
//
// The admin portal (/portal/*) is a separate surface — it gets none of this
// (no Lenis, no cursor, no store nav/bag), just a bare render so it can carry
// its own clean admin UI. The public store is untouched.
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPortal = pathname === '/portal' || pathname.startsWith('/portal/');

  if (isPortal) return <>{children}</>;

  return (
    <SmoothScrollProvider>
      <BagProvider>
        <SharedTransitionProvider>
          <MagneticCursor />
          <AnchorScroll />
          {/* Privacy-first visit tracking — public store only, never the portal. */}
          <VisitTracker />
          <Nav />
          <BagDrawer />
          <PageTransition>{children}</PageTransition>
          {/* Whisper-soft film grain over the whole store for an analogue,
              editorial texture. Fixed, non-interactive, blended so it adds
              grain without shifting colours. Kept out of the portal. */}
          <div className="film-grain" aria-hidden />
        </SharedTransitionProvider>
      </BagProvider>
    </SmoothScrollProvider>
  );
}
