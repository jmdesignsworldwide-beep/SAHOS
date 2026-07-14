import 'server-only';
import { createSSRClient } from '@/lib/supabase/ssr';

// Admin-side analytics aggregation. Reads page_visits through the session-aware
// client (createSSRClient) so RLS enforces "authenticated admin only" — a
// missing/forged session returns nothing. Never uses service_role, so a bug
// here can't bypass RLS. Aggregation is done in JS (boutique scale); swap for a
// SQL rollup if volume ever grows past tens of thousands of rows.

export type Range = '7d' | '30d' | 'all';

export interface CountryCount {
  /** ISO 3166-1 alpha-2 (e.g. 'US'); '??' when geo was unavailable. */
  code: string;
  name: string;
  count: number;
}

export interface LocationRow {
  code: string;
  country: string;
  region: string | null;
  city: string | null;
  count: number;
}

export interface DayCount {
  /** bucket start, ISO date 'YYYY-MM-DD' */
  day: string;
  count: number;
}

export interface AnalyticsData {
  range: Range;
  totalVisits: number;
  uniqueCountries: number;
  topCountry: CountryCount | null;
  topRegion: { label: string; count: number } | null;
  byCountry: CountryCount[];
  topLocations: LocationRow[];
  daily: DayCount[];
  /** true when the time buckets are weeks (long 'all' spans), else days */
  weekly: boolean;
  configured: boolean;
}

const DAY = 86_400_000;

let regionNames: Intl.DisplayNames | null = null;
try {
  regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
} catch {
  regionNames = null;
}

/** Human country name from an alpha-2 code, with graceful fallbacks. */
export function countryName(code: string | null): string {
  if (!code) return 'Unknown';
  const up = code.toUpperCase();
  if (up.length !== 2) return up;
  try {
    return regionNames?.of(up) ?? up;
  } catch {
    return up;
  }
}

function isoDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function cutoff(range: Range): number | null {
  const now = Date.now();
  if (range === '7d') return now - 7 * DAY;
  if (range === '30d') return now - 30 * DAY;
  return null; // 'all'
}

const EMPTY = (range: Range, configured: boolean): AnalyticsData => ({
  range,
  totalVisits: 0,
  uniqueCountries: 0,
  topCountry: null,
  topRegion: null,
  byCountry: [],
  topLocations: [],
  daily: [],
  weekly: false,
  configured,
});

export async function adminAnalytics(range: Range = '30d'): Promise<AnalyticsData> {
  const supabase = createSSRClient();
  let query = supabase
    .from('page_visits')
    .select('country,region,city,created_at')
    .order('created_at', { ascending: true })
    .limit(100_000);

  const from = cutoff(range);
  if (from != null) query = query.gte('created_at', new Date(from).toISOString());

  const { data, error } = await query;
  if (error) {
    // Table not created yet, or no access → present an empty, safe dashboard.
    return EMPTY(range, false);
  }

  const rows = data ?? [];
  if (rows.length === 0) return EMPTY(range, true);

  // --- Aggregate by country ------------------------------------------------
  const countryMap = new Map<string, number>();
  const regionMap = new Map<string, { label: string; count: number }>();
  const locMap = new Map<string, LocationRow>();

  let earliest = Date.now();
  for (const r of rows) {
    const code = (r.country || '??').toUpperCase();
    countryMap.set(code, (countryMap.get(code) ?? 0) + 1);

    if (r.region) {
      const key = `${code}|${r.region}`;
      const label = `${r.region}, ${countryName(code)}`;
      const cur = regionMap.get(key) ?? { label, count: 0 };
      cur.count += 1;
      regionMap.set(key, cur);
    }

    const lkey = `${code}|${r.region ?? ''}|${r.city ?? ''}`;
    const loc =
      locMap.get(lkey) ??
      ({ code, country: countryName(code), region: r.region ?? null, city: r.city ?? null, count: 0 } as LocationRow);
    loc.count += 1;
    locMap.set(lkey, loc);

    const t = new Date(r.created_at as string).getTime();
    if (t < earliest) earliest = t;
  }

  const byCountry: CountryCount[] = [...countryMap.entries()]
    .map(([code, count]) => ({ code, name: countryName(code), count }))
    .sort((a, b) => b.count - a.count);

  const topLocations = [...locMap.values()].sort((a, b) => b.count - a.count).slice(0, 12);

  const topRegionEntry = [...regionMap.values()].sort((a, b) => b.count - a.count)[0] ?? null;

  // --- Time series ---------------------------------------------------------
  const now = Date.now();
  const start = from ?? earliest;
  const spanDays = Math.max(1, Math.ceil((now - start) / DAY));
  const weekly = spanDays > 60;
  const bucketMs = weekly ? 7 * DAY : DAY;

  // Anchor buckets to day starts so labels are clean.
  const startDay = new Date(isoDay(start) + 'T00:00:00Z').getTime();
  const buckets = new Map<string, number>();
  for (let t = startDay; t <= now; t += bucketMs) buckets.set(isoDay(t), 0);
  for (const r of rows) {
    const t = new Date(r.created_at as string).getTime();
    const idx = Math.floor((t - startDay) / bucketMs);
    const bucketStart = startDay + idx * bucketMs;
    const key = isoDay(bucketStart);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  const daily: DayCount[] = [...buckets.entries()].map(([day, count]) => ({ day, count }));

  return {
    range,
    totalVisits: rows.length,
    uniqueCountries: [...countryMap.keys()].filter((c) => c !== '??').length,
    topCountry: byCountry.find((c) => c.code !== '??') ?? byCountry[0] ?? null,
    topRegion: topRegionEntry,
    byCountry,
    topLocations,
    daily,
    weekly,
    configured: true,
  };
}
