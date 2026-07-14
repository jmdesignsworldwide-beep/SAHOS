import Link from 'next/link';
import { PortalHeader } from '@/components/portal/PortalHeader';
import { adminAnalytics, type Range } from '@/lib/analytics';
import { VisitMap } from '@/components/portal/analytics/VisitMap';
import { VisitsTrend } from '@/components/portal/analytics/VisitsTrend';

// Nonce-CSP requires per-request rendering; also the data is live.
export const dynamic = 'force-dynamic';

const RANGES: { key: Range; label: string }[] = [
  { key: '7d', label: 'Últimos 7 días' },
  { key: '30d', label: 'Últimos 30 días' },
  { key: 'all', label: 'Todo' },
];

function asRange(v: string | undefined): Range {
  return v === '7d' || v === 'all' ? v : '30d';
}

/** 🇺🇸 flag emoji from an alpha-2 code (regional-indicator letters). */
function flag(code: string): string {
  if (!code || code.length !== 2 || code === '??') return '🏳️';
  const A = 0x1f1e6;
  const up = code.toUpperCase();
  return String.fromCodePoint(A + (up.charCodeAt(0) - 65), A + (up.charCodeAt(1) - 65));
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: { range?: string };
}) {
  const range = asRange(searchParams.range);
  const a = await adminAnalytics(range);

  return (
    <>
      <PortalHeader />
      <main className="pwrap pwrap--wide">
        <div className="an__head">
          <div>
            <h1 className="ptitle">Analytics de ubicación</h1>
            <p className="an__sub">De dónde entran tus visitantes. Ubicación aproximada — sin IP, sin datos personales.</p>
          </div>
          <div className="an__ranges" role="group" aria-label="Rango de fechas">
            {RANGES.map((r) => (
              <Link
                key={r.key}
                href={`/portal/analytics?range=${r.key}`}
                className={`an__range ${range === r.key ? 'is-active' : ''}`}
              >
                {r.label}
              </Link>
            ))}
          </div>
        </div>

        {a.totalVisits === 0 ? (
          <div className="an__empty">
            <p>
              {a.configured
                ? 'Aún no hay visitas registradas en este rango. En cuanto entren visitantes al sitio, aparecerán aquí.'
                : 'El registro de visitas se activará automáticamente cuando el sitio esté publicado con Supabase configurado.'}
            </p>
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="an__stats">
              <div className="an__stat">
                <span className="an__stat-label">Visitas totales</span>
                <span className="an__stat-num">{a.totalVisits.toLocaleString('es-DO')}</span>
              </div>
              <div className="an__stat">
                <span className="an__stat-label">Países únicos</span>
                <span className="an__stat-num">{a.uniqueCountries.toLocaleString('es-DO')}</span>
              </div>
              <div className="an__stat">
                <span className="an__stat-label">País top</span>
                <span className="an__stat-num an__stat-num--sm">
                  {a.topCountry ? (
                    <>
                      <span className="an__flag">{flag(a.topCountry.code)}</span> {a.topCountry.name}
                    </>
                  ) : (
                    '—'
                  )}
                </span>
                {a.topCountry && (
                  <span className="an__stat-foot">{a.topCountry.count.toLocaleString('es-DO')} visitas</span>
                )}
              </div>
              <div className="an__stat">
                <span className="an__stat-label">Región top</span>
                <span className="an__stat-num an__stat-num--sm">{a.topRegion ? a.topRegion.label : '—'}</span>
                {a.topRegion && (
                  <span className="an__stat-foot">{a.topRegion.count.toLocaleString('es-DO')} visitas</span>
                )}
              </div>
            </div>

            {/* Map */}
            <section className="an__card an__card--map">
              <h2 className="an__card-title">Mapa de visitantes</h2>
              <VisitMap byCountry={a.byCountry} />
            </section>

            <div className="an__grid">
              {/* Top locations ranking */}
              <section className="an__card">
                <h2 className="an__card-title">Top ubicaciones</h2>
                <ol className="an__rank">
                  {a.topLocations.map((loc, i) => {
                    const place = [loc.city, loc.region].filter(Boolean).join(', ');
                    return (
                      <li key={`${loc.code}-${loc.region}-${loc.city}-${i}`} className="an__rank-row">
                        <span className="an__rank-i">{i + 1}</span>
                        <span className="an__rank-flag">{flag(loc.code)}</span>
                        <span className="an__rank-place">
                          <strong>{place || loc.country}</strong>
                          {place && <span className="an__rank-country">{loc.country}</span>}
                        </span>
                        <span className="an__rank-count">{loc.count.toLocaleString('es-DO')}</span>
                      </li>
                    );
                  })}
                </ol>
              </section>

              {/* Countries ranking */}
              <section className="an__card">
                <h2 className="an__card-title">Por país</h2>
                <ul className="an__countries">
                  {a.byCountry.slice(0, 12).map((c) => {
                    const w = a.byCountry[0]?.count ? Math.round((c.count / a.byCountry[0].count) * 100) : 0;
                    return (
                      <li key={c.code} className="an__country">
                        <span className="an__country-name">
                          <span className="an__flag">{flag(c.code)}</span>
                          {c.code === '??' ? 'Desconocido' : c.name}
                        </span>
                        <span className="an__bar">
                          <span className="an__bar-fill" style={{ width: `${Math.max(6, w)}%` }} />
                        </span>
                        <span className="an__country-count">{c.count.toLocaleString('es-DO')}</span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </div>

            {/* Trend over time */}
            <section className="an__card">
              <h2 className="an__card-title">Visitas en el tiempo</h2>
              <VisitsTrend daily={a.daily} weekly={a.weekly} />
            </section>
          </>
        )}

        <p className="an__privacy">
          🔒 Privacidad: se guarda solo la ubicación aproximada (país, región, ciudad) derivada en el borde de
          Vercel. Nunca se almacena la IP ni datos que identifiquen a una persona.
        </p>
      </main>
    </>
  );
}
