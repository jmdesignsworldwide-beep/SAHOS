'use client';

import { useEffect, useRef } from 'react';
import { track } from '@/lib/track';

// Emits one product_view when a product page mounts. Invisible + non-blocking —
// it renders nothing and never awaits, so the gallery, morph and motion are
// untouched.
export function ProductViewTracker({ slug }: { slug: string }) {
  const fired = useRef<string | null>(null);
  useEffect(() => {
    if (fired.current === slug) return;
    fired.current = slug;
    track({ t: 'product_view', slug });
  }, [slug]);
  return null;
}
