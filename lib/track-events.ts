// Shared analytics event contract — imported by BOTH the client tracker and the
// server ingestion endpoint, so the two never drift. No secrets, no server-only.

export const EVENT_TYPES = [
  'page_view',
  'product_view',
  'size_select',
  'add_to_cart',
  'remove_from_cart',
  'checkout_started',
  'purchase',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export interface CartLine {
  slug: string;
  size: string | null;
  qty: number;
  value_cents: number | null;
}

// What the client sends. Kept tiny — geography, device and session identity are
// derived SERVER-side (never trusted from the browser).
export interface TrackEvent {
  t: EventType;
  path?: string;
  slug?: string;
  size?: string | null;
  value?: number | null; // cents
  qty?: number;
  ref?: string; // document.referrer (page_view only, first touch)
  utm?: { source?: string; medium?: string; campaign?: string };
  items?: CartLine[]; // cart snapshot for add/remove_from_cart
}
