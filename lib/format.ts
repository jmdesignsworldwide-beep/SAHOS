// Price formatting. Prices are `null` until Marien sets them (TODO_PRECIO);
// render a discreet placeholder rather than "$0" so it never looks free.

export function formatPrice(cents: number | null, currency = 'usd'): string {
  if (cents == null) return 'Price on request';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function twoDigit(n: number): string {
  return n.toString().padStart(2, '0');
}
