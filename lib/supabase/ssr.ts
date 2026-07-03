import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { env } from '@/lib/env';

// Session-aware server client (anon key + the request's auth cookies). Use in
// server components and server actions to read the current user and perform
// writes AS that user — RLS then enforces "authenticated only" on the DB and
// Storage. This never uses the service_role key, so a bug can't bypass RLS.
export function createSSRClient() {
  const cookieStore = cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // called from a Server Component render — cookies are read-only here;
          // the middleware refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}

/** The authenticated user, or null. Validates the JWT with Supabase. */
export async function getSessionUser() {
  const supabase = createSSRClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
