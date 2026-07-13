'use client';

import { deleteOrderAction } from '@/app/portal/actions';

// Delete a single order (e.g. a Stripe test-mode order) with an explicit
// confirmation. Submits the order id to the auth-gated server action; only this
// one order is removed. Use with care — it can't be undone.
export function DeleteOrderButton({ id, label }: { id: string; label: string }) {
  return (
    <form
      action={deleteOrderAction}
      onSubmit={(e) => {
        if (
          !confirm(
            `¿Eliminar el pedido #${label}? Esto lo borra de forma permanente de la base de datos y de las estadísticas. Úsalo solo para pedidos de prueba. No se puede deshacer.`
          )
        )
          e.preventDefault();
      }}
    >
      <input type="hidden" name="order_id" value={id} />
      <button type="submit" className="pbtn pbtn--danger">
        Eliminar pedido de prueba
      </button>
    </form>
  );
}
