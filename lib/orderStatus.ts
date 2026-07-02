import type { FulfillmentStatus, PaymentStatus } from '@/lib/admin';

// Spanish labels + visual tone for order statuses. Pure module (client + server).

export const FULFILLMENT_FLOW: FulfillmentStatus[] = ['new', 'preparing', 'shipped', 'delivered'];

export const FULFILLMENT_LABEL: Record<FulfillmentStatus, string> = {
  new: 'Nuevo',
  preparing: 'Preparando',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  failed: 'Fallido',
  fulfilled: 'Completado',
  refunded: 'Reembolsado',
  cancelled: 'Cancelado',
};

/** CSS modifier for the status pill. */
export function fulfillmentTone(s: FulfillmentStatus): string {
  return s;
}

export function nextFulfillment(s: FulfillmentStatus): FulfillmentStatus | null {
  const i = FULFILLMENT_FLOW.indexOf(s);
  if (i === -1 || i >= FULFILLMENT_FLOW.length - 1) return null;
  return FULFILLMENT_FLOW[i + 1];
}
