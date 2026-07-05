'use client';

/* eslint-disable @next/next/no-img-element */
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

// Shared-element ("continuation") transition between a collection card and the
// product hero — the LV/Gucci grow. Both use the SAME source image (verified),
// so the same photo appears to expand from its spot in the grid into the hero,
// and to shrink back on return.
//
// Why a fixed FLIP overlay instead of raw Framer `layoutId`: the card and hero
// both live inside `overflow: hidden` boxes and in different App Router route
// segments. A layoutId "follow" element renders inside the destination's clipped
// box, so the traveling image gets cut off mid-flight. A `position: fixed` clone
// escapes every ancestor's overflow and animates edge-to-edge — the same shared
// image, but never clipped and reliable across route changes. Movement is GPU
// transform-only (translate + scale), easeOutExpo, no bounce.

type Kind = 'card' | 'hero';
interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}
interface Snap {
  kind: Kind;
  url: string;
  alt: string;
  rect: Rect;
  path: string;
}
interface Fly {
  slug: string;
  url: string;
  alt: string;
  from: Rect;
  to: Rect;
}

const EASE = [0.22, 1, 0.36, 1] as const; // easeOutExpo — expensive, no rebound
const DURATION = 0.7;
const DURATION_MOBILE = 0.58; // a touch quicker on small screens

function valid(r: Rect) {
  return r.width > 2 && r.height > 2;
}

interface Ctx {
  /** Keep this element's rect current while it's mounted. */
  report: (slug: string, kind: Kind, url: string, alt: string, rect: Rect) => void;
  /** On mount, claim any pending fly INTO this element; then become the source. */
  claim: (slug: string, kind: Kind, url: string, alt: string, rect: Rect) => boolean;
  /** True if arriving here will animate a fly in for this slug (opposite kind). */
  willReceiveFly: (slug: string, kind?: Kind) => boolean;
  /** The slug currently mid-flight (its real image should stay hidden). */
  flyingSlug: string | null;
  /** False under reduced-motion — callers then render plainly. */
  enabled: boolean;
}

const SharedCtx = createContext<Ctx>({
  report: () => {},
  claim: () => false,
  willReceiveFly: () => false,
  flyingSlug: null,
  enabled: false,
});

export const useSharedTransition = () => useContext(SharedCtx);

export function SharedTransitionProvider({ children }: { children: ReactNode }) {
  const store = useRef<Map<string, Snap>>(new Map());
  const [fly, setFly] = useState<Fly | null>(null);
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const enabled = !reduced;

  const report = useCallback(
    (slug: string, kind: Kind, url: string, alt: string, rect: Rect) => {
      if (!valid(rect)) return;
      store.current.set(slug, { kind, url, alt, rect, path: pathname });
    },
    [pathname]
  );

  const willReceiveFly = useCallback(
    (slug: string, kind?: Kind) => {
      if (!enabled) return false;
      const s = store.current.get(slug);
      if (!s || !s.url || s.path === pathname) return false;
      if (kind && s.kind === kind) return false; // same kind → not a grow/shrink
      return true;
    },
    [enabled, pathname]
  );

  const claim = useCallback(
    (slug: string, kind: Kind, url: string, alt: string, rect: Rect) => {
      if (!enabled || !valid(rect)) return false;
      const s = store.current.get(slug);
      const doFly = !!(s && s.url && s.kind !== kind && s.path !== pathname && valid(s.rect));
      if (doFly && s) {
        setFly({ slug, url: s.url, alt: alt || s.alt, from: s.rect, to: rect });
      }
      // Become the newest source for this slug.
      store.current.set(slug, { kind, url, alt, rect, path: pathname });
      return doFly;
    },
    [enabled, pathname]
  );

  const flyingSlug = fly?.slug ?? null;

  // FLIP transform math: place the clone at the destination rect, then start it
  // translated + scaled to sit exactly on the source rect, and animate to rest.
  let flyNode: ReactNode = null;
  if (fly) {
    const sx = fly.from.width / fly.to.width;
    const sy = fly.from.height / fly.to.height;
    const dx = fly.from.left - fly.to.left;
    const dy = fly.from.top - fly.to.top;
    const dur =
      typeof window !== 'undefined' && window.innerWidth < 720 ? DURATION_MOBILE : DURATION;
    flyNode = (
      <motion.div
        key="shared-fly"
        className="shared-fly"
        aria-hidden
        style={{
          position: 'fixed',
          top: fly.to.top,
          left: fly.to.left,
          width: fly.to.width,
          height: fly.to.height,
          transformOrigin: 'top left',
        }}
        initial={{ x: dx, y: dy, scaleX: sx, scaleY: sy, opacity: 1 }}
        animate={{ x: 0, y: 0, scaleX: 1, scaleY: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          x: { duration: dur, ease: EASE },
          y: { duration: dur, ease: EASE },
          scaleX: { duration: dur, ease: EASE },
          scaleY: { duration: dur, ease: EASE },
          opacity: { duration: 0.28, ease: 'easeOut' },
        }}
        onAnimationComplete={() => setFly(null)}
      >
        <img src={fly.url} alt="" />
      </motion.div>
    );
  }

  return (
    <SharedCtx.Provider value={{ report, claim, willReceiveFly, flyingSlug, enabled }}>
      {children}
      <AnimatePresence>{flyNode}</AnimatePresence>
    </SharedCtx.Provider>
  );
}
