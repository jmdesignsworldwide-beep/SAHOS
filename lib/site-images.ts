// Single source of truth for every editable SITE image (heros, campaign,
// packaging, Our Story). Each slot maps a stable `key` (stored in the
// site_images table) to a human-readable label + the current /public file used
// as the fallback when the slot is empty. Plain data — safe to import from both
// server components and client components (no secrets, no server-only).
//
// To expose a new editable image slot to the owner: add an entry here, seed a
// row in supabase/site-images.sql, and read it in the component via
// resolveSiteImage(). Nothing else to touch.

export interface SiteImageSlot {
  /** stable identifier stored in site_images.slot_key */
  key: string;
  /** grouping shown in the portal (e.g. "Inicio", "Our Story") */
  group: string;
  /** human-readable name shown in the portal */
  label: string;
  /** current /public path — used when the slot has no uploaded image yet */
  fallback: string;
  /** default alt text when none has been set */
  defaultAlt: string;
}

export const SITE_IMAGE_SLOTS: SiteImageSlot[] = [
  {
    key: 'home_hero',
    group: 'Inicio',
    label: 'Hero principal',
    fallback: '/products/campaign/hero.jpg',
    defaultAlt: 'SAHOS — The Marilyn Collection campaign',
  },
  {
    key: 'campaign_1',
    group: 'Inicio',
    label: 'Campaña — «A confession»',
    fallback: '/products/campaign/campaign-1.jpg',
    defaultAlt: 'SAHOS campaign',
  },
  {
    key: 'house_packaging',
    group: 'Inicio',
    label: 'The House — Packaging',
    fallback: '/products/house/packaging.jpg',
    defaultAlt: 'SAHOS velvet hangers and packaging',
  },
  {
    key: 'campaign_2',
    group: 'Inicio',
    label: 'Campaña — «Made to be seen»',
    fallback: '/products/campaign/campaign-2.jpg',
    defaultAlt: 'SAHOS campaign',
  },
  {
    key: 'our_story_founder',
    group: 'Our Story',
    label: 'Fundadora',
    fallback: '/our-story/founder.jpg',
    defaultAlt: 'SAHOS founder',
  },
  {
    key: 'our_story_philosophy',
    group: 'Our Story',
    label: 'Filosofía',
    fallback: '/our-story/philosophy.jpg',
    defaultAlt: 'SAHOS craftsmanship detail',
  },
  {
    key: 'our_story_design',
    group: 'Our Story',
    label: 'Diseño',
    fallback: '/our-story/design.jpg',
    defaultAlt: 'SAHOS design process',
  },
];

export const SITE_IMAGE_KEYS = SITE_IMAGE_SLOTS.map((s) => s.key);

/** Whitelist guard — server actions only accept a known slot_key. */
export function isSiteImageSlot(key: string): boolean {
  return SITE_IMAGE_KEYS.includes(key);
}

/** slot_key → { url, alt } as read from the DB (null when a slot has no row). */
export type SiteImageMap = Record<string, { url: string | null; alt: string | null }>;

/**
 * Resolve the image to render for a slot: the uploaded one from the DB, or the
 * current /public fallback if the slot is empty (so nothing ever breaks). Alt
 * falls back to the slot's default.
 */
export function resolveSiteImage(
  map: SiteImageMap | null | undefined,
  key: string
): { src: string; alt: string } {
  const slot = SITE_IMAGE_SLOTS.find((s) => s.key === key);
  const row = map?.[key];
  const url = row?.url && row.url.length > 0 ? row.url : null;
  const alt = row?.alt && row.alt.length > 0 ? row.alt : null;
  return {
    src: url ?? slot?.fallback ?? '',
    alt: alt ?? slot?.defaultAlt ?? '',
  };
}
