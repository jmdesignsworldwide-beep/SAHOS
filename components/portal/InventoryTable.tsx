'use client';

/* eslint-disable @next/next/no-img-element */
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateStockAction, setStockModeAction } from '@/app/portal/actions';
import type { InventoryPiece, InventorySize } from '@/lib/dashboard';

function sizeState(s: InventorySize): { label: string; cls: string } {
  if (s.mode === 'on_demand') return { label: 'Bajo demanda', cls: 'ondemand' };
  if (s.stock === 0) return { label: 'Agotado', cls: 'out' };
  if (s.stock <= s.lowThreshold) return { label: 'Stock bajo', cls: 'low' };
  return { label: 'Disponible', cls: 'ok' };
}

function SizeCell({ productId, size }: { productId: string; size: InventorySize }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(String(size.stock));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);
  const dirty = value !== String(size.stock);
  const st = sizeState(size);

  const save = () => {
    setError(false);
    const fd = new FormData();
    fd.set('product_id', productId);
    fd.set('size', size.size);
    fd.set('quantity', value);
    startTransition(async () => {
      const res = await updateStockAction(fd);
      if (res?.error) {
        setError(true);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
        router.refresh();
      }
    });
  };

  return (
    <div className={`icell icell--${st.cls}`}>
      <span className="icell__size">{size.size}</span>
      <div className="icell__edit">
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && dirty && save()}
          aria-label={`Stock ${size.size}`}
          disabled={pending}
        />
        {dirty && (
          <button className="icell__save" onClick={save} disabled={pending} aria-label="Guardar">
            {pending ? '…' : '✓'}
          </button>
        )}
        {saved && !dirty && <span className="icell__ok">Guardado</span>}
      </div>
      <span className={`istatus istatus--${st.cls}`}>{st.label}</span>
      {error && <span className="icell__err">Error</span>}
    </div>
  );
}

function InventoryRow({ piece }: { piece: InventoryPiece }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const toggleMode = (mode: 'limited' | 'on_demand') => {
    if (mode === piece.mode) return;
    const fd = new FormData();
    fd.set('product_id', piece.id);
    fd.set('mode', mode);
    startTransition(async () => {
      await setStockModeAction(fd);
      router.refresh();
    });
  };

  return (
    <section className="irow">
      <header className="irow__head">
        <div className="irow__id">
          <span className="irow__thumb">{piece.image ? <img src={piece.image} alt="" /> : <span>—</span>}</span>
          <div>
            <h3 className="irow__name">{piece.name}</h3>
            <span className="irow__total">{piece.total} unidades</span>
          </div>
        </div>
        <div className="imode" role="group" aria-label="Modo de inventario">
          <button
            className={`imode__opt ${piece.mode === 'limited' ? 'is-active' : ''}`}
            onClick={() => toggleMode('limited')}
            disabled={pending}
          >
            Stock limitado
          </button>
          <button
            className={`imode__opt ${piece.mode === 'on_demand' ? 'is-active' : ''}`}
            onClick={() => toggleMode('on_demand')}
            disabled={pending}
          >
            Bajo demanda
          </button>
        </div>
      </header>

      <div className="irow__sizes">
        {piece.sizes.map((s) => (
          <SizeCell key={s.size} productId={piece.id} size={s} />
        ))}
      </div>
    </section>
  );
}

export function InventoryTable({ pieces }: { pieces: InventoryPiece[] }) {
  return (
    <div className="itable">
      {pieces.map((p) => (
        <InventoryRow key={p.id} piece={p} />
      ))}
    </div>
  );
}
