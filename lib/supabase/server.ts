import 'server-only';
import { env, hasSupabase } from '@/lib/env';

// Server-only Supabase client using the SERVICE ROLE key. This bypasses RLS and
// must NEVER be imported into a client component (the `server-only` guard makes
// that a build error). Loaded dynamically so the app builds without the package
// or credentials present (spec §8.1).
export async function getServiceClient() {
  if (!hasSupabase()) return null;
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(env.supabaseUrl, env.supabaseServiceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
