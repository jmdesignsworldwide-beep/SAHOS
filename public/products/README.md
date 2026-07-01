# Product & campaign imagery

Drop the photographer's **high-resolution originals** into these folders before
launch. The catalog currently references low-res crops from the PDF only for
layout; anything missing renders as a neutral SAHOS placeholder (never a broken
image). File names are the contract the code expects — keep them exact.

## Per piece — `/products/<slug>/`

`<slug>` is one of: `lola`, `kateryn`, `amber`, `daisy`, `gianna`.

| File | Used for |
|------|----------|
| `model-1.jpg` | Product gallery (hero) + collection card |
| `model-2.jpg` | Product gallery |
| `model-3.jpg` | Product gallery |
| `garment-front.jpg` | 360° viewer — front |
| `garment-side.jpg` | 360° viewer — side |
| `garment-back.jpg` | 360° viewer — back |

The 360° viewer is frame-count agnostic. To upgrade to a real turntable, add
`garment-01.jpg … garment-36.jpg` and pass them to `<Product360>` — no code
change needed (see `lib/products.ts`).

## Campaign & house — `/products/campaign/`, `/products/house/`

| File | Used for |
|------|----------|
| `campaign/hero.jpg` | Home hero (full-bleed) |
| `campaign/campaign-1.jpg` | Home campaign section 1 |
| `campaign/campaign-2.jpg` | Home campaign section 2 |
| `house/packaging.jpg` | "The House" section |

Model photography → hero columns. Garment-on-clean-background → 360° viewer.
Everything is served through `next/image` (AVIF/WebP, responsive, lazy).
