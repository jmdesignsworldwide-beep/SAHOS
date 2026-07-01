'use client';

import { useRef, type ReactNode, type MouseEvent } from 'react';
import { prefersReducedMotion } from '@/lib/gsap';

// Magnetic button (spec §3.4): the element is gently attracted to the cursor
// while it hovers near, and the label barrels back to center on leave.
// Uses transforms only. Renders as <button> or <a>.

type Common = {
  children: ReactNode;
  className?: string;
  strength?: number;
};

function useMagnet(strength: number) {
  const ref = useRef<HTMLElement>(null);
  const onMove = (e: MouseEvent) => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - (rect.left + rect.width / 2);
    const y = e.clientY - (rect.top + rect.height / 2);
    el.style.transform = `translate3d(${x * strength}px, ${y * strength}px, 0)`;
  };
  const onLeave = () => {
    const el = ref.current;
    if (el) el.style.transform = 'translate3d(0,0,0)';
  };
  return { ref, onMove, onLeave };
}

export function MagneticButton({
  children,
  className = '',
  strength = 0.28,
  onClick,
  type = 'button',
  disabled,
}: Common & {
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
}) {
  const { ref, onMove, onLeave } = useMagnet(strength);
  return (
    <button
      ref={ref as React.RefObject<HTMLButtonElement>}
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`magnetic-btn ${className}`}
    >
      {children}
    </button>
  );
}

export function MagneticLink({
  children,
  className = '',
  strength = 0.28,
  href,
}: Common & { href: string }) {
  const { ref, onMove, onLeave } = useMagnet(strength);
  return (
    <a
      ref={ref as React.RefObject<HTMLAnchorElement>}
      href={href}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`magnetic-btn ${className}`}
    >
      {children}
    </a>
  );
}
