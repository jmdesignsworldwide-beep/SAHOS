import 'server-only';
import { env, hasStripe } from '@/lib/env';

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
  const Stripe = (await import('stripe')).default;
  return new Stripe(env.stripeSecret, {
    apiVersion: '2024-06-20',
    httpClient: Stripe.createFetchHttpClient(),
    maxNetworkRetries: 3,
    timeout: 15000,
  });
}
