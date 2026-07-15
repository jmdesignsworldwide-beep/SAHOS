'use client';

import { useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { ALPHA2_TO_NUMERIC } from '@/lib/iso-countries';
import type { CountryCount } from '@/lib/analytics';

// World choropleth of visitor geography. Countries are shaded on a cream → gold
// → burgundy scale by visit count, matching the SAHOS palette. The topojson is
// served from /public (same-origin, CSP-safe — no external CDN). Admin-only, so
// it only ever loads inside the portal.

const GEO_URL = '/maps/countries-110m.json';

// Palette stops (cream → gold → wine). We interpolate on a sqrt scale so a few
// dominant countries don't flatten everyone else to the same tone.
const STOPS: Array<[number, number, number]> = [
  [0xf3, 0xe9, 0xda], // cream
  [0xd8, 0xbf, 0x8c], // soft gold
  [0xc0, 0x8a, 0x5a], // amber
  [0x8a, 0x33, 0x33], // rosewood
  [0x6b, 0x1f, 0x2a], // wine-deep
];
const EMPTY_FILL = '#efeae1';
const STROKE = '#e4d9c6';

function lerp(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}

function scaleColor(t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const seg = clamped * (STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.floor(seg));
  const f = seg - i;
  const [r1, g1, b1] = STOPS[i];
  const [r2, g2, b2] = STOPS[i + 1];
  return `rgb(${lerp(r1, r2, f)}, ${lerp(g1, g2, f)}, ${lerp(b1, b2, f)})`;
}

/** normalize a numeric ISO id (strip leading zeros) for matching topojson ids */
function numKey(n: string | number | undefined | null): string {
  if (n == null) return '';
  const p = parseInt(String(n), 10);
  return Number.isNaN(p) ? '' : String(p);
}

export function VisitMap({ byCountry }: { byCountry: CountryCount[] }) {
  const [hover, setHover] = useState<{ name: string; count: number } | null>(null);

  const { countByNum, nameByNum, max } = useMemo(() => {
    const countByNum = new Map<string, number>();
    const nameByNum = new Map<string, string>();
    let max = 0;
    for (const c of byCountry) {
      if (c.code === '??') continue;
      const numeric = ALPHA2_TO_NUMERIC[c.code];
      if (!numeric) continue;
      const key = numKey(numeric);
      countByNum.set(key, c.count);
      nameByNum.set(key, c.name);
      if (c.count > max) max = c.count;
    }
    return { countByNum, nameByNum, max };
  }, [byCountry]);

  return (
    <div className="vmap">
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: 165 }}
        width={900}
        height={420}
        style={{ width: '100%', height: 'auto' }}
        aria-label="Mapa mundial de visitantes"
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const key = numKey(geo.id);
              const count = countByNum.get(key) ?? 0;
              const t = max > 0 && count > 0 ? Math.sqrt(count / max) : 0;
              const fill = count > 0 ? scaleColor(t) : EMPTY_FILL;
              const name = nameByNum.get(key) ?? geo.properties?.name ?? '';
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={fill}
                  stroke={STROKE}
                  strokeWidth={0.4}
                  onMouseEnter={() => setHover({ name, count })}
                  onMouseLeave={() => setHover(null)}
                  style={{
                    default: { outline: 'none', transition: 'fill 200ms ease' },
                    hover: { outline: 'none', fill: count > 0 ? fill : '#e6dcc8', cursor: 'default' },
                    pressed: { outline: 'none' },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>

      <div className="vmap__foot">
        <div className="vmap__legend" aria-hidden>
          <span className="vmap__legend-label">Menos</span>
          <span className="vmap__legend-bar" />
          <span className="vmap__legend-label">Más visitas</span>
        </div>
        <div className="vmap__hover" role="status" aria-live="polite">
          {hover ? (
            <>
              <strong>{hover.name}</strong>
              <span>· {hover.count.toLocaleString('es-DO')} {hover.count === 1 ? 'visita' : 'visitas'}</span>
            </>
          ) : (
            <span className="vmap__hint">Pasa el cursor por un país</span>
          )}
        </div>
      </div>
    </div>
  );
}
