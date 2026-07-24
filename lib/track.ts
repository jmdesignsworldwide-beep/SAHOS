'use client';

import type { TrackEvent } from '@/lib/track-events';

// Client-side event emitter. Fire-and-forget, non-blocking, and invisible to
// the store's rendering and motion (Lenis/GSAP): it never awaits, never throws,
// and prefers navigator.sendBeacon (which the browser flushes in the
// background, even across a navigation) with a keepalive fetch fallback.

const ENDPOINT = '/api/track';

function readUtm(): TrackEvent['utm'] | undefined {
  try {
    const p = new URLSearchParams(window.location.search);
    const source = p.get('utm_source') ?? undefined;
    const medium = p.get('utm_medium') ?? undefined;
    const campaign = p.get('utm_campaign') ?? undefined;
    if (!source && !medium && !campaign) return undefined;
    return { source, medium, campaign };
  } catch {
    return undefined;
  }
}

/** Emit a single analytics event. Safe to call anywhere on the client. */
export function track(event: TrackEvent): void {
  if (typeof window === 'undefined') return;
  // Never track the admin portal.
  const path = event.path ?? window.location.pathname;
  if (path === '/portal' || path.startsWith('/portal/')) return;

  const payload = JSON.stringify({ events: [{ ...event, path }] });

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payload], { type: 'application/json' });
      if (navigator.sendBeacon(ENDPOINT, blob)) return;
    }
    // Fallback: keepalive fetch so it still flushes during unload/navigation.
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
      cache: 'no-store',
    }).catch(() => {});
  } catch {
    /* analytics must never surface an error to the visitor */
  }
}

/** Convenience for the page-view tracker: includes referrer + UTM on entry. */
export function trackPageView(path: string): void {
  let ref: string | undefined;
  try {
    ref = document.referrer || undefined;
  } catch {
    ref = undefined;
  }
  track({ t: 'page_view', path, ref, utm: readUtm() });
}
