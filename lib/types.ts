// Domain types — mirror the Supabase schema (spec §9) so the static catalog
// and the DB-backed catalog share one shape.

export type Size = 'XS' | 'S' | 'M' | 'L';

export type ProductImageType = 'model' | 'garment_360' | 'detail';

export interface ProductImage {
  url: string;
  type: ProductImageType;
  position: number;
  alt: string;
}

export interface ProductSizeStock {
  size: Size;
  stock: number;
}

export interface Product {
  slug: string;
  name: string;
  /** e.g. "Satin Cross Back Dress" */
  subtitle: string;
  description: string;
  /** bullet spec lines for the Details accordion */
  details: string[];
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
