'use client';

import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';

// Route transition (spec §3.3): a content crossfade plus a dark "SAHOS" curtain
// that sweeps on navigation — "fashion house", never a hard cut.
//
// Robustness: the curtain is a full-screen dark overlay. It must NEVER be
// rendered at its covering state (scaleY:1) during SSR / first paint, or a
// stalled/blocked client bundle would leave it frozen over the page. So on the
// very first render it mounts already-open (initial={false} → scaleY:0, not
// covering); it only animates from covering→open on an actual navigation.

const curtain = [0.76, 0, 0.24, 1] as const;

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [reduced, setReduced] = useState(false);

  // Detect a real navigation by comparing against the previously rendered path.
  const prevPath = useRef(pathname);
  const isNavigation = prevPath.current !== pathname;
  // A shared-element navigation (to/from a product page) is carried by the image
  // morph, so we suppress the dark curtain + content crossfade for it — the photo
  // growing/shrinking IS the transition. Every other route keeps the curtain.
  const isSharedNav =
    prevPath.current.startsWith('/product/') || pathname.startsWith('/product/');
  useEffect(() => {
    prevPath.current = pathname;
  });

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          initial={reduced || isSharedNav ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduced || isSharedNav ? undefined : { opacity: 0 }}
          transition={{ duration: isSharedNav ? 0 : 0.4, ease: 'easeInOut' }}
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
            // Covering only when arriving via navigation; open on first paint.
            initial={isNavigation ? { scaleY: 1 } : false}
            animate={{ scaleY: 0 }}
            exit={{ scaleY: 1 }}
            transition={{ duration: 0.7, ease: curtain }}
            style={{ transformOrigin: 'top' }}
          >
            <span className="route-curtain__mark">SAHOS</span>
          </motion.div>
        </AnimatePresence>
      )}
    </>
  );
}
