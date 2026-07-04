'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// First-visit intro (spec §3.3, §4.1): the SAHOS mark fades/expands, holds a
// beat, then the mark fades out with a micro scale while the cream overlay
// dissolves just behind it to reveal the home. No slide, no bounce — pure fade
// + micro scale + stagger. Once per session, skipped under reduced-motion.
//
// Robustness: `show` starts false, so nothing is rendered on the server/first
// paint — a stalled bundle can never leave the overlay stuck. Scroll is
// unlocked and the overlay removed by a guaranteed timer, plus a hard safety
// fallback that force-clears everything even if anything upstream misbehaves.

// Smooth in-out ease for the exit (power2.inOut equivalent) — never linear.
const exitEase = [0.45, 0, 0.55, 1] as const;
const KEY = 'sahos_intro_seen';
// Logo entrance is 1.1s; the extra ~0.4s is the deliberate hold before the exit
// begins (DURATION is when `show` flips false and AnimatePresence plays exit).
const DURATION = 1500;
// Exit runs ≤1.2s after that (overlay: 0.2s stagger + 1.0s fade), so the intro
// is fully gone by ~2.7s. Backstop force-clears if anything upstream misbehaves.
const SAFETY = 3000;

export function Intro() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let seen = false;
    try {
      seen = sessionStorage.getItem(KEY) === '1';
    } catch {
      /* storage blocked — treat as not seen, still safe */
    }
    if (reduced || seen) return;

    const unlock = () => {
      document.body.style.overflow = '';
    };
    const finish = () => {
      setShow(false);
      unlock();
      try {
        sessionStorage.setItem(KEY, '1');
      } catch {
        /* ignore */
      }
    };

    setShow(true);
    document.body.style.overflow = 'hidden';

    const t = setTimeout(finish, DURATION);
    const safety = setTimeout(finish, SAFETY); // never trap the user

    return () => {
      clearTimeout(t);
      clearTimeout(safety);
      unlock();
    };
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="intro-overlay"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          // The intro overlay dissolves 0.2s AFTER the logo starts leaving
          // (stagger), softly revealing the home beneath. pointer-events off the
          // instant the exit starts so the page is interactive through the fade.
          exit={{
            opacity: 0,
            pointerEvents: 'none',
            transition: { duration: 1.0, ease: exitEase, delay: 0.2 },
          }}
          aria-hidden
        >
          <motion.div
            className="intro-mark"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            // Entrance untouched. Exit: hold, then fade 1→0 with a barely-there
            // 1.0→1.02 scale so the mark eases "away" instead of vanishing flat.
            exit={{ opacity: 0, scale: 1.02, transition: { duration: 1.0, ease: exitEase } }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
          >
            <Image
              src="/brand/sahos-logo.jpg"
              alt="SAHOS"
              width={360}
              height={322}
              priority
              // 24KB asset in a 1.5s intro: skip the optimizer round-trip so it
              // paints instantly instead of arriving late.
              unoptimized
              className="intro-logo"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
