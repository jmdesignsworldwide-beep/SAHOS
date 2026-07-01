// Display swatch tones for the named catalog colors. Approximate, tuned to read
// well on white — the photography carries the true color.
export const COLOR_SWATCH: Record<string, string> = {
  Gold: '#C9A76B',
  Yellow: '#E9D27A',
  Wine: '#6B1F2A',
  White: '#F4F2EE',
  Beige: '#D8C6AE',
};

export function swatchFor(color: string): string {
  return COLOR_SWATCH[color] ?? '#E6E2DC';
}
