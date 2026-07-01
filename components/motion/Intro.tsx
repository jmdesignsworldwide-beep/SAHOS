'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// First-visit intro (spec §3.3, §4.1): the SAHOS mark fades/expands, then a
// white wipe lifts up to reveal the home. Once per session, ≤1.5s, skipped
// under reduced-motion.
//
// Robustness: `show` starts false, so nothing is rendered on the server/first
// paint — a stalled bundle can never leave the overlay stuck. Scroll is
// unlocked and the overlay removed by a guaranteed timer, plus a hard safety
// fallback that force-clears everything even if anything upstream misbehaves.

const curtain = [0.76, 0, 0.24, 1] as const;
const KEY = 'sahos_intro_seen';
const DURATION = 1500;
const SAFETY = 2600; // absolute backstop — the intro is gone no later than this

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
          initial={{ y: 0 }}
          animate={{ y: 0 }}
          exit={{ y: '-100%' }}
          transition={{ duration: 0.8, ease: curtain }}
          aria-hidden
        >
          <motion.div
            className="intro-mark"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
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
