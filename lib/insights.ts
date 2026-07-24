import 'server-only';
import { createSSRClient } from '@/lib/supabase/ssr';

// Behavioral analytics aggregation for /portal/analytics. Reads through the
// session-aware (RLS) client — admin-only, never service_role. Aggregation runs
// in JS at boutique scale; swap for SQL rollups past tens of thousands of rows.
//
// Abandoned-cart rule (single source of truth): a cart is "abandoned" when it
// still has items, was never converted, and has been inactive for longer than
// ABANDON_AFTER_MINUTES. Derived at read time — no cron needed.
export const ABANDON_AFTER_MINUTES = 120; // 2 hours

export type Range = 'today' | '7d' | '30d' | '90d';

const DAY = 86_400_000;
const DR_OFFSET_MS = 4 * 60 * 60 * 1000; // Dominican Republic, UTC-4 (matches dashboard)

export interface Delta {
  value: number;
  prev: number;
  /** percent change vs previous period; null when prev is 0 */
  deltaPct: number | null;
}

export interface FunnelStep {
  key: string;
  label: string;
  count: number;
  /** % of the FIRST step (overall pass-through) */
  pctOfTop: number;
  /** % of the PREVIOUS step (step conversion) */
  pctOfPrev: number;
}

export interface ProductRow {
  slug: string;
  name: string;
  image: string | null;
  views: number;
  addToCart: number;
  purchases: number;
  revenueCents: number;
  convRate: number; // purchases / views, %
}

export interface AbandonedCart {
  sessionId: string;
  items: { slug: string; size: string | null; qty: number; value_cents: number | null }[];
  valueCents: number;
  itemCount: number;
  lastStep: string | null;
  updatedAt: string;
}

export interface SourceRow {
  key: string;
  label: string;
  count: number;
  pct: number;
}

export interface TrendPoint {
  day: string;
  visitors: number;
  revenueCents: number;
}

export interface InsightsData {
  range: Range;
  configured: boolean;
  hasData: boolean;
  visitors: Delta;
  pageviews: Delta;
  conversionRate: Delta; // percent
  abandonedCarts: Delta;
  lostValueCents: number;
  revenueCents: Delta;
  funnel: FunnelStep[];
  funnelSlug: string | null;
  products: ProductRow[];
  abandoned: AbandonedCart[];
  sources: SourceRow[];
  devices: SourceRow[];
  trend: TrendPoint[];
}

function startOfDrDay(ms: number): number {
  const d = new Date(ms - DR_OFFSET_MS);
  const utcMidnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return utcMidnight + DR_OFFSET_MS; // back to real epoch
}

/** current window [from, now] and the equal-length preceding window [prevFrom, from]. */
function windows(range: Range): { from: number; prevFrom: number; now: number } {
  const now = Date.now();
  if (range === 'today') {
    const from = startOfDrDay(now);
    return { from, prevFrom: from - DAY, now };
  }
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const from = now - days * DAY;
  return { from, prevFrom: from - days * DAY, now };
}

function pctChange(value: number, prev: number): number | null {
  if (prev <= 0) return null;
  return ((value - prev) / prev) * 100;
}

const SOURCE_LABELS: Record<string, string> = {
  direct: 'Directo',
  instagram: 'Instagram',
  facebook: 'Facebook',
  google: 'Google',
  tiktok: 'TikTok',
  twitter: 'X / Twitter',
  pinterest: 'Pinterest',
  search: 'Buscadores',
  referral: 'Referidos',
};
const DEVICE_LABELS: Record<string, string> = { mobile: 'Móvil', desktop: 'Escritorio', tablet: 'Tablet' };

const EMPTY = (range: Range, configured: boolean): InsightsData => ({
  range,
  configured,
  hasData: false,
  visitors: { value: 0, prev: 0, deltaPct: null },
  pageviews: { value: 0, prev: 0, deltaPct: null },
  conversionRate: { value: 0, prev: 0, deltaPct: null },
  abandonedCarts: { value: 0, prev: 0, deltaPct: null },
  lostValueCents: 0,
  revenueCents: { value: 0, prev: 0, deltaPct: null },
  funnel: [],
  funnelSlug: null,
  products: [],
  abandoned: [],
  sources: [],
  devices: [],
  trend: [],
});

export async function adminInsights(range: Range = '30d', funnelSlug: string | null = null): Promise<InsightsData> {
  const supabase = createSSRClient();
  const { from, prevFrom, now } = windows(range);
  const fromIso = new Date(from).toISOString();
  const prevFromIso = new Date(prevFrom).toISOString();

  const sessionsP = supabase
    .from('analytics_sessions')
    .select('id,created_at,referrer_source,device')
    .gte('created_at', prevFromIso)
    .limit(100_000);

  const eventsP = supabase
    .from('analytics_events')
    .select('session_id,event_type,product_slug,created_at')
    .gte('created_at', prevFromIso)
    .limit(200_000);

  const cartsP = supabase
    .from('carts')
    .select('session_id,state,items,value_cents,item_count,last_step,updated_at,converted_order_id')
    .gte('updated_at', prevFromIso)
    .limit(100_000);

  const productsP = supabase
    .from('products')
    .select('id,slug,name,position,product_images(url,type,position)')
    .order('position');

  const paidOrdersP = supabase
    .from('orders')
    .select('amount_cents,created_at')
    .eq('status', 'paid')
    .gte('created_at', prevFromIso);

  const orderItemsP = supabase
    .from('order_items')
    .select('qty,unit_price_cents,product_id,orders!inner(status,created_at)')
    .eq('orders.status', 'paid')
    .gte('orders.created_at', prevFromIso);

  const [sessionsR, eventsR, cartsR, productsR, paidOrdersR, orderItemsR] = await Promise.all([
    sessionsP,
    eventsP,
    cartsP,
    productsP,
    paidOrdersP,
    orderItemsP,
  ]);

  // If the analytics tables aren't there yet, degrade to a clean empty state.
  if (sessionsR.error || eventsR.error || cartsR.error) {
    return EMPTY(range, false);
  }

  const inCur = (iso: string) => iso >= fromIso;
  const inPrev = (iso: string) => iso >= prevFromIso && iso < fromIso;

  // --- product metadata ----------------------------------------------------
  const products = (productsR.data ?? []) as any[];
  const bySlug = new Map<string, { name: string; image: string | null }>();
  const idToSlug = new Map<string, string>();
  for (const p of products) {
    const image =
      (p.product_images ?? [])
        .filter((i: any) => i.type === 'model')
        .sort((a: any, b: any) => a.position - b.position)[0]?.url ?? null;
    bySlug.set(p.slug, { name: p.name, image });
    idToSlug.set(p.id, p.slug);
  }

  // --- sessions: visitors, sources, devices --------------------------------
  const sessions = (sessionsR.data ?? []) as any[];
  let visitorsCur = 0;
  let visitorsPrev = 0;
  const sourceCur = new Map<string, number>();
  const deviceCur = new Map<string, number>();
  for (const s of sessions) {
    if (inCur(s.created_at)) {
      visitorsCur += 1;
      const src = s.referrer_source || 'direct';
      sourceCur.set(src, (sourceCur.get(src) ?? 0) + 1);
      const dev = s.device || 'desktop';
      deviceCur.set(dev, (deviceCur.get(dev) ?? 0) + 1);
    } else if (inPrev(s.created_at)) {
      visitorsPrev += 1;
    }
  }

  // --- events: pageviews + funnel session sets -----------------------------
  const events = (eventsR.data ?? []) as any[];
  let pageviewsCur = 0;
  let pageviewsPrev = 0;
  const step = {
    viewedProduct: new Set<string>(),
    addedToCart: new Set<string>(),
    checkoutStarted: new Set<string>(),
  };
  const visitedSessions = new Set<string>();
  // per-product analytic counts (current window)
  const viewsByslug = new Map<string, number>();
  const addByslug = new Map<string, number>();

  for (const e of events) {
    const cur = inCur(e.created_at);
    if (e.event_type === 'page_view') {
      if (cur) pageviewsCur += 1;
      else if (inPrev(e.created_at)) pageviewsPrev += 1;
    }
    if (!cur) continue;
    if (e.session_id) visitedSessions.add(e.session_id);
    const slugMatch = !funnelSlug || e.product_slug === funnelSlug;
    switch (e.event_type) {
      case 'product_view':
        if (e.product_slug) viewsByslug.set(e.product_slug, (viewsByslug.get(e.product_slug) ?? 0) + 1);
        if (e.session_id && slugMatch) step.viewedProduct.add(e.session_id);
        break;
      case 'add_to_cart':
        if (e.product_slug) addByslug.set(e.product_slug, (addByslug.get(e.product_slug) ?? 0) + 1);
        if (e.session_id && slugMatch) step.addedToCart.add(e.session_id);
        break;
      case 'checkout_started':
        if (e.session_id && slugMatch) step.checkoutStarted.add(e.session_id);
        break;
    }
  }

  // --- carts: abandoned + converted ---------------------------------------
  const carts = (cartsR.data ?? []) as any[];
  const nowMs = now;
  const abandonThreshold = ABANDON_AFTER_MINUTES * 60_000;
  let abandonedCur = 0;
  let abandonedPrev = 0;
  let lostValueCur = 0;
  const convertedSessionsCur = new Set<string>();
  let convertedPrev = 0;
  const abandonedList: AbandonedCart[] = [];

  for (const c of carts) {
    const updated = c.updated_at as string;
    const updatedMs = new Date(updated).getTime();
    const hasItems = (c.item_count ?? 0) > 0;
    const isConverted = c.state === 'converted';
    const isAbandoned = !isConverted && hasItems && nowMs - updatedMs > abandonThreshold;

    if (isConverted) {
      if (inCur(updated) && c.session_id) convertedSessionsCur.add(c.session_id);
      else if (inPrev(updated)) convertedPrev += 1;
    }
    if (isAbandoned) {
      if (inCur(updated)) {
        abandonedCur += 1;
        lostValueCur += c.value_cents ?? 0;
        abandonedList.push({
          sessionId: c.session_id,
          items: Array.isArray(c.items) ? c.items : [],
          valueCents: c.value_cents ?? 0,
          itemCount: c.item_count ?? 0,
          lastStep: c.last_step ?? null,
          updatedAt: updated,
        });
      } else if (inPrev(updated)) {
        abandonedPrev += 1;
      }
    }
  }
  abandonedList.sort((a, b) => b.valueCents - a.valueCents || +new Date(b.updatedAt) - +new Date(a.updatedAt));

  // --- orders: revenue + per-product purchases/revenue ---------------------
  const paidOrders = (paidOrdersR.data ?? []) as any[];
  let revenueCur = 0;
  let revenuePrev = 0;
  for (const o of paidOrders) {
    if (inCur(o.created_at)) revenueCur += o.amount_cents ?? 0;
    else if (inPrev(o.created_at)) revenuePrev += o.amount_cents ?? 0;
  }

  const orderItems = (orderItemsR.data ?? []) as any[];
  const purchasesBySlug = new Map<string, number>();
  const revenueBySlug = new Map<string, number>();
  for (const it of orderItems) {
    const createdAt = it.orders?.created_at ?? '';
    if (!inCur(createdAt)) continue;
    const slug = idToSlug.get(it.product_id);
    if (!slug) continue;
    purchasesBySlug.set(slug, (purchasesBySlug.get(slug) ?? 0) + (it.qty ?? 0));
    revenueBySlug.set(slug, (revenueBySlug.get(slug) ?? 0) + (it.qty ?? 0) * (it.unit_price_cents ?? 0));
  }

  // --- funnel --------------------------------------------------------------
  const purchasedCount = funnelSlug
    ? [...convertedSessionsCur].filter((sid) => cartHasSlug(carts, sid, funnelSlug)).length
    : convertedSessionsCur.size;

  const rawSteps = [
    { key: 'visited', label: 'Visitó el sitio', count: funnelSlug ? step.viewedProduct.size : visitorsCur || visitedSessions.size },
    { key: 'viewed', label: 'Vio una pieza', count: step.viewedProduct.size },
    { key: 'added', label: 'Agregó al carrito', count: step.addedToCart.size },
    { key: 'checkout', label: 'Inició checkout', count: step.checkoutStarted.size },
    { key: 'purchased', label: 'Compró', count: purchasedCount },
  ];
  const top = rawSteps[0].count || 1;
  const funnel: FunnelStep[] = rawSteps.map((s, i) => ({
    ...s,
    pctOfTop: Math.round((s.count / top) * 1000) / 10,
    pctOfPrev: i === 0 ? 100 : rawSteps[i - 1].count > 0 ? Math.round((s.count / rawSteps[i - 1].count) * 1000) / 10 : 0,
  }));

  // --- per-product table ---------------------------------------------------
  const productRows: ProductRow[] = products.map((p: any) => {
    const views = viewsByslug.get(p.slug) ?? 0;
    const purchases = purchasesBySlug.get(p.slug) ?? 0;
    return {
      slug: p.slug,
      name: p.name,
      image: bySlug.get(p.slug)?.image ?? null,
      views,
      addToCart: addByslug.get(p.slug) ?? 0,
      purchases,
      revenueCents: revenueBySlug.get(p.slug) ?? 0,
      convRate: views > 0 ? Math.round((purchases / views) * 1000) / 10 : 0,
    };
  });
  productRows.sort((a, b) => b.revenueCents - a.revenueCents || b.views - a.views);

  // --- sources + devices as ranked rows ------------------------------------
  const sources = rankRows(sourceCur, SOURCE_LABELS, visitorsCur);
  const devices = rankRows(deviceCur, DEVICE_LABELS, visitorsCur);

  // --- trend (visitors + revenue per day/bucket) ---------------------------
  const trend = buildTrend(range, from, now, sessions, paidOrders, inCur);

  const convCur = visitorsCur > 0 ? (convertedSessionsCur.size / visitorsCur) * 100 : 0;
  const convPrev = visitorsPrev > 0 ? (convertedPrev / visitorsPrev) * 100 : 0;

  const hasData = sessions.length > 0 || events.length > 0 || carts.length > 0;

  return {
    range,
    configured: true,
    hasData,
    visitors: { value: visitorsCur, prev: visitorsPrev, deltaPct: pctChange(visitorsCur, visitorsPrev) },
    pageviews: { value: pageviewsCur, prev: pageviewsPrev, deltaPct: pctChange(pageviewsCur, pageviewsPrev) },
    conversionRate: { value: Math.round(convCur * 10) / 10, prev: Math.round(convPrev * 10) / 10, deltaPct: pctChange(convCur, convPrev) },
    abandonedCarts: { value: abandonedCur, prev: abandonedPrev, deltaPct: pctChange(abandonedCur, abandonedPrev) },
    lostValueCents: lostValueCur,
    revenueCents: { value: revenueCur, prev: revenuePrev, deltaPct: pctChange(revenueCur, revenuePrev) },
    funnel,
    funnelSlug,
    products: productRows,
    abandoned: abandonedList.slice(0, 15),
    sources,
    devices,
    trend,
  };
}

function cartHasSlug(carts: any[], sessionId: string, slug: string): boolean {
  const c = carts.find((x) => x.session_id === sessionId);
  if (!c || !Array.isArray(c.items)) return false;
  return c.items.some((i: any) => i.slug === slug);
}

function rankRows(map: Map<string, number>, labels: Record<string, string>, total: number): SourceRow[] {
  return [...map.entries()]
    .map(([key, count]) => ({
      key,
      label: labels[key] ?? key.charAt(0).toUpperCase() + key.slice(1),
      count,
      pct: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

function buildTrend(
  range: Range,
  from: number,
  now: number,
  sessions: any[],
  paidOrders: any[],
  inCur: (iso: string) => boolean
): TrendPoint[] {
  // today → hourly-ish is overkill; show the single day. Others → daily buckets.
  const startDay = startOfDrDay(range === 'today' ? from : from);
  const buckets = new Map<string, { v: number; r: number }>();
  for (let t = startDay; t <= now; t += DAY) {
    buckets.set(new Date(t - DR_OFFSET_MS).toISOString().slice(0, 10), { v: 0, r: 0 });
  }
  const keyOf = (iso: string) => new Date(new Date(iso).getTime() - DR_OFFSET_MS).toISOString().slice(0, 10);
  for (const s of sessions) {
    if (!inCur(s.created_at)) continue;
    const k = keyOf(s.created_at);
    const b = buckets.get(k);
    if (b) b.v += 1;
  }
  for (const o of paidOrders) {
    if (!inCur(o.created_at)) continue;
    const k = keyOf(o.created_at);
    const b = buckets.get(k);
    if (b) b.r += o.amount_cents ?? 0;
  }
  return [...buckets.entries()].map(([day, b]) => ({ day, visitors: b.v, revenueCents: b.r }));
}

// ---------------------------------------------------------------------------
// Lean widgets for the main Dashboard (today). Cheap count-style queries.
// ---------------------------------------------------------------------------
export interface AnalyticsWidgets {
  configured: boolean;
  visitorsToday: number;
  conversionToday: number; // percent
  abandonedToday: number;
}

export async function adminAnalyticsWidgets(): Promise<AnalyticsWidgets> {
  const supabase = createSSRClient();
  const from = startOfDrDay(Date.now());
  const fromIso = new Date(from).toISOString();

  const sessionsP = supabase.from('analytics_sessions').select('id', { count: 'exact', head: true }).gte('created_at', fromIso);
  const cartsP = supabase
    .from('carts')
    .select('state,item_count,updated_at,converted_order_id')
    .gte('updated_at', fromIso)
    .limit(10_000);

  const [sessionsR, cartsR] = await Promise.all([sessionsP, cartsP]);
  if (sessionsR.error || cartsR.error) {
    return { configured: false, visitorsToday: 0, conversionToday: 0, abandonedToday: 0 };
  }

  const visitorsToday = sessionsR.count ?? 0;
  const carts = (cartsR.data ?? []) as any[];
  const nowMs = Date.now();
  const threshold = ABANDON_AFTER_MINUTES * 60_000;
  let converted = 0;
  let abandoned = 0;
  for (const c of carts) {
    if (c.state === 'converted') converted += 1;
    else if ((c.item_count ?? 0) > 0 && nowMs - new Date(c.updated_at).getTime() > threshold) abandoned += 1;
  }
  const conversionToday = visitorsToday > 0 ? Math.round((converted / visitorsToday) * 1000) / 10 : 0;
  return { configured: true, visitorsToday, conversionToday, abandonedToday: abandoned };
}
