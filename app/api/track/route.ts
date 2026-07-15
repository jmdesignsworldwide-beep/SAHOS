import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/server';
import { rateLimit, clientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// -----------------------------------------------------------------------------
// Privacy-first visit tracking. The public store's <VisitTracker/> pings this
// endpoint once per page view. We derive APPROXIMATE geography from Vercel's
// edge geo headers (country / region / city) and store only that + the path +
// a timestamp.
//
// We NEVER store the IP. The IP is read once, in memory, purely to rate-limit
// this endpoint, and is discarded — nothing identifying is persisted (§privacy).
//
// Rows are written with the service_role client (bypasses RLS); the anon key
// has no insert policy, so the table can't be written from the browser. In
// preview / no-DB mode we no-op gracefully so the store is never affected.
// -----------------------------------------------------------------------------

/** Vercel URL-encodes city/region; decode + trim + cap length defensively. */
function clean(value: string | null, max = 120): string | null {
  if (!value) return null;
  let v = value;
  try {
    v = decodeURIComponent(value);
  } catch {
    /* leave as-is if it isn't valid percent-encoding */
  }
  v = v.trim();
  if (!v) return null;
  return v.slice(0, max);
}

export async function POST(req: Request) {
  // Rate-limit on a transient IP key (never stored). Generous: a real visitor
  // triggers a handful of page views; this only blocks abusive floods.
  const ip = clientIp(req.headers);
  const limit = rateLimit(`track:${ip}`, 60, 60_000); // 60 views / min / IP
  if (!limit.ok) {
    return new NextResponse(null, { status: 204 });
  }

  let path: string | null = null;
  try {
    const body = await req.json();
    if (typeof body?.path === 'string') path = body.path.slice(0, 200);
  } catch {
    /* no/invalid body — still record the visit without a path */
  }

  // Defense in depth: never record portal (admin) traffic, even if pinged.
  if (path && (path === '/portal' || path.startsWith('/portal/'))) {
    return new NextResponse(null, { status: 204 });
  }

  const supabase = await getServiceClient();
  if (!supabase) {
    // Preview / unconfigured — accept silently, persist nothing.
    return new NextResponse(null, { status: 204 });
  }

  const h = req.headers;
  const country = clean(h.get('x-vercel-ip-country'), 2);
  const region = clean(h.get('x-vercel-ip-country-region'), 40);
  const city = clean(h.get('x-vercel-ip-city'), 120);

  const { error } = await supabase.from('page_visits').insert({
    country: country ? country.toUpperCase() : null,
    region,
    city,
    path,
  });
  if (error) {
    // Analytics must never break the store — log and move on.
    console.error('[track] insert error', error.message);
  }

  return new NextResponse(null, { status: 204 });
}
