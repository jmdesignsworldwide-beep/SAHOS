'use client';

import { useEffect, useRef, useState } from 'react';

// Animated count-up for the KPI numbers. Eases 0 → value on mount. Honors
// prefers-reduced-motion (renders the final value with no animation). Formats
// money (cents), integers, or percentages so callers pass a raw number.

type Format = 'int' | 'money' | 'pct';

function fmt(n: number, format: Format): string {
  if (format === 'money') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
      Math.round(n) / 100
    );
  }
  if (format === 'pct') return `${(Math.round(n * 10) / 10).toLocaleString('es-DO')}%`;
  return Math.round(n).toLocaleString('es-DO');
}

export function NumberTicker({
  value,
  format = 'int',
  durationMs = 1100,
}: {
  value: number;
  format?: Format;
  durationMs?: number;
}) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || value === 0) {
      setDisplay(value);
      return;
    }
    let start: number | null = null;
    const from = 0;
    const step = (ts: number) => {
      if (start == null) start = ts;
      const t = Math.min(1, (ts - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(from + (value - from) * eased);
      if (t < 1) raf.current = requestAnimationFrame(step);
      else setDisplay(value);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value, durationMs]);

  return <span className="ticker">{fmt(display, format)}</span>;
}
