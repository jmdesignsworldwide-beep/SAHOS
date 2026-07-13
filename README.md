# SAHOS — The Marilyn Collection

Premium e-commerce experience for SAHOS. Radical restraint (pure white, discreet
type) with a heavy, orchestrated motion engine (smooth scroll, scrubbed
timelines, cinematic transitions). Built to run on Vercel.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** — design tokens in `tailwind.config.ts`
- **GSAP + ScrollTrigger** — scroll-orchestrated timelines
- **Lenis** — smooth scroll with inertia (the "motionsite" feel)
- **Framer Motion** — page transitions + micro-interactions
- **next/image** — image optimization
- **Supabase** — catalog / orders / inventory (optional until configured)
- **Stripe** — checkout (optional until configured)

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in when you have Supabase/Stripe keys
npm run dev
```

The site runs fully **without** Supabase or Stripe keys: the catalog renders
from the static source in `lib/products.ts`, images fall back to neutral SAHOS
placeholders, and checkout/newsletter degrade gracefully. Wire the services when
ready — no code changes required, just env vars.

## Architecture

### Motion (the heart)
- `components/providers/SmoothScrollProvider.tsx` — Lenis, synced to GSAP ticker + ScrollTrigger.
- `hooks/useReveal.ts` — reusable reveals: fade-up, clip-reveal, line masks, parallax.
- `components/motion/SplitReveal.tsx` — split-letter hero reveal (SplitType).
- `components/motion/MagneticCursor.tsx` — dot + trailing ring, grows over interactive elements.
- `components/ui/MagneticButton.tsx` — magnetic hover attraction.
- `components/providers/PageTransition.tsx` + `components/motion/Intro.tsx` — route curtain + first-visit intro.

All motion respects `prefers-reduced-motion` and runs on `transform`/`opacity`.

### Pages
- `/` — intro · hero · manifesto (word scrub) · collection · campaign (scrub) · The House · footer.
- `/collection` — clean grid of the five pieces.
- `/product/[slug]` — LV/Gucci layout: model gallery (hero) + sticky buy panel + secondary 360° viewer + "you may also like".

### Data & backend
- `lib/products.ts` — static catalog (the five pieces, from the official catalog).
- `lib/catalog.ts` — server-side, price-authoritative catalog access (Supabase → static fallback).
- `supabase/schema.sql` — schema with **RLS enabled + forced** on every table; `supabase/seed.sql` seeds the collection.
- `app/api/checkout` — re-prices the bag **server-side** against the DB, then creates a Stripe Checkout Session (Apple/Google Pay included).
- `app/api/webhooks/stripe` — **signature-verified**; order state changes happen only here.
- `app/api/newsletter` — validated + rate-limited sign-up.

## Security (spec §8)

- Secrets (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) are **server-only** — never `NEXT_PUBLIC_`, enforced by `server-only` imports.
- **RLS + FORCE** on all tables; public read limited to active catalog; orders/newsletter server-only.
- Prices/stock **always recomputed server-side** before payment — client prices are never trusted.
- All inputs validated (`lib/validate.ts`); endpoints rate-limited (`lib/rate-limit.ts`).
- Security headers (CSP, HSTS, X-Frame-Options, Permissions-Policy) in `next.config.js`.
- `decrement_stock` is `SECURITY DEFINER` with a pinned `search_path` and `EXECUTE` revoked from `anon`.

### Pre-launch security checklist
- [ ] Set real prices (`price_cents`) — replace every `TODO_PRECIO`.
- [ ] Run `supabase/schema.sql` then `supabase/seed.sql`.
- [ ] Run the **Supabase Security Advisor** linter and clear all warnings.
- [ ] Configure Stripe webhook endpoint → `/api/webhooks/stripe`, set `STRIPE_WEBHOOK_SECRET`.
- [ ] `npm audit` clean.
- [ ] Swap low-res catalog crops for high-res originals (`public/products/`).
- [ ] Lighthouse: Performance > 85, Best Practices > 95.

## The five pieces

| # | Slug | Name | Piece | Color | Ref |
|---|------|------|-------|-------|-----|
| 01 | `lola` | Lola | Satin Cross Back Dress | Cream | TD25091007 |
| 02 | `kateryn` | Kateryn | Flowy Two Piece Set | Yellow | TD25091008 |
| 03 | `amber` | Amber | Wine Corset Dress | Wine | TD25091006 |
| 04 | `daisy` | Daisy | Satin White T-Shirt Dress | White | TD25091010 |
| 05 | `gianna` | Gianna | Satin Beige Hardware Dress | Beige | TD25091009 |

Prices are intentionally `TODO_PRECIO` — the UI shows "Price on request" until set.
