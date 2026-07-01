'use client';

import { type ElementType, type ReactNode } from 'react';
import { useClipReveal, useFadeUp } from '@/hooks/useReveal';

// Thin declarative wrappers over the reveal hooks so pages read cleanly.

export function FadeUp({
  children,
  as: Tag = 'div',
  delay = 0,
  className,
}: {
  children: ReactNode;
  as?: ElementType;
  delay?: number;
  className?: string;
}) {
  const ref = useFadeUp<HTMLDivElement>({ delay });
  const Comp = Tag as ElementType;
  return (
    <Comp ref={ref} className={className} style={{ visibility: 'hidden' }}>
      {children}
    </Comp>
  );
}

/** Wrap around a fill image; the wrapper is clipped in from the bottom. */
export function ClipReveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useClipReveal<HTMLDivElement>({ delay });
  return (
    <div ref={ref} className={className} style={{ clipPath: 'inset(100% 0 0 0)' }}>
      {children}
    </div>
  );
}
