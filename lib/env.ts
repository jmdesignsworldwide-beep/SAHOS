// Central env access. Server secrets are read here and NEVER exported to the
// client bundle — only functions in server-only modules call these (spec §8.1).

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  supabaseServiceRole: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  stripeSecret: process.env.STRIPE_SECRET_KEY ?? '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
};

export const hasSupabase = () => Boolean(env.supabaseUrl && env.supabaseServiceRole);
/** Public (anon) Supabase access — enough to read the catalog and run auth. */
export const hasSupabasePublic = () => Boolean(env.supabaseUrl && env.supabaseAnonKey);
export const hasStripe = () => Boolean(env.stripeSecret);
