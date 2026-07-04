import 'server-only';
import { createSSRClient } from '@/lib/supabase/ssr';
import type { AdminOrder } from '@/lib/admin';

// Server-side metrics + inventory reads for the portal. All queries run through
// the session client, so RLS keeps every row admin-only. Designed to degrade to
// clean zeros/empty states before any sale exists (Stripe not yet configured).

// --- date helpers (Dominican Republic, UTC-4, no DST) ----------------------
const DR_OFFSET_MS = 4 * 60 * 60 * 1000;
function drNow(): Date {
  return new Date(Date.now() - DR_OFFSET_MS);
}
function toUtcIso(drDate: Date): string {
  return new Date(drDate.getTime() + DR_OFFSET_MS).toISOString();
}
function startOfDayDR(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function startOfMonthDR(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export interface LowStock {
  name: string;
  slug: string;
  size: string;
  stock: number;
  soldOut: boolean;
}
export interface TopPiece {
  name: string;
  slug: string;
  units: number;
  image: string | null;
}
export interface DailyPoint {
  day: string; // YYYY-MM-DD (DR)
  cents: number;
}

export interface DashboardData {
  newOrders: number;
  pendingShipOldCount: number;
  lowStock: LowStock[];
  salesMonthCents: number;
  salesPrevMonthCents: number;
  salesTodayCents: number;
  ordersMonth: number;
  unitsSoldMonth: number;
  avgTicketCents: number;
  daily: DailyPoint[];
  topPieces: TopPiece[];
  totalInventoryUnits: number;
  recentOrders: Pick<AdminOrder, 'id' | 'stripe_payment_intent' | 'customer_name' | 'email' | 'amount_cents' | 'currency' | 'fulfillment_status' | 'created_at'>[];
  hasSales: boolean;
}

export async function adminDashboard(): Promise<DashboardData> {
  const supabase = createSSRClient();

  const now = drNow();
  const monthStartIso = toUtcIso(startOfMonthDR(now));
  const todayStartIso = toUtcIso(startOfDayDR(now));
  const prevMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const prevMonthStartIso = toUtcIso(prevMonthStart);
  const window30 = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
  const window30Iso = toUtcIso(startOfDayDR(window30));

  // product name/image/slug map (for thumbnails + ranking labels)
  const productsP = supabase
    .from('products')
    .select('id,slug,name,position,product_images(url,type,position)')
    .order('position');

  const newOrdersP = supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('fulfillment_status', 'new');

  // paid orders since the start of last month (covers month, prev-month, today, 30d)
  const paidOrdersP = supabase
    .from('orders')
    .select('amount_cents,created_at')
    .eq('status', 'paid')
    .gte('created_at', prevMonthStartIso);

  const sizesP = supabase.from('product_sizes').select('size,stock,mode,low_stock_threshold,product_id');

  const soldItemsP = supabase
    .from('order_items')
    .select('qty,product_id,orders!inner(status,created_at)')
    .eq('orders.status', 'paid');

  const recentP = supabase
    .from('orders')
    .select('id,stripe_payment_intent,customer_name,email,amount_cents,currency,fulfillment_status,created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  const [productsR, newOrdersR, paidOrdersR, sizesR, soldItemsR, recentR] = await Promise.all([
    productsP,
    newOrdersP,
    paidOrdersP,
    sizesP,
    soldItemsP,
    recentP,
  ]);

  const products = productsR.data ?? [];
  const pmeta = new Map<string, { name: string; slug: string; image: string | null }>();
  for (const p of products as any[]) {
    const img = (p.product_images ?? [])
      .filter((i: any) => i.type === 'model')
      .sort((a: any, b: any) => a.position - b.position)[0]?.url ?? null;
    pmeta.set(p.id, { name: p.name, slug: p.slug, image: img });
  }

  // Sales aggregation
  const paid = (paidOrdersR.data ?? []) as { amount_cents: number; created_at: string }[];
  let salesMonthCents = 0;
  let salesPrevMonthCents = 0;
  let salesTodayCents = 0;
  let ordersMonth = 0;
  const dayBuckets = new Map<string, number>();
  for (const o of paid) {
    const cents = o.amount_cents ?? 0;
    if (o.created_at >= monthStartIso) {
      salesMonthCents += cents;
      ordersMonth += 1;
    } else if (o.created_at >= prevMonthStartIso) {
      salesPrevMonthCents += cents;
    }
    if (o.created_at >= todayStartIso) salesTodayCents += cents;
    if (o.created_at >= window30Iso) {
      const dr = new Date(new Date(o.created_at).getTime() - DR_OFFSET_MS);
      const key = dr.toISOString().slice(0, 10);
      dayBuckets.set(key, (dayBuckets.get(key) ?? 0) + cents);
    }
  }

  // 30-day series (fill gaps with 0)
  const daily: DailyPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = startOfDayDR(d).toISOString().slice(0, 10);
    daily.push({ day: key, cents: dayBuckets.get(key) ?? 0 });
  }

  // Units sold this month + all-time ranking
  const soldItems = (soldItemsR.data ?? []) as any[];
  let unitsSoldMonth = 0;
  const unitsByProduct = new Map<string, number>();
  for (const it of soldItems) {
    const createdAt = it.orders?.created_at ?? '';
    if (createdAt >= monthStartIso) unitsSoldMonth += it.qty ?? 0;
    unitsByProduct.set(it.product_id, (unitsByProduct.get(it.product_id) ?? 0) + (it.qty ?? 0));
  }

  // Top pieces: real ranking if any sales, else the catalog with 0 (never blank)
  let topPieces: TopPiece[];
  if (unitsByProduct.size > 0) {
    topPieces = Array.from(unitsByProduct.entries())
      .map(([pid, units]) => {
        const m = pmeta.get(pid);
        return { name: m?.name ?? 'Pieza', slug: m?.slug ?? '', units, image: m?.image ?? null };
      })
      .sort((a, b) => b.units - a.units)
      .slice(0, 5);
  } else {
    topPieces = (products as any[]).slice(0, 5).map((p) => {
      const m = pmeta.get(p.id)!;
      return { name: m.name, slug: m.slug, units: 0, image: m.image };
    });
  }

  // Inventory: total units + low-stock alerts (limited mode only)
  const sizes = (sizesR.data ?? []) as any[];
  let totalInventoryUnits = 0;
  const lowStock: LowStock[] = [];
  for (const s of sizes) {
    totalInventoryUnits += s.stock ?? 0;
    if (s.mode === 'limited' && (s.stock ?? 0) <= (s.low_stock_threshold ?? 3)) {
      const m = pmeta.get(s.product_id);
      lowStock.push({
        name: m?.name ?? 'Pieza',
        slug: m?.slug ?? '',
        size: s.size,
        stock: s.stock ?? 0,
        soldOut: (s.stock ?? 0) === 0,
      });
    }
  }
  lowStock.sort((a, b) => a.stock - b.stock);

  const avgTicketCents = ordersMonth > 0 ? Math.round(salesMonthCents / ordersMonth) : 0;

  return {
    newOrders: newOrdersR.count ?? 0,
    pendingShipOldCount: 0,
    lowStock,
    salesMonthCents,
    salesPrevMonthCents,
    salesTodayCents,
    ordersMonth,
    unitsSoldMonth,
    avgTicketCents,
    daily,
    topPieces,
    totalInventoryUnits,
    recentOrders: (recentR.data ?? []) as any[],
    hasSales: paid.length > 0,
  };
}

// --------------------------------------------------------------------------
// Inventory
// --------------------------------------------------------------------------
export interface InventorySize {
  size: string;
  stock: number;
  mode: 'limited' | 'on_demand';
  lowThreshold: number;
}
export interface InventoryPiece {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  mode: 'limited' | 'on_demand';
  sizes: InventorySize[];
  total: number;
}

const SIZE_ORDER = ['XS', 'S', 'M', 'L'];

export async function adminInventory(): Promise<{ pieces: InventoryPiece[]; grandTotal: number }> {
  const supabase = createSSRClient();
  const { data, error } = await supabase
    .from('products')
    .select('id,name,slug,position,product_images(url,type,position),product_sizes(size,stock,mode,low_stock_threshold)')
    .order('position');
  if (error) throw new Error(error.message);

  let grandTotal = 0;
  const pieces: InventoryPiece[] = (data ?? []).map((p: any) => {
    const image =
      (p.product_images ?? [])
        .filter((i: any) => i.type === 'model')
        .sort((a: any, b: any) => a.position - b.position)[0]?.url ?? null;
    const sizes: InventorySize[] = (p.product_sizes ?? [])
      .map((s: any) => ({
        size: s.size,
        stock: s.stock ?? 0,
        mode: (s.mode ?? 'limited') as 'limited' | 'on_demand',
        lowThreshold: s.low_stock_threshold ?? 3,
      }))
      .sort((a: InventorySize, b: InventorySize) => SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size));
    const total = sizes.reduce((n, s) => n + s.stock, 0);
    grandTotal += total;
    const mode = sizes[0]?.mode ?? 'limited';
    return { id: p.id, name: p.name, slug: p.slug, image, mode, sizes, total };
  });

  return { pieces, grandTotal };
}
