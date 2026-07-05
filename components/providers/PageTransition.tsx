'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';

// Route transition (spec §3.3): a soft opacity FADE through a dark brand screen
// carrying the SAHOS logo in white — "fashion house", never a slide/wipe and
// never any vertical movement. The old page fades out behind the darkening
// screen, the pages swap while covered, then the screen fades away to the new
// page.
//
// UNTOUCHED: the shared-element (collection → product) transition. Those
// navigations set isSharedNav and suppress this screen entirely — the growing/
// shrinking photo IS the transition there.
//
// Robustness: the screen is a full-screen dark overlay. It must NEVER render at
// its covering state during SSR / first paint, or a stalled client bundle would
// freeze it over the page. So on first render it mounts already-open (initial
// false → opacity 0, not covering); it only fades covering→open on a real nav.

const fade = [0.45, 0, 0.55, 1] as const; // power2.inOut — smooth, no rebound

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [reduced, setReduced] = useState(false);

  // Detect a real navigation by comparing against the previously rendered path.
  const prevPath = useRef(pathname);
  const isNavigation = prevPath.current !== pathname;
  const isSharedNav =
    prevPath.current.startsWith('/product/') || pathname.startsWith('/product/');
  useEffect(() => {
    prevPath.current = pathname;
  });

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  // Content crossfade — opacity only, no transform. Instant for the product
  // morph; a minimal fade under reduced-motion; a soft fade otherwise.
  const contentDur = isSharedNav ? 0 : reduced ? 0.2 : 0.42;

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          initial={isSharedNav ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={isSharedNav ? undefined : { opacity: 0 }}
          transition={{ duration: contentDur, ease: fade }}
        >
          {children}
        </motion.div>
      </AnimatePresence>

      {!reduced && !isSharedNav && (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`curtain-${pathname}`}
            className="route-curtain"
            aria-hidden
            // Fade in to cover as the old page leaves, fade out to reveal the new
            // one. Open on first paint so it can never sit stuck over the page.
            initial={isNavigation ? { opacity: 1 } : false}
            animate={{ opacity: 0 }}
            exit={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: fade }}
          >
            <Image
              src="/brand/sahos-logo.jpg"
              alt=""
              width={360}
              height={322}
              priority
              unoptimized
              className="route-curtain__logo"
            />
          </motion.div>
        </AnimatePresence>
      )}
    </>
  );
}
