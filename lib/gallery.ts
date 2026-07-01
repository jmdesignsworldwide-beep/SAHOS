import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import type { ProductImage } from './types';

// Auto-detected model gallery. Scans public/products/<slug>/ for model-1.jpg …
// model-10.jpg and returns ONLY the files that actually exist, in numeric
// order. Missing numbers are simply skipped — no placeholder, no broken image,
// no gap. model-1.jpg stays the hero (first in the list).
//
// Server-only (uses fs). On Vercel these public files are pulled into the route
// function via `outputFileTracingIncludes` in next.config.js so existsSync can
// see them at request time.

const MAX_MODEL_IMAGES = 10;

export function getModelImages(slug: string, name: string): ProductImage[] {
  // guard against path traversal — slugs are lowercase/dash only
  if (!/^[a-z0-9-]+$/.test(slug)) return [];

  const dir = path.join(process.cwd(), 'public', 'products', slug);
  const images: ProductImage[] = [];

  for (let i = 1; i <= MAX_MODEL_IMAGES; i++) {
    const file = `model-${i}.jpg`;
    try {
      if (fs.existsSync(path.join(dir, file))) {
        images.push({
          url: `/products/${slug}/${file}`,
          type: 'model',
          position: i,
          alt: `${name} — editorial look ${i}`,
        });
      }
    } catch {
      /* unreadable entry — skip it */
    }
  }

  return images;
}
