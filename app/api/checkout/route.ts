import { NextResponse } from 'next/server';
import { parseBag } from '@/lib/validate';
import { resolveBag } from '@/lib/catalog';
import { getStripe } from '@/lib/stripe';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { env, hasStripe } from '@/lib/env';
import { SHIPPING_FLAT_CENTS, SHIPPING_LABEL, SHIPPING_ALLOWED_COUNTRIES } from '@/lib/shipping';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Checkout (spec §4.4, §8.3): the server re-prices and stock-checks the bag
// against the source of truth, then creates a Stripe Checkout Session. The
// amount is computed here — the client's prices are NEVER trusted. Apple/Google
// Pay ride along automatically through Stripe Checkout.
export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  const limit = rateLimit(`checkout:${ip}`, 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } });
  }

  let lines;
  try {
    lines = parseBag(await req.json());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid request' }, { status: 400 });
  }

  // Server-authoritative pricing + stock.
  let resolved;
  try {
    resolved = await resolveBag(lines);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Catalog error' }, { status: 409 });
  }

  const oos = resolved.find((r) => !r.inStock);
  if (oos) {
    return NextResponse.json({ error: `${oos.name} (size ${oos.size}) is out of stock` }, { status: 409 });
  }

  if (!hasStripe()) {
    // Preview mode: no Stripe keys configured yet.
    return NextResponse.json(
      { error: 'Checkout is not configured yet. Add Stripe keys to enable payments.' },
      { status: 503 }
    );
  }

  const stripe = await getStripe();
  if (!stripe) {
    return NextResponse.json({ error: 'Payments unavailable' }, { status: 503 });
  }

  // Base URL for the post-payment redirect. Derive it from the ACTUAL request
  // origin so the customer always returns to the same domain the checkout ran
  // on — never a stale/wrong NEXT_PUBLIC_SITE_URL (which was redirecting to
  // localhost). Falls back to the env var, then to the Stripe-safe default.
  const h = req.headers;
  const fwdHost = h.get('x-forwarded-host') || h.get('host');
  const fwdProto = h.get('x-forwarded-proto') || 'https';
  const base = h.get('origin') || (fwdHost ? `${fwdProto}://${fwdHost}` : env.siteUrl);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      // Apple Pay / Google Pay surface automatically on hosted Checkout via 'card'.
      payment_method_types: ['card'],
      line_items: resolved.map((r) => ({
        quantity: r.qty,
        price_data: {
          currency: 'usd',
          unit_amount: r.unitPriceCents, // server-computed, authoritative
          product_data: { name: `SAHOS — ${r.name}`, description: `Size ${r.size}` },
        },
      })),
      automatic_tax: { enabled: false },
      // Full shipping address (required for shipping labels later — EasyPost).
      shipping_address_collection: { allowed_countries: [...SHIPPING_ALLOWED_COUNTRIES] },
      phone_number_collection: { enabled: true },
      // Flat shipping fee, shown as its own line at checkout. Single source of
      // truth in lib/shipping.ts — swap for EasyPost dynamic rates later.
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: SHIPPING_FLAT_CENTS, currency: 'usd' },
            display_name: SHIPPING_LABEL,
          },
        },
      ],
      // Bind the resolved cart (server-authoritative prices) into metadata so
      // the webhook can record order items + decrement inventory.
      metadata: {
        cart: JSON.stringify(
          resolved.map((r) => ({ slug: r.slug, size: r.size, qty: r.qty, unit_price_cents: r.unitPriceCents }))
        ),
        shipping_cents: String(SHIPPING_FLAT_CENTS),
      },
      success_url: `${base}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/#collection`,
    });

    if (!session.url) {
      // A session with no URL is unusable — treat it as a failure rather than
      // redirecting the customer to `undefined`.
      console.error('[checkout] stripe returned a session with no url', session.id);
      return NextResponse.json({ error: 'Could not start checkout', code: 'no_session_url' }, { status: 502 });
    }
    return NextResponse.json({ url: session.url });
  } catch (e) {
    // Always log the full error server-side (Vercel logs).
    console.error('[checkout] stripe error', e);

    // Surface the ACTUAL reason for CONFIGURATION failures so an outage is
    // diagnosable instead of opaque. A misconfigured or inactive live account,
    // a bad/restricted key, or an invalid parameter all fail the whole store —
    // the operator needs to see why. Stripe's auth/permission/invalid-request
    // messages are safe to show (they carry no secrets). Card-level or unknown
    // errors stay generic. These config errors don't occur in normal operation,
    // so real customers won't see the detail once the store is set up correctly.
    const err = e as { type?: string; code?: string; message?: string };
    const CONFIG_ERROR_TYPES = [
      'StripeAuthenticationError', // bad / missing / revoked secret key
      'StripePermissionError', // restricted key lacking Checkout permission
      'StripeInvalidRequestError', // bad param, missing price, account not enabled
    ];
    const detail = err?.type && CONFIG_ERROR_TYPES.includes(err.type) ? err.message : undefined;

    return NextResponse.json(
      { error: 'Could not start checkout', code: err?.code, type: err?.type, detail },
      { status: 502 }
    );
  }
}
