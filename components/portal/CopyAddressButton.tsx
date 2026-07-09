'use client';

import { useState } from 'react';

// Copies the paste-ready PirateShip address to the clipboard and shows a visual
// confirmation. Falls back to a hidden-textarea copy on browsers without the
// async clipboard API. The address string is built server-side (admin-only).
export function CopyAddressButton({
  text,
  label = 'Copiar dirección para PirateShip',
  className = 'pbtn pbtn--primary',
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [state, setState] = useState<'idle' | 'ok' | 'fail'>('idle');

  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setState('ok');
    } catch {
      setState('fail');
    }
    setTimeout(() => setState('idle'), 2200);
  };

  return (
    <button type="button" className={className} onClick={copy} disabled={!text}>
      {state === 'ok' ? 'Dirección copiada ✓' : state === 'fail' ? 'No se pudo copiar' : label}
    </button>
  );
}
