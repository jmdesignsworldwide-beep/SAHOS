'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// First-visit intro (spec §3.3, §4.1): the SAHOS mark draws itself in SVG, then
// a wipe lifts up to reveal the home. Runs once per session (sessionStorage),
// ≤1.5s, skipped entirely under reduced-motion.

const curtain = [0.76, 0, 0.24, 1] as const;
const KEY = 'sahos_intro_seen';

export function Intro() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const seen = sessionStorage.getItem(KEY);
    if (reduced || seen) return;

    setShow(true);
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => {
      setShow(false);
      sessionStorage.setItem(KEY, '1');
      document.body.style.overflow = '';
    }, 1500);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="intro-overlay"
          initial={{ y: 0 }}
          exit={{ y: '-100%' }}
          transition={{ duration: 0.8, ease: curtain }}
          aria-hidden
        >
          <motion.svg
            width="220"
            height="60"
            viewBox="0 0 220 60"
            className="intro-mark"
            initial="hidden"
            animate="visible"
          >
            <motion.text
              x="110"
              y="42"
              textAnchor="middle"
              className="intro-mark__text"
              variants={{
                hidden: { opacity: 0, letterSpacing: '0.02em' },
                visible: { opacity: 1, letterSpacing: '0.5em', transition: { duration: 1, ease: 'easeOut' } },
              }}
            >
              SAHOS
            </motion.text>
          </motion.svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
