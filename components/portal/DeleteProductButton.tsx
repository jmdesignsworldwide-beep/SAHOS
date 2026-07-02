'use client';

import { deleteProductAction } from '@/app/portal/actions';

// Delete with an explicit confirmation before the form submits.
export function DeleteProductButton({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={deleteProductAction}
      onSubmit={(e) => {
        if (!confirm(`¿Eliminar “${name}”? Esta acción no se puede deshacer.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="pbtn pbtn--danger">
        Eliminar
      </button>
    </form>
  );
}
