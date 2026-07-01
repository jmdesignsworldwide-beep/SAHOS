import 'server-only';
import { env, hasStripe } from '@/lib/env';

// Server-only Stripe client. Secret key never leaves the server (spec §8.1,
// §8.10). Dynamic import keeps the app buildable without the package/keys.
export async function getStripe() {
  if (!hasStripe()) return null;
  const Stripe = (await import('stripe')).default;
  return new Stripe(env.stripeSecret, { apiVersion: '2024-06-20' });
}
