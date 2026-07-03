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
