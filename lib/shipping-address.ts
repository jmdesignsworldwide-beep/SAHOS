import type { AdminOrder } from '@/lib/admin';

// Turns a paid order's Stripe-captured shipping details into the clean, paste-
// ready block PirateShip expects, and computes the total estimated package
// weight. Pure — used server-side to build the string handed to the copy button.

export interface ShippingParts {
  name: string;
  line1: string;
  line2: string;
  cityLine: string; // "City, State ZIP"
  country: string;
  phone: string;
}

export function shippingParts(order: AdminOrder): ShippingParts {
  const s = (order.shipping_json ?? {}) as {
    name?: string;
    phone?: string;
    address?: Record<string, string | undefined>;
    shipping?: { address?: Record<string, string | undefined> };
  };
  const addr = s.address ?? s.shipping?.address ?? {};
  const stateZip = [addr.state, addr.postal_code].filter(Boolean).join(' ');
  const cityLine = [addr.city, stateZip].filter(Boolean).join(', ');
  return {
    name: order.customer_name || s.name || '',
    line1: addr.line1 || '',
    line2: addr.line2 || '',
    cityLine,
    country: addr.country || '',
    phone: s.phone || '',
  };
}

/** Multi-line address block, ready to paste into PirateShip. */
export function pirateShipAddress(order: AdminOrder): string {
  const p = shippingParts(order);
  return [p.name, p.line1, p.line2, p.cityLine, p.country, p.phone].filter(Boolean).join('\n');
}

/** True when the order has any usable shipping address at all. */
export function hasShippingAddress(order: AdminOrder): boolean {
  const p = shippingParts(order);
  return Boolean(p.line1 || p.cityLine);
}

export interface OrderWeight {
  totalOz: number;
  missing: boolean; // at least one piece has no weight set
}

export function orderTotalWeight(order: AdminOrder): OrderWeight {
  let total = 0;
  let missing = false;
  for (const it of order.items) {
    if (it.weight_oz == null) missing = true;
    else total += it.weight_oz * it.qty;
  }
  return { totalOz: Math.round(total * 100) / 100, missing };
}

/** "12 oz (≈ 0.75 lb)" — PirateShip accepts lb + oz. */
export function formatWeight(oz: number): string {
  if (oz <= 0) return '—';
  const lb = oz / 16;
  return `${oz} oz (≈ ${lb.toFixed(2)} lb)`;
}
