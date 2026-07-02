'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateFulfillmentAction } from '@/app/portal/actions';
import { FULFILLMENT_LABEL, nextFulfillment } from '@/lib/orderStatus';
import type { AdminOrder, FulfillmentStatus } from '@/lib/admin';

// One-/two-click fulfillment control: advance to the next stage, or jump to any
// stage. Marking "Enviado" reveals optional tracking + courier fields.
export function OrderStatusControl({ order }: { order: AdminOrder }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [tracking, setTracking] = useState(order.tracking_number ?? '');
  const [courier, setCourier] = useState(order.courier ?? '');

  const set = (status: FulfillmentStatus) => {
    setError(null);
    const fd = new FormData();
    fd.set('order_id', order.id);
    fd.set('fulfillment_status', status);
    if (status === 'shipped' || order.fulfillment_status === 'shipped') {
      fd.set('tracking_number', tracking);
      fd.set('courier', courier);
    }
    startTransition(async () => {
      const res = await updateFulfillmentAction(fd);
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  };

  const next = nextFulfillment(order.fulfillment_status);
  const showShipping = order.fulfillment_status === 'shipped' || next === 'shipped';

  return (
    <div className="ostatus">
      <div className="ostatus__stepper">
        {(['new', 'preparing', 'shipped', 'delivered'] as FulfillmentStatus[]).map((s) => (
          <button
            key={s}
            className={`ostep ${order.fulfillment_status === s ? 'is-current' : ''}`}
            onClick={() => set(s)}
            disabled={pending || order.fulfillment_status === s}
          >
            {FULFILLMENT_LABEL[s]}
          </button>
        ))}
      </div>

      {showShipping && (
        <div className="ostatus__shipping">
          <label className="pfield">
            <span>Número de tracking</span>
            <input value={tracking} onChange={(e) => setTracking(e.target.value)} maxLength={120} />
          </label>
          <label className="pfield">
            <span>Courier</span>
            <input value={courier} onChange={(e) => setCourier(e.target.value)} maxLength={60} placeholder="p. ej. Caribe Tours, DHL" />
          </label>
        </div>
      )}

      <div className="ostatus__actions">
        {next && (
          <button className="pbtn pbtn--primary" onClick={() => set(next)} disabled={pending}>
            {pending ? 'Guardando…' : `Marcar como ${FULFILLMENT_LABEL[next]}`}
          </button>
        )}
        {order.fulfillment_status !== 'cancelled' && (
          <button className="pbtn pbtn--danger" onClick={() => set('cancelled')} disabled={pending}>
            Cancelar pedido
          </button>
        )}
      </div>

      {error && <p className="pmsg pmsg--error">{error}</p>}
    </div>
  );
}
