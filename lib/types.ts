// Domain types — mirror the Supabase schema (spec §9) so the static catalog
// and the DB-backed catalog share one shape.

export type Size = 'XS' | 'S' | 'M' | 'L';

export type ProductImageType = 'model' | 'garment_360' | 'detail';

/** Inventory mode per size: 'limited' tracks/decrements stock; 'on_demand'
 *  is always available and never sells out. */
export type StockMode = 'limited' | 'on_demand';

export interface ProductImage {
  url: string;
  type: ProductImageType;
  position: number;
  alt: string;
}

export interface ProductSizeStock {
  size: Size;
  stock: number;
  mode?: StockMode;
}

/** True when a size can be added to the bag: on-demand always, limited only
 *  while stock remains. Shared by the storefront and the checkout validation. */
export function isSizeAvailable(s: Pick<ProductSizeStock, 'stock' | 'mode'>): boolean {
  return s.mode === 'on_demand' || s.stock > 0;
}

export interface Product {
  slug: string;
  name: string;
  /** e.g. "Satin Cross Back Dress" */
  subtitle: string;
  description: string;
  /** bullet spec lines for the Details accordion */
  details: string[];
  /** material composition shown under Specifications (e.g. "poly cloth with 5%
   *  spandex"). Optional — falls back to the collection's default when unset. */
  composition?: string;
  color: string;
  factoryRef: string;
  /** price in cents; null until Marien sets the real price (TODO_PRECIO) */
  priceCents: number | null;
  currency: string;
  position: number;
  images: ProductImage[];
  sizes: ProductSizeStock[];
}

export interface BagItem {
  slug: string;
  name: string;
  subtitle: string;
  size: Size;
  qty: number;
  priceCents: number | null;
  image: string;
  color: string;
}
