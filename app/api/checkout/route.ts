import { NextResponse } from 'next/server';
import { parseBag } from '@/lib/validate';
import { resolveBag } from '@/lib/catalog';
import { getStripe } from '@/lib/stripe';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { env, hasStripe } from '@/lib/env';

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

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      // Apple Pay / Google Pay surface automatically via 'card' in Checkout.
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
      shipping_address_collection: { allowed_countries: ['US'] },
      // Bind the resolved cart (server-authoritative prices) into metadata so
      // the webhook can record order items + decrement inventory.
      metadata: {
        cart: JSON.stringify(
          resolved.map((r) => ({ slug: r.slug, size: r.size, qty: r.qty, unit_price_cents: r.unitPriceCents }))
        ),
      },
      success_url: `${env.siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.siteUrl}/collection`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    // Never leak Stripe internals to the client.
    console.error('[checkout] stripe error', e);
    return NextResponse.json({ error: 'Could not start checkout' }, { status: 502 });
  }
}
