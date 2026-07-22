// Shipping cost — single source of truth. Temporary flat rate for US domestic
// (standard ~2 lb box, coast to coast). When EasyPost dynamic rates land, this
// is the ONLY place to change: replace the constant with a rate lookup and keep
// the same shape. Never hardcode the shipping amount anywhere else.

export const SHIPPING_FLAT_CENTS = 675; // $6.75 USD
export const SHIPPING_LABEL = 'Shipping';
export const SHIPPING_ALLOWED_COUNTRIES = ['US'] as const;

export function shippingCents(): number {
  return SHIPPING_FLAT_CENTS;
}
