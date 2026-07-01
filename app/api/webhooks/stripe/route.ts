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
        if (supabase) {
          await supabase.from('orders').upsert(
            {
              stripe_payment_intent: session.payment_intent ?? session.id,
              email: session.customer_details?.email ?? null,
              status: session.payment_status === 'paid' ? 'paid' : 'pending',
              amount_cents: session.amount_total ?? 0,
              currency: session.currency ?? 'usd',
              shipping_json: session.shipping_details ?? session.customer_details ?? null,
            },
            { onConflict: 'stripe_payment_intent' }
          );
          // Order items reconciliation from metadata.cart would happen here,
          // decrementing product_sizes.stock in a SECURITY DEFINER RPC.
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
