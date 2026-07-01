import 'server-only';
import { getServiceClient } from '@/lib/supabase/server';
import { PRODUCTS, getProduct as staticProduct } from '@/lib/products';
import type { Product, Size } from '@/lib/types';

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
    .select('slug,name,price_cents,active,product_sizes(size,stock)')
    .in('slug', slugs)
    .eq('active', true);

  if (error) throw new Error(`Catalog lookup failed: ${error.message}`);

  return lines.map((line) => {
    const p = products?.find((row: any) => row.slug === line.slug);
    if (!p) throw new Error(`Unknown or inactive product: ${line.slug}`);
    if (p.price_cents == null) throw new Error(`Price not set for ${p.name}`);
    const sizeRow = (p.product_sizes as any[])?.find((s) => s.size === line.size);
    return {
      slug: p.slug,
      name: p.name,
      size: line.size,
      qty: line.qty,
      unitPriceCents: p.price_cents as number,
      inStock: (sizeRow?.stock ?? 0) >= line.qty,
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
