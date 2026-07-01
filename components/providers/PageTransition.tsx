'use client';

import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';

// Route transition overlay (spec §3.3): a panel wipes across the screen with
// the SAHOS mark on navigation — "fashion house", never a hard cut. Framer
// Motion's AnimatePresence keys on the pathname.

const curtain = [0.76, 0, 0.24, 1] as const;

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduced ? undefined : { opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        >
          {children}
        </motion.div>
      </AnimatePresence>

      {!reduced && (
        <AnimatePresence mode="wait">
          <motion.div
            key={`curtain-${pathname}`}
            className="route-curtain"
            aria-hidden
            initial={{ scaleY: 1 }}
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
