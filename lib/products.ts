import type { Product, Size } from './types';

// ---------------------------------------------------------------------------
// The Marilyn Collection — 5 pieces. Data lifted verbatim from the official
// SAHOS catalog (spec §5). This static source lets the whole site render and
// deploy before Supabase is wired; once the DB is seeded (supabase/seed.sql),
// `lib/catalog.ts` transparently prefers live data and falls back to this.
//
// Prices are `null` (TODO_PRECIO) — Marien must set real prices before launch.
// Image paths follow the agreed folder structure: low-res catalog crops now,
// swap for the photographer's high-res originals before launch (spec §7).
// ---------------------------------------------------------------------------

const ALL_SIZES: Size[] = ['XS', 'S', 'M', 'L'];

/** Placeholder stock so size selection works pre-Supabase. */
const seedStock = () => ALL_SIZES.map((size) => ({ size, stock: 5 }));

/** Standard model-first gallery + garment 360 frames for a piece. */
function galleryFor(slug: string, name: string) {
  return [
    { url: `/products/${slug}/model-1.jpg`, type: 'model' as const, position: 1, alt: `${name} — editorial look 1` },
    { url: `/products/${slug}/model-2.jpg`, type: 'model' as const, position: 2, alt: `${name} — editorial look 2` },
    { url: `/products/${slug}/model-3.jpg`, type: 'model' as const, position: 3, alt: `${name} — editorial look 3` },
    { url: `/products/${slug}/garment-front.jpg`, type: 'garment_360' as const, position: 1, alt: `${name} — front` },
    { url: `/products/${slug}/garment-side.jpg`, type: 'garment_360' as const, position: 2, alt: `${name} — side` },
    { url: `/products/${slug}/garment-back.jpg`, type: 'garment_360' as const, position: 3, alt: `${name} — back` },
  ];
}

export const PRODUCTS: Product[] = [
  {
    slug: 'lola',
    name: 'Lola',
    subtitle: 'Satin Cross Back Dress',
    description:
      'A satin mini with a crossed open back and a clean, low-cut front. It falls in one uninterrupted line — a silk-like surface that catches the light and moves with you.',
    details: [
      'Cross back design',
      'Mini dress',
      'Low cut front',
      'Straight flow',
      'Poly cloth with 5% spandex',
    ],
    composition: 'poly cloth with 5% spandex',
    color: 'Gold',
    factoryRef: 'TD25091007',
    priceCents: null,
    currency: 'usd',
    position: 1,
    images: galleryFor('lola', 'Lola'),
    sizes: seedStock(),
  },
  {
    slug: 'kateryn',
    name: 'Kathyrn',
    subtitle: 'Flowy Two Piece Set',
    description:
      'A flowing two-piece set — a V-neck collared top with long sleeves over a thick-waistband, straight-flow trouser. Quiet volume, made to move.',
    details: [
      'Two piece flowy set (top + bottom)',
      'Long flowy sleeves',
      'Collar with "V" neck',
      'Thick waist band',
      'Straight flow pants',
    ],
    composition: 'poly cloth with 5% spandex',
    color: 'Yellow',
    factoryRef: 'TD25091008',
    priceCents: null,
    currency: 'usd',
    position: 2,
    images: galleryFor('kateryn', 'Kathyrn'),
    sizes: seedStock(),
  },
  {
    slug: 'amber',
    name: 'Amber',
    subtitle: 'Wine Corset Dress',
    description:
      'A wine corset mini with a low V front, adjustable back ties and straps, and a hidden side zip. Structured where it counts, effortless everywhere else.',
    details: [
      'Dress with PU leather corset',
      'Wine color',
      'Mini dress',
      'Low cut "V" shape',
      'Adjustable back ties',
      'Adjustable straps',
      'Hidden side zipper',
    ],
    composition: 'PU leather',
    color: 'Wine',
    factoryRef: 'TD25091006',
    priceCents: null,
    currency: 'usd',
    position: 3,
    images: galleryFor('amber', 'Amber'),
    sizes: seedStock(),
  },
  {
    slug: 'daisy',
    name: 'Daisy',
    subtitle: 'Satin White T-Shirt Dress',
    description:
      'A satin t-shirt silhouette in pure white — collared and button-up, long sleeves, a stretch waist and an invisible side zip. The everyday piece, elevated.',
    details: [
      'White t-shirt silhouette',
      'Stretchy waist (spandex-like)',
      'Invisible side zipper',
      'Long sleeve',
      'Mini dress',
      'Collar with button-up',
    ],
    composition: 'poly cloth with 5% spandex',
    color: 'White',
    factoryRef: 'TD25091010',
    priceCents: null,
    currency: 'usd',
    position: 4,
    images: galleryFor('daisy', 'Daisy'),
    sizes: seedStock(),
  },
  {
    slug: 'gianna',
    name: 'Gianna',
    subtitle: 'Satin Beige Hardware Dress',
    description:
      'A beige satin mini with an adjustable halter neck and custom "S" zipper hardware down the back. Square hardware frames the V neck; a hook snatches the frame close.',
    details: [
      'Mini dress',
      'Halter with adjustable neck',
      'Custom "S" zipper hardware in back',
      'Square hardware holding the "V" neck',
      'Bra strap-like hook to snatch the frame',
    ],
    composition: 'poly cloth with 5% spandex',
    color: 'Beige',
    factoryRef: 'TD25091009',
    priceCents: null,
    currency: 'usd',
    position: 5,
    images: galleryFor('gianna', 'Gianna'),
    sizes: seedStock(),
  },
];

export function getProduct(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function getAllSlugs(): string[] {
  return PRODUCTS.map((p) => p.slug);
}

/** Model (hero) images for a product, ordered. */
export function modelImages(p: Product) {
  return p.images.filter((i) => i.type === 'model').sort((a, b) => a.position - b.position);
}

/** Garment-only frames for the 360 viewer, ordered. */
export function garmentImages(p: Product) {
  return p.images.filter((i) => i.type === 'garment_360').sort((a, b) => a.position - b.position);
}
