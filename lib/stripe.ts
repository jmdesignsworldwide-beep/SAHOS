import 'server-only';
import https from 'node:https';
import { env, hasStripe } from '@/lib/env';

// Force the Stripe connection over IPv4. Node prefers IPv6 (AAAA) DNS results,
// and some serverless egress paths have broken/black-holed IPv6 routing to
// api.stripe.com — which surfaces as a persistent StripeConnectionError ("an
// error occurred with our connection to Stripe, retried N times") that no amount
// of retrying fixes. Pinning the agent to family:4 sidesteps the dead IPv6 path;
// api.stripe.com is always reachable over IPv4, so this is safe. keepAlive reuses
// the socket across the SDK's own retries.
const stripeAgent = new https.Agent({ family: 4, keepAlive: true });

// Server-only Stripe client. Secret key never leaves the server (spec §8.1,
// §8.10). Dynamic import keeps the app buildable without the package/keys.
export async function getStripe() {
  if (!hasStripe()) return null;
  const Stripe = (await import('stripe')).default;
  return new Stripe(env.stripeSecret, {
    apiVersion: '2024-06-20',
    // Route over IPv4 (see stripeAgent above) — the actual fix for the
    // persistent connection failure.
    httpAgent: stripeAgent,
    // Ride out transient connection blips too (serverless cold starts / DNS /
    // reset): retry idempotently with backoff instead of the default 1.
    maxNetworkRetries: 3,
    // Cap per-attempt wait so a hung connection fails fast enough to retry
    // within the function's budget instead of stalling the whole request.
    timeout: 15000,
  });
}
