'use client';

import { useRef, useState, type ReactNode } from 'react';

// Minimal accordion for Details / Specifications / Shipping (spec §4.3).
// Height animates via measured scrollHeight so content of any length is smooth.

function AccordionItem({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const panelRef = useRef<HTMLDivElement>(null);

  return (
    <div className={`acc__item ${open ? 'is-open' : ''}`}>
      <button className="acc__btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span>{title}</span>
        <span className="acc__icon" aria-hidden>
          +
        </span>
      </button>
      <div
        className="acc__panel"
        ref={panelRef}
        style={{ height: open ? panelRef.current?.scrollHeight ?? 'auto' : 0 }}
      >
        <div className="acc__inner">{children}</div>
      </div>
    </div>
  );
}

export function Accordion({ children }: { children: ReactNode }) {
  return <div className="acc">{children}</div>;
}

Accordion.Item = AccordionItem;
