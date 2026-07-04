import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getServiceClient } from '@/lib/supabase/server';
import { env } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Stripe webhook (spec §8.10). Order state is updated ONLY here, after the
// signature is verified against the signing secret — never from the client.
// Requires the raw body, so we read req.text() and do not parse it first.
export async function POST(req: Request) {
  if (!env.stripeWebhookSecret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  const stripe = await getStripe();
  if (!stripe) return NextResponse.json({ error: 'Unavailable' }, { status: 503 });

  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });

  const raw = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, env.stripeWebhookSecret);
  } catch (e) {
    // Signature mismatch → reject. Do not trust the payload.
    console.error('[webhook] signature verification failed', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = await getServiceClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        // Only act on a paid session; other statuses are acknowledged (200).
        if (session.payment_status === 'paid') {
          // If the DB can't be reached, FAIL loudly so the failure shows up in
          // Stripe's delivery log (and Stripe retries once it's fixed) instead
          // of a silent 200 that looks successful but creates no order.
          if (!supabase) {
            console.error('[webhook] SUPABASE_SERVICE_ROLE_KEY missing — cannot create order');
            return NextResponse.json(
              { error: 'Order store not configured (missing service role key)' },
              { status: 500 }
            );
          }
          const paymentIntent = session.payment_intent ?? session.id;

          // Shipping details location moved across Stripe API versions; read
          // both. Store a normalized { name, phone, address } for the portal.
          const ship = session.shipping_details ?? session.collected_information?.shipping_details ?? null;
          const phone = session.customer_details?.phone ?? null;
          const shippingJson = ship
            ? { name: ship.name ?? null, phone, address: ship.address ?? null }
            : session.customer_details ?? null;
          const customerName = ship?.name ?? session.customer_details?.name ?? null;

          // 1) Create/patch the order (payment status is authoritative here).
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
            console.error('[webhook] order upsert failed', orderErr?.message);
            return NextResponse.json({ error: `Order write failed: ${orderErr?.message}` }, { status: 500 });
          }

          // 2) Record items + decrement inventory atomically (idempotent on
          //    retries). The cart was bound into metadata at checkout, already
          //    re-priced server-side — never trusted from the browser.
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
          if (rpcErr) {
            console.error('[webhook] record_order_items failed', rpcErr.message);
            // order exists; surface so the delivery log flags it and retries
            return NextResponse.json({ error: `Items write failed: ${rpcErr.message}` }, { status: 500 });
          }
        }
        break;
      }
      case 'charge.refunded':
      case 'refund.created': {
        const obj = event.data.object as any;
        const pi = obj.payment_intent;
        if (supabase && pi) {
          await supabase.from('orders').update({ status: 'refunded' }).eq('stripe_payment_intent', pi);
        }
        break;
      }
      case 'checkout.session.expired':
      case 'payment_intent.payment_failed': {
        const obj = event.data.object as any;
        if (supabase && obj.payment_intent) {
          await supabase
            .from('orders')
            .update({ status: 'failed' })
            .eq('stripe_payment_intent', obj.payment_intent);
        }
        break;
      }
      default:
        // Unhandled events are acknowledged so Stripe stops retrying.
        break;
    }
  } catch (e) {
    console.error('[webhook] handler error', e);
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
