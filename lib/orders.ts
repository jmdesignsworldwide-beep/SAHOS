import 'server-only';
import { getServiceClient } from '@/lib/supabase/server';

// Single source of truth for turning a PAID Stripe Checkout Session into a
// SAHOS order. Called from BOTH the verified webhook AND the success page, so
// the order appears even if the webhook endpoint is misconfigured. Fully
// idempotent (upsert by stripe_payment_intent + idempotent record_order_items
// RPC), so running it twice never duplicates an order or double-decrements.

export interface SyncResult {
  ok: boolean;
  orderId?: string;
  reason?: string;
}

export async function syncOrderFromSession(session: any): Promise<SyncResult> {
  if (!session) return { ok: false, reason: 'no session' };
  if (session.payment_status !== 'paid') return { ok: false, reason: `not paid (${session.payment_status})` };

  const supabase = await getServiceClient();
  if (!supabase) return { ok: false, reason: 'SUPABASE_SERVICE_ROLE_KEY missing' };

  const paymentIntent = session.payment_intent ?? session.id;

  // Shipping location moved across Stripe API versions — read both shapes.
  const ship = session.shipping_details ?? session.collected_information?.shipping_details ?? null;
  const phone = session.customer_details?.phone ?? null;
  const shippingJson = ship
    ? { name: ship.name ?? null, phone, address: ship.address ?? null }
    : session.customer_details ?? null;
  const customerName = ship?.name ?? session.customer_details?.name ?? null;

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .upsert(
      {
        stripe_payment_intent: paymentIntent,
        email: session.customer_details?.email ?? null,
        customer_name: customerName,
        status: 'paid',
        amount_cents: session.amount_total ?? 0,
        currency: session.currency ?? 'usd',
        shipping_json: shippingJson,
      },
      { onConflict: 'stripe_payment_intent' }
    )
    .select('id')
    .single();

  if (orderErr || !order) {
    return { ok: false, reason: `order write failed: ${orderErr?.message ?? 'unknown'}` };
  }

  // Record items + decrement inventory (idempotent — skips if items exist).
  let items: unknown = [];
  try {
    items = JSON.parse(session.metadata?.cart ?? '[]');
  } catch {
    items = [];
  }
  const { error: rpcErr } = await supabase.rpc('record_order_items', {
    p_order: order.id,
    p_items: items,
  });
  if (rpcErr) return { ok: false, orderId: order.id, reason: `items write failed: ${rpcErr.message}` };

  return { ok: true, orderId: order.id };
}
