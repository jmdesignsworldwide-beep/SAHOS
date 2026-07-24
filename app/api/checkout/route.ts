import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
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
        // Attribution: tie this order back to the anonymous analytics session so
        // the order sync can mark the cart converted + record the purchase event
        // (closes the funnel). Never PII — just the first-party session id.
        analytics_session: cookies().get('sa_sid')?.value ?? '',
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

    // Surface the ACTUAL reason. Every error that reaches here is a Checkout
    // *creation* failure — a misconfigured/inactive live account, a bad or
    // restricted key, or an invalid parameter. A customer's card is NEVER
    // declined here (that happens later on Stripe's hosted page), so the Stripe
    // message carries no sensitive data and is safe to show. We put the reason
    // straight into `error` (not just a separate `detail`) so it appears even on
    // an older cached client that only renders `error`, and for ANY Stripe error
    // type — not a hand-picked few. Once the store is configured these don't
    // occur, so real shoppers won't see them.
    // StripeConnectionError wraps the underlying transport error at `.detail`;
    // with the fetch client the real socket error is one level deeper at
    // `.detail.cause`. Dig out that ROOT so the infrastructure cause
    // (ETIMEDOUT / ENOTFOUND / ECONNRESET / a TLS/cert error) is surfaced —
    // not just Stripe's generic "connection" wrapper — and echo it in the
    // message so it's visible in the alert without spelunking Vercel logs.
    const err = e as { type?: string; code?: string; message?: string; detail?: any };
    const transport = err?.detail;
    const rootCause = transport?.cause ?? transport;
    const rootCode = rootCause?.code ?? transport?.code ?? err?.code;
    const isStripeError = typeof err?.type === 'string' && err.type.startsWith('Stripe');
    const bits = [
      err?.message,
      rootCause?.message && rootCause.message !== err?.message ? rootCause.message : null,
      rootCode ? `(${rootCode})` : null,
    ].filter(Boolean);
    const reason = isStripeError || rootCode ? bits.join(' ') : undefined;
    const error = reason ? `Could not start checkout: ${reason}` : 'Could not start checkout';

    return NextResponse.json(
      { error, code: rootCode ?? err?.code, type: err?.type, detail: reason },
      { status: 502 }
    );
  }
}
