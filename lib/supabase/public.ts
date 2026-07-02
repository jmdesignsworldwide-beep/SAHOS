import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { env, hasSupabasePublic } from '@/lib/env';

// Anon, session-less server client for reading PUBLIC catalog data (products,
// images, sizes) in server components. RLS still applies (public read of active
// rows only). Returns null when Supabase is not configured, so callers fall
// back to the static catalog and the store keeps rendering.
export function getPublicClient() {
  if (!hasSupabasePublic()) return null;
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
