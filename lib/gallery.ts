import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import type { ProductImage } from './types';

// Auto-detected product imagery. Scans public/products/<slug>/ and returns ONLY
// the files that actually exist, in order. Missing entries are skipped — no
// placeholder, no broken image, no gap.
//
// Extension-flexible: each logical image (model-1, garment-front, …) may be a
// .jpg, .jpeg or .png. If the same base exists in more than one extension, the
// first in EXT_PRIORITY wins so it is never duplicated.
//
// Server-only (uses fs). On Vercel these public files are traced into the route
// function via `outputFileTracingIncludes` in next.config.js so existsSync can
// see them at request time.

const MAX_MODEL_IMAGES = 10;
const EXT_PRIORITY = ['jpg', 'jpeg', 'png'] as const;
const GARMENT_BASES = [
  { base: 'garment-front', label: 'front' },
  { base: 'garment-side', label: 'side' },
  { base: 'garment-back', label: 'back' },
] as const;

/** First existing filename for `base` among the priority extensions, or null. */
function resolveExisting(dir: string, base: string): string | null {
  for (const ext of EXT_PRIORITY) {
    const file = `${base}.${ext}`;
    try {
      if (fs.existsSync(path.join(dir, file))) return file;
    } catch {
      /* unreadable entry — try the next extension */
    }
  }
  return null;
}

/** Model gallery: model-1 … model-10 (.jpg/.jpeg/.png), existing only, in order. */
export function getModelImages(slug: string, name: string): ProductImage[] {
  if (!/^[a-z0-9-]+$/.test(slug)) return [];
  const dir = path.join(process.cwd(), 'public', 'products', slug);
  const images: ProductImage[] = [];

  for (let i = 1; i <= MAX_MODEL_IMAGES; i++) {
    const file = resolveExisting(dir, `model-${i}`);
    if (file) {
      images.push({
        url: `/products/${slug}/${file}`,
        type: 'model',
        position: i,
        alt: `${name} — editorial look ${i}`,
      });
    }
  }
  return images;
}

/** 360 frames: garment-front/side/back (.jpg/.jpeg/.png), existing only, in order. */
export function getGarmentImages(slug: string, name: string): ProductImage[] {
  if (!/^[a-z0-9-]+$/.test(slug)) return [];
  const dir = path.join(process.cwd(), 'public', 'products', slug);
  const images: ProductImage[] = [];

  GARMENT_BASES.forEach(({ base, label }, i) => {
    const file = resolveExisting(dir, base);
    if (file) {
      images.push({
        url: `/products/${slug}/${file}`,
        type: 'garment_360',
        position: i + 1,
        alt: `${name} — ${label}`,
      });
    }
  });
  return images;
}
