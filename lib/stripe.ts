import 'server-only';
import { env, hasStripe } from '@/lib/env';

// Server-only Stripe client. Secret key never leaves the server (spec §8.1,
// §8.10). Dynamic import keeps the app buildable without the package/keys.
export async function getStripe() {
  if (!hasStripe()) return null;
  const Stripe = (await import('stripe')).default;
  return new Stripe(env.stripeSecret, {
    apiVersion: '2024-06-20',
    // Ride out transient connection blips to api.stripe.com (serverless cold
    // starts / DNS / reset). The SDK retries idempotently with backoff; this
    // raises the default of 1 so a single flaky moment doesn't fail checkout.
    maxNetworkRetries: 3,
    // Cap per-attempt wait so a hung connection fails fast enough to retry
    // within the function's budget instead of stalling the whole request.
    timeout: 15000,
  });
}
