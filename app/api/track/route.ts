import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServiceClient } from '@/lib/supabase/server';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { EVENT_TYPES, type EventType, type TrackEvent, type CartLine } from '@/lib/track-events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// -----------------------------------------------------------------------------
// Analytics ingestion. The public store's tracker posts anonymous behavioral
// events here (page_view, product_view, size_select, add/remove_from_cart,
// checkout_started). We:
//   * identify the visitor by a first-party, httpOnly session cookie (no PII),
//   * derive geography + device SERVER-side (never trusting the browser),
//   * validate + sanitize every field and rate-limit by a transient IP that is
//     NEVER stored,
//   * write with the service_role client (anon has no table access at all).
//
// purchase events are recorded server-side from the Stripe order sync
// (lib/orders.ts), not here, so they can't be forged and never double-count.
// -----------------------------------------------------------------------------

const SESSION_COOKIE = 'sa_sid';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_EVENTS = 20;

function clean(value: string | null | undefined, max: number): string | null {
  if (!value) return null;
  let v = String(value);
  try {
    v = decodeURIComponent(v);
  } catch {
    /* keep as-is */
  }
  v = v.trim();
  return v ? v.slice(0, max) : null;
}

function deviceFrom(ua: string): 'mobile' | 'tablet' | 'desktop' {
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return 'tablet';
  if (/Mobi|Android|iPhone|iPod|IEMobile|BlackBerry|Opera Mini/i.test(ua)) return 'mobile';
  return 'desktop';
}

/** Classify where a session came from, referrer + UTM. First-party host = self. */
function sourceFrom(referrerHost: string | null, utmSource: string | null, selfHost: string | null): string {
  if (utmSource) return utmSource.toLowerCase().slice(0, 40);
  if (!referrerHost) return 'direct';
  const h = referrerHost.toLowerCase();
  if (selfHost && (h === selfHost || h.endsWith(`.${selfHost}`))) return 'direct';
  if (/(^|\.)instagram\.com$|(^|\.)l\.instagram\.com$/.test(h)) return 'instagram';
  if (/(^|\.)facebook\.com$|(^|\.)fb\.|(^|\.)l\.facebook\.com$/.test(h)) return 'facebook';
  if (/(^|\.)google\./.test(h)) return 'google';
  if (/(^|\.)tiktok\.com$/.test(h)) return 'tiktok';
  if (/(^|\.)t\.co$|(^|\.)twitter\.com$|(^|\.)x\.com$/.test(h)) return 'twitter';
  if (/(^|\.)pinterest\./.test(h)) return 'pinterest';
  if (/(^|\.)bing\.com$|(^|\.)duckduckgo\.com$|(^|\.)yahoo\./.test(h)) return 'search';
  return 'referral';
}

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase().slice(0, 120);
  } catch {
    return null;
  }
}

function normalizeItems(items: unknown): { lines: CartLine[]; valueCents: number; count: number } {
  if (!Array.isArray(items)) return { lines: [], valueCents: 0, count: 0 };
  const lines: CartLine[] = [];
  let valueCents = 0;
  let count = 0;
  for (const raw of items.slice(0, 20)) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const slug = clean(r.slug as string, 80);
    if (!slug) continue;
    const qty = Math.max(1, Math.min(99, Math.floor(Number(r.qty) || 1)));
    const unit = Math.max(0, Math.min(10_000_000, Math.floor(Number(r.value_cents) || 0)));
    const size = clean(r.size as string, 8);
    lines.push({ slug, size, qty, value_cents: unit });
    valueCents += unit * qty;
    count += qty;
  }
  return { lines, valueCents, count };
}

export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  // Generous: a real visitor emits a handful of events per page. Only blocks floods.
  const limit = rateLimit(`track:${ip}`, 240, 60_000);
  if (!limit.ok) return new NextResponse(null, { status: 204 });

  let events: TrackEvent[] = [];
  try {
    const body = await req.json();
    const arr = Array.isArray(body?.events) ? body.events : body?.t ? [body] : [];
    events = arr
      .filter((e: any) => e && typeof e.t === 'string' && (EVENT_TYPES as readonly string[]).includes(e.t))
      .slice(0, MAX_EVENTS);
  } catch {
    events = [];
  }
  // Clients never emit purchase — that is recorded server-side from the order.
  events = events.filter((e) => e.t !== 'purchase');
  if (events.length === 0) return new NextResponse(null, { status: 204 });

  // Drop any /portal traffic defensively.
  events = events.filter((e) => {
    const p = typeof e.path === 'string' ? e.path : '';
    return !(p === '/portal' || p.startsWith('/portal/'));
  });
  if (events.length === 0) return new NextResponse(null, { status: 204 });

  const supabase = await getServiceClient();
  const res = new NextResponse(null, { status: 204 });
  if (!supabase) return res; // preview / no DB → accept silently, persist nothing

  // --- Session identity (first-party, httpOnly cookie) ---------------------
  const jar = cookies();
  const existing = jar.get(SESSION_COOKIE)?.value;
  const sessionId = existing && UUID_RE.test(existing) ? existing : crypto.randomUUID();
  const isNew = sessionId !== existing;
  if (isNew) {
    res.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
  }

  const h = req.headers;
  const ua = clean(h.get('user-agent'), 400) ?? '';
  const country = clean(h.get('x-vercel-ip-country'), 2);
  const region = clean(h.get('x-vercel-ip-country-region'), 40);
  const selfHost = hostOf(h.get('origin')) ?? (h.get('host') ? h.get('host')!.toLowerCase() : null);

  // First-touch attribution from the earliest page_view in this batch.
  const firstPV = events.find((e) => e.t === 'page_view');
  const referrerHost = hostOf(firstPV?.ref ?? null);
  const utmSource = clean(firstPV?.utm?.source, 40);
  const referrerSource = sourceFrom(referrerHost, utmSource, selfHost);

  // Upsert the session. On INSERT we set first-touch fields; on repeat visits we
  // only bump last_seen_at (and backfill attribution if it was unknown).
  try {
    if (isNew) {
      await supabase.from('analytics_sessions').insert({
        id: sessionId,
        referrer: referrerHost,
        referrer_source: referrerSource,
        utm_source: utmSource,
        utm_medium: clean(firstPV?.utm?.medium, 40),
        utm_campaign: clean(firstPV?.utm?.campaign, 80),
        device: deviceFrom(ua),
        country: country ? country.toUpperCase() : null,
        region,
        user_agent: ua || null,
      });
    } else {
      await supabase
        .from('analytics_sessions')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', sessionId);
    }
  } catch {
    /* session write is best-effort */
  }

  // --- Events + cart lifecycle --------------------------------------------
  const rows: Record<string, unknown>[] = [];
  const pageVisits: Record<string, unknown>[] = [];
  let cartUpsert: Record<string, unknown> | null = null;

  for (const e of events) {
    const path = clean(e.path, 200);
    const slug = clean(e.slug, 80);
    const size = clean(e.size ?? null, 8);
    const value = e.value != null ? Math.max(0, Math.min(10_000_000, Math.floor(Number(e.value)))) : null;
    const isCartEvent = e.t === 'add_to_cart' || e.t === 'remove_from_cart' || e.t === 'checkout_started';
    const snapshot = isCartEvent ? normalizeItems(e.items) : null;

    rows.push({
      session_id: sessionId,
      event_type: e.t as EventType,
      product_slug: slug,
      size,
      value_cents: value,
      path,
      metadata: snapshot ? { items: snapshot.lines } : null,
    });

    // Keep the location map (page_visits) fed by page views, unchanged.
    if (e.t === 'page_view') pageVisits.push({ country: country ? country.toUpperCase() : null, region, city: clean(h.get('x-vercel-ip-city'), 120), path });

    // Cart snapshot: latest add/remove/checkout wins within a batch.
    if (e.t === 'add_to_cart' || e.t === 'remove_from_cart' || e.t === 'checkout_started') {
      const { lines, valueCents, count } = normalizeItems(e.items);
      cartUpsert = {
        session_id: sessionId,
        state: 'active',
        items: lines,
        value_cents: valueCents,
        item_count: count,
        last_step: e.t === 'checkout_started' ? 'checkout_started' : 'add_to_cart',
        updated_at: new Date().toISOString(),
      };
    }
  }

  try {
    if (rows.length) await supabase.from('analytics_events').insert(rows);
    if (pageVisits.length) await supabase.from('page_visits').insert(pageVisits);
    if (cartUpsert) await supabase.from('carts').upsert(cartUpsert, { onConflict: 'session_id' });
  } catch (err) {
    console.error('[track] write error', err instanceof Error ? err.message : err);
  }

  return res;
}
