import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getServiceClient } from '@/lib/supabase/server';
import { syncOrderFromSession } from '@/lib/orders';
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
        // Create the order via the shared, idempotent path. On any failure,
        // return non-200 so Stripe's delivery log shows the real cause and
        // retries once it's fixed (instead of a silent, misleading 200).
        if (session.payment_status === 'paid') {
          const res = await syncOrderFromSession(session);
          if (!res.ok) {
            console.error('[webhook] order sync failed:', res.reason);
            return NextResponse.json({ error: res.reason }, { status: 500 });
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
