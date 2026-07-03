import 'server-only';
import { getServiceClient } from '@/lib/supabase/server';
import { getPublicClient } from '@/lib/supabase/public';
import { PRODUCTS, getProduct as staticProduct } from '@/lib/products';
import type { Product, ProductImage, Size } from '@/lib/types';

// Columns pulled for a full public product view.
const PRODUCT_SELECT =
  'slug,name,subtitle,description,color,factory_ref,price_cents,currency,position,active,' +
  'product_images(url,type,position,alt),product_sizes(size,stock,mode)';

// Map a Supabase row to the shared Product shape. `details` (the Details
// accordion bullets) are not portal-managed, so they come from the static
// catalog by slug — empty for pieces created in the portal.
function mapRow(row: any): Product {
  const images: ProductImage[] = (row.product_images ?? [])
    .map((i: any) => ({
      url: i.url as string,
      type: i.type as ProductImage['type'],
      position: i.position ?? 0,
      alt: (i.alt as string) ?? row.name,
    }))
    .sort((a: ProductImage, b: ProductImage) => a.position - b.position);

  return {
    slug: row.slug,
    name: row.name,
    subtitle: row.subtitle ?? '',
    description: row.description ?? '',
    details: staticProduct(row.slug)?.details ?? [],
    color: row.color ?? '',
    factoryRef: row.factory_ref ?? '',
    priceCents: row.price_cents ?? null,
    currency: row.currency ?? 'usd',
    position: row.position ?? 0,
    images,
    sizes: (row.product_sizes ?? []).map((s: any) => ({
      size: s.size as Size,
      stock: s.stock ?? 0,
      mode: (s.mode ?? 'limited') as Product['sizes'][number]['mode'],
    })),
  };
}

/**
 * All active products for the public store, from Supabase (source of truth).
 * Falls back to the static catalog if Supabase is not configured, errors, or is
 * empty — so the store always renders.
 */
export async function fetchAllProducts(): Promise<Product[]> {
  const supabase = getPublicClient();
  if (!supabase) return PRODUCTS;
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('active', true)
    .order('position');
  if (error || !data || data.length === 0) return PRODUCTS;
  return data.map(mapRow).sort((a, b) => a.position - b.position);
}

/** One active product by slug (public store). Null if not found in the DB. */
export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const supabase = getPublicClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle();
  if (error || !data) return null;
  return mapRow(data);
}

// Authoritative, server-side catalog access. Prefers live Supabase data when
// configured; otherwise falls back to the static catalog so the site works
// before the DB is wired. Everything price/stock-sensitive in checkout goes
// through here, never through client-supplied values (spec §8.3).

interface PricedLine {
  slug: string;
  size: Size;
  qty: number;
}

export interface ResolvedLine {
  slug: string;
  name: string;
  size: Size;
  qty: number;
  unitPriceCents: number;
  inStock: boolean;
}

/**
 * Re-price and stock-check a bag against the source of truth. Returns resolved
 * lines with server-authoritative unit prices; throws if a product/price is
 * missing or a size is out of stock.
 */
export async function resolveBag(lines: PricedLine[]): Promise<ResolvedLine[]> {
  const supabase = await getServiceClient();

  if (!supabase) {
    // static fallback
    return lines.map((line) => {
      const p = staticProduct(line.slug);
      if (!p) throw new Error(`Unknown product: ${line.slug}`);
      if (p.priceCents == null) throw new Error(`Price not set for ${p.name} (TODO_PRECIO)`);
      const sizeRow = p.sizes.find((s) => s.size === line.size);
      return {
        slug: p.slug,
        name: p.name,
        size: line.size,
        qty: line.qty,
        unitPriceCents: p.priceCents,
        inStock: (sizeRow?.stock ?? 0) >= line.qty,
      };
    });
  }

  const slugs = Array.from(new Set(lines.map((l) => l.slug)));
  const { data: products, error } = await supabase
    .from('products')
    .select('slug,name,price_cents,active,product_sizes(size,stock,mode)')
    .in('slug', slugs)
    .eq('active', true);

  if (error) throw new Error(`Catalog lookup failed: ${error.message}`);

  return lines.map((line) => {
    const p = products?.find((row: any) => row.slug === line.slug);
    if (!p) throw new Error(`Unknown or inactive product: ${line.slug}`);
    if (p.price_cents == null) throw new Error(`Price not set for ${p.name}`);
    const sizeRow = (p.product_sizes as any[])?.find((s) => s.size === line.size);
    // On-demand sizes are always fulfillable; limited sizes need stock.
    const inStock = sizeRow?.mode === 'on_demand' || (sizeRow?.stock ?? 0) >= line.qty;
    return {
      slug: p.slug,
      name: p.name,
      size: line.size,
      qty: line.qty,
      unitPriceCents: p.price_cents as number,
      inStock,
    };
  });
}

export async function listProducts(): Promise<Product[]> {
  const supabase = await getServiceClient();
  if (!supabase) return PRODUCTS;
  // (Live mapping intentionally minimal here; static catalog is the render
  // source until the DB is seeded and image rows are populated.)
  return PRODUCTS;
}
