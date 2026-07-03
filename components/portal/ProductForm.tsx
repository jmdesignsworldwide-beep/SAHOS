'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { saveProductAction, type ActionState } from '@/app/portal/actions';
import type { AdminProduct } from '@/lib/admin';

const SIZES = ['XS', 'S', 'M', 'L'] as const;

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="pbtn pbtn--primary" disabled={pending}>
      {pending ? 'Guardando…' : 'Guardar'}
    </button>
  );
}

export function ProductForm({ product }: { product?: AdminProduct }) {
  const [state, formAction] = useFormState<ActionState, FormData>(saveProductAction, {});
  const sizeOf = (s: string) => product?.sizes.find((x) => x.size === s);

  return (
    <form action={formAction} className="pform pform--grid">
      {product && <input type="hidden" name="id" value={product.id} />}

      <label className="pfield pfield--wide">
        <span>Nombre *</span>
        <input name="name" defaultValue={product?.name ?? ''} required maxLength={120} />
      </label>

      <label className="pfield">
        <span>Subtítulo</span>
        <input name="subtitle" defaultValue={product?.subtitle ?? ''} maxLength={160} />
      </label>

      <label className="pfield">
        <span>Color</span>
        <input name="color" defaultValue={product?.color ?? ''} maxLength={60} />
      </label>

      <label className="pfield">
        <span>Referencia de fábrica</span>
        <input name="factory_ref" defaultValue={product?.factory_ref ?? ''} maxLength={60} />
      </label>

      <label className="pfield">
        <span>Precio (USD)</span>
        <input
          name="price"
          inputMode="decimal"
          placeholder="p. ej. 98"
          defaultValue={product?.price_cents != null ? (product.price_cents / 100).toString() : ''}
        />
      </label>

      <label className="pfield pfield--wide">
        <span>Descripción</span>
        <textarea name="description" rows={4} defaultValue={product?.description ?? ''} maxLength={4000} />
      </label>

      <fieldset className="pfield pfield--wide psizes">
        <span className="psizes__legend">Tallas disponibles y stock</span>
        <div className="psizes__grid">
          {SIZES.map((s) => {
            const row = sizeOf(s);
            return (
              <div key={s} className="psize">
                <label className="psize__check">
                  <input type="checkbox" name={`size_${s}`} defaultChecked={!!row} />
                  <span>{s}</span>
                </label>
                <input
                  type="number"
                  min={0}
                  name={`stock_${s}`}
                  defaultValue={row?.stock ?? 0}
                  className="psize__stock"
                  aria-label={`Stock ${s}`}
                />
              </div>
            );
          })}
        </div>
      </fieldset>

      <label className="pfield pfield--wide pcheck">
        <input type="checkbox" name="active" defaultChecked={product ? product.active : true} />
        <span>Activo (visible en la tienda)</span>
      </label>

      {state.error && <p className="pmsg pmsg--error pfield--wide">{state.error}</p>}

      <div className="pform__actions pfield--wide">
        <SaveButton />
      </div>
    </form>
  );
}
