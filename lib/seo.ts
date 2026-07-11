// Single source of truth for SEO-facing URLs and defaults. Safe to import from
// both server and client (no secrets). Used by the sitemap, robots, the root
// metadata, and every page's canonical.

// Canonical production origin. Defaults to the real domain so the sitemap,
// robots and canonicals are correct even when NEXT_PUBLIC_SITE_URL is unset —
// never localhost or a *.vercel.app preview host. Trailing slashes stripped so
// URLs concatenate cleanly.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.sahoshop.com').replace(/\/+$/, '');

// Human-readable brand/site name for Open Graph.
export const SITE_NAME = 'SAHOS';

// Default share image (Open Graph / Twitter). The brand logotype — always
// present in /public, so sharing never yields a broken preview. Product pages
// override this with the piece's own photo when one exists.
export const OG_IMAGE = '/brand/sahos-logo.jpg';
