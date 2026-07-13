import 'server-only';
import { env, hasStripe } from '@/lib/env';

// Scrub the secret key before it ever reaches the SDK. A Stripe key is only
// [A-Za-z0-9_] (e.g. sk_live_…), so we strip whitespace, newlines and ANY other
// character — including invisible non-ASCII look-alikes (a Cyrillic "С", U+0421,
// pasted in place of a Latin "C") that otherwise throw
// "Cannot convert argument to a ByteString … greater than 255" when the SDK
// builds the Authorization header, breaking checkout. This makes a key that was
// pasted with a stray character self-heal instead of failing the whole store.
function cleanStripeKey(raw: string): string {
  return raw.replace(/[^A-Za-z0-9_]/g, '');
}

// Server-only Stripe client. Secret key never leaves the server (spec §8.1,
// §8.10). Dynamic import keeps the app buildable without the package/keys.
//
// Transport: the FETCH-based HTTP client (global undici `fetch`) instead of the
// SDK's default Node `https` module. In this deployment, outbound to
// api.stripe.com over the `https` module fails with a persistent
// StripeConnectionError that survives every retry — yet the store still reaches
// the Stripe step, meaning it already fetched prices from Supabase over `fetch`
// successfully. So `fetch` egress works and the `https` path does not; routing
// Stripe over the same `fetch` transport is the fix. Retries + timeout ride out
// any residual blips.
export async function getStripe() {
  if (!hasStripe()) return null;
  const key = cleanStripeKey(env.stripeSecret);
  if (!key) return null;
  if (key.length !== env.stripeSecret.length) {
    // Don't log the key — just flag that stray/invalid characters were removed.
    console.warn('[stripe] STRIPE_SECRET_KEY contained invalid characters that were stripped.');
  }
  const Stripe = (await import('stripe')).default;
  return new Stripe(key, {
    apiVersion: '2024-06-20',
    httpClient: Stripe.createFetchHttpClient(),
    maxNetworkRetries: 3,
    timeout: 15000,
  });
}
