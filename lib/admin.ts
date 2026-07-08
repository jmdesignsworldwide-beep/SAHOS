import 'server-only';
import { createSSRClient, getSessionUser } from '@/lib/supabase/ssr';

// Admin-side data access. Every function runs through the session-aware client
// (createSSRClient), so RLS enforces "authenticated only" on the DB — a missing
// or forged session simply returns nothing / is rejected by Postgres.

const ADMIN_SELECT =
  'id,slug,name,subtitle,description,color,factory_ref,price_cents,currency,active,position,' +
  'product_images(id,url,type,position,alt),product_sizes(id,size,stock)';

/** Throws if there is no valid session. Use at the top of every write action. */
export async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw new Error('No autorizado');
  return user;
}

export interface AdminImage {
  id: string;
  url: string;
  type: 'model' | 'garment_360' | 'detail';
  position: number;
  alt: string | null;
}

export interface AdminProduct {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  color: string | null;
  factory_ref: string | null;
  price_cents: number | null;
  currency: string;
  active: boolean;
  position: number;
  images: AdminImage[];
  sizes: { id: string; size: string; stock: number }[];
}

function normalize(row: any): AdminProduct {
  return {
    ...row,
    images: (row.product_images ?? []).sort((a: any, b: any) => a.position - b.position),
    sizes: (row.product_sizes ?? []).sort((a: any, b: any) => a.size.localeCompare(b.size)),
  };
}

/** All products (incl. inactive) for the portal list. */
export async function adminListProducts(): Promise<AdminProduct[]> {
  const supabase = createSSRClient();
  const { data, error } = await supabase.from('products').select(ADMIN_SELECT).order('position');
  if (error) throw new Error(error.message);
  return (data ?? []).map(normalize);
}

/** One product by id for the edit screen. */
export async function adminGetProduct(id: string): Promise<AdminProduct | null> {
  const supabase = createSSRClient();
  const { data, error } = await supabase.from('products').select(ADMIN_SELECT).eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? normalize(data) : null;
}

// ---------------------------------------------------------------------------
// Orders (Fase 2)
// ---------------------------------------------------------------------------
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'fulfilled' | 'refunded' | 'cancelled';
export type FulfillmentStatus = 'new' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';

export interface AdminOrderItem {
  id: string;
  size: string;
  qty: number;
  unit_price_cents: number;
  name: string;
  slug: string;
}

export interface AdminOrder {
  id: string;
  stripe_payment_intent: string | null;
  email: string | null;
  customer_name: string | null;
  status: PaymentStatus;
  fulfillment_status: FulfillmentStatus;
  amount_cents: number;
  currency: string;
  tracking_number: string | null;
  courier: string | null;
  shipping_json: any;
  created_at: string;
  shipped_at: string | null;
  items: AdminOrderItem[];
}

const ORDER_SELECT =
  'id,stripe_payment_intent,email,customer_name,status,fulfillment_status,amount_cents,currency,' +
  'tracking_number,courier,shipping_json,created_at,shipped_at,' +
  'order_items(id,size,qty,unit_price_cents,products(name,slug))';

function normalizeOrder(row: any): AdminOrder {
  return {
    ...row,
    items: (row.order_items ?? []).map((i: any) => ({
      id: i.id,
      size: i.size,
      qty: i.qty,
      unit_price_cents: i.unit_price_cents,
      name: i.products?.name ?? 'Pieza',
      slug: i.products?.slug ?? '',
    })),
  };
}

/** Orders for the list, newest first. Optional fulfillment filter + text search. */
export async function adminListOrders(opts: { status?: FulfillmentStatus; q?: string } = {}): Promise<AdminOrder[]> {
  const supabase = createSSRClient();
  let query = supabase.from('orders').select(ORDER_SELECT).order('created_at', { ascending: false }).limit(200);
  if (opts.status) query = query.eq('fulfillment_status', opts.status);
  if (opts.q) query = query.or(`email.ilike.%${opts.q}%,customer_name.ilike.%${opts.q}%`);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(normalizeOrder);
}

export async function adminGetOrder(id: string): Promise<AdminOrder | null> {
  const supabase = createSSRClient();
  const { data, error } = await supabase.from('orders').select(ORDER_SELECT).eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? normalizeOrder(data) : null;
}

/** Counts by fulfillment status for badges/alerts. */
export async function adminOrderCounts(): Promise<Record<string, number>> {
  const supabase = createSSRClient();
  const { data, error } = await supabase.from('orders').select('fulfillment_status');
  if (error) throw new Error(error.message);
  const counts: Record<string, number> = {};
  for (const row of data ?? []) counts[(row as any).fulfillment_status] = (counts[(row as any).fulfillment_status] ?? 0) + 1;
  return counts;
}

// ---------------------------------------------------------------------------
// Contact messages (customer service)
// ---------------------------------------------------------------------------
export type MessageStatus = 'new' | 'read' | 'replied';

export interface AdminMessage {
  id: string;
  name: string | null;
  email: string;
  message: string;
  status: MessageStatus;
  created_at: string;
}

/** All contact messages, newest first. */
export async function adminListMessages(): Promise<AdminMessage[]> {
  const supabase = createSSRClient();
  const { data, error } = await supabase
    .from('contact_messages')
    .select('id,name,email,message,status,created_at')
    .order('created_at', { ascending: false })
    .limit(300);
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminMessage[];
}

/** Number of unread ('new') messages, for the nav badge. */
export async function adminUnreadMessageCount(): Promise<number> {
  const supabase = createSSRClient();
  const { count, error } = await supabase
    .from('contact_messages')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'new');
  if (error) return 0;
  return count ?? 0;
}
