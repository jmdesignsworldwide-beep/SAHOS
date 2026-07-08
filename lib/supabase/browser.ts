'use client';

import { createBrowserClient } from '@supabase/ssr';

// Browser Supabase client (anon key — public, safe to ship). Used ONLY to push a
// file straight to Storage via a server-issued signed upload URL, so large
// images never travel through a Server Action / serverless function body (which
// Next caps at 1MB and Vercel at ~4.5MB). service_role is never used here.
let cached: ReturnType<typeof createBrowserClient> | null = null;

export function getBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!cached) cached = createBrowserClient(url, key);
  return cached;
}
