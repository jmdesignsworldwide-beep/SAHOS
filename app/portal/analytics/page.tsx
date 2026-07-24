/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { PortalHeader } from '@/components/portal/PortalHeader';
import { formatPrice } from '@/lib/format';
import { adminInsights, ABANDON_AFTER_MINUTES, type Range, type SourceRow } from '@/lib/insights';
import { adminAnalytics, type Range as LocRange } from '@/lib/analytics';
import { Funnel } from '@/components/portal/analytics/Funnel';
import { AnalyticsTrend } from '@/components/portal/analytics/AnalyticsTrend';
import { VisitMap } from '@/components/portal/analytics/VisitMap';
import { NumberTicker } from '@/components/portal/analytics/NumberTicker';
import { Reveal } from '@/components/portal/analytics/Reveal';

export const dynamic = 'force-dynamic';

const RANGES: { key: Range; label: string }[] = [
  { key: 'today', label: 'Hoy' },
  { key: '7d', label: '7 días' },
  { key: '30d', label: '30 días' },
  { key: '90d', label: '90 días' },
];

function asRange(v: string | undefined): Range {
  return v === 'today' || v === '7d' || v === '90d' ? v : '30d';
}
function locRangeFor(r: Range): LocRange {
  return r === '90d' ? 'all' : r === '30d' ? '30d' : '7d';
}

function flag(code: string): string {
  if (!code || code.length !== 2 || code === '??') return '🏳️';
  const A = 0x1f1e6;
  const up = code.toUpperCase();
  return String.fromCodePoint(A + (up.charCodeAt(0) - 65), A + (up.charCodeAt(1) - 65));
}

function Delta({ d, invert = false }: { d: { deltaPct: number | null }; invert?: boolean }) {
  if (d.deltaPct == null) return <span className="kpi__delta kpi__delta--flat">— sin base previa</span>;
  const up = d.deltaPct >= 0;
  const good = invert ? !up : up;
  return (
    <span className={`kpi__delta kpi__delta--${good ? 'up' : 'down'}`}>
      {up ? '▲' : '▼'} {Math.abs(Math.round(d.deltaPct))}% vs periodo anterior
    </span>
  );
}

function Bars({ rows, empty }: { rows: SourceRow[]; empty: string }) {
  if (rows.length === 0) return <p className="an__muted">{empty}</p>;
  return (
    <ul className="srcbars">
      {rows.map((r) => (
        <li key={r.key} className="srcbars__row">
          <span className="srcbars__label">{r.label}</span>
          <span className="srcbars__track">
            <span className="srcbars__fill" style={{ width: `${Math.max(4, r.pct)}%` }} />
          </span>
          <span className="srcbars__val">
            {r.count.toLocaleString('es-DO')} <span className="srcbars__pct">{r.pct}%</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return 'hace <1 h';
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: { range?: string; piece?: string };
}) {
  const range = asRange(searchParams.range);
  const funnelSlug = searchParams.piece || null;
  const [a, loc] = await Promise.all([adminInsights(range, funnelSlug), adminAnalytics(locRangeFor(range))]);

  const qp = (over: Record<string, string>) => {
    const p = new URLSearchParams({ range, ...(funnelSlug ? { piece: funnelSlug } : {}), ...over });
    return `/portal/analytics?${p.toString()}`;
  };

  const funnelZero = a.funnel.every((s) => s.count === 0);

  return (
    <>
      <PortalHeader />
      <main className="pwrap pwrap--wide">
        <div className="an__head">
          <div>
            <h1 className="ptitle">Analytics</h1>
            <p className="an__sub">De dónde vienen, qué miran y dónde se van tus visitantes. Anónimo — sin datos personales.</p>
          </div>
          <div className="an__ranges" role="group" aria-label="Periodo">
            {RANGES.map((r) => (
              <Link key={r.key} href={qp({ range: r.key })} className={`an__range ${range === r.key ? 'is-active' : ''}`}>
                {r.label}
              </Link>
            ))}
          </div>
        </div>

        {/* KPI row — always visible, animated tickers */}
        <div className="kpis">
          <Reveal delay={0} className="kpi">
            <span className="kpi__label">Visitantes</span>
            <span className="kpi__num"><NumberTicker value={a.visitors.value} /></span>
            <Delta d={a.visitors} />
          </Reveal>
          <Reveal delay={60} className="kpi">
            <span className="kpi__label">Tasa de conversión</span>
            <span className="kpi__num"><NumberTicker value={a.conversionRate.value} format="pct" /></span>
            <Delta d={a.conversionRate} />
          </Reveal>
          <Reveal delay={120} className="kpi">
            <span className="kpi__label">Carritos abandonados</span>
            <span className="kpi__num"><NumberTicker value={a.abandonedCarts.value} /></span>
            <Delta d={a.abandonedCarts} invert />
          </Reveal>
          <Reveal delay={180} className="kpi kpi--accent">
            <span className="kpi__label">Valor perdido</span>
            <span className="kpi__num"><NumberTicker value={a.lostValueCents} format="money" /></span>
            <span className="kpi__foot">en carritos abandonados</span>
          </Reveal>
          <Reveal delay={240} className="kpi">
            <span className="kpi__label">Ingresos</span>
            <span className="kpi__num"><NumberTicker value={a.revenueCents.value} format="money" /></span>
            <Delta d={a.revenueCents} />
          </Reveal>
        </div>

        {/* Funnel + trend */}
        <div className="an__grid an__grid--62">
          <Reveal className="an__card">
            <div className="an__card-head">
              <h2 className="an__card-title">Embudo de conversión</h2>
              <div className="an__pieces">
                <Link href={qp({ piece: '' })} className={`an__chip ${!funnelSlug ? 'is-active' : ''}`}>Todas</Link>
                {a.products.map((p) => (
                  <Link key={p.slug} href={qp({ piece: p.slug })} className={`an__chip ${funnelSlug === p.slug ? 'is-active' : ''}`}>
                    {p.name}
                  </Link>
                ))}
              </div>
            </div>
            <Funnel steps={a.funnel} />
            {funnelZero && <p className="an__note">Aún sin recorrido — el embudo se llena cuando alguien entra a la tienda.</p>}
          </Reveal>

          <Reveal className="an__card" delay={80}>
            <h2 className="an__card-title">Visitantes e ingresos</h2>
            <AnalyticsTrend trend={a.trend} />
          </Reveal>
        </div>

        {/* Map + location ranking */}
        <div className="an__grid an__grid--62">
          <Reveal className="an__card an__card--map">
            <h2 className="an__card-title">¿De dónde vienen?</h2>
            <VisitMap byCountry={loc.byCountry} />
            {loc.totalVisits === 0 && <p className="an__note">Sin visitas aún — el mapa se ilumina en cuanto llegue tu primera visita.</p>}
          </Reveal>

          <Reveal className="an__card" delay={80}>
            <h2 className="an__card-title">Top ubicaciones</h2>
            {loc.topLocations.length === 0 ? (
              <p className="an__muted">Aún sin ubicaciones registradas.</p>
            ) : (
              <ol className="an__rank">
                {loc.topLocations.slice(0, 8).map((l, i) => {
                  const place = [l.city, l.region].filter(Boolean).join(', ');
                  return (
                    <li key={`${l.code}-${i}`} className="an__rank-row">
                      <span className="an__rank-i">{i + 1}</span>
                      <span className="an__rank-flag">{flag(l.code)}</span>
                      <span className="an__rank-place">
                        <strong>{place || l.country}</strong>
                        {place && <span className="an__rank-country">{l.country}</span>}
                      </span>
                      <span className="an__rank-count">{l.count.toLocaleString('es-DO')}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </Reveal>
        </div>

        {/* Per-piece performance — always lists the 5 pieces */}
        <Reveal className="an__card">
          <h2 className="an__card-title">Rendimiento por pieza</h2>
          <div className="ptable__scroll">
            <table className="ptable">
              <thead>
                <tr>
                  <th>Pieza</th>
                  <th className="num">Vistas</th>
                  <th className="num">Al carrito</th>
                  <th className="num">Compras</th>
                  <th className="num">Conversión</th>
                  <th className="num">Ingresos</th>
                </tr>
              </thead>
              <tbody>
                {a.products.length === 0 ? (
                  <tr><td colSpan={6} className="an__muted" style={{ padding: '1.25rem 0.6rem' }}>Cargando piezas…</td></tr>
                ) : (
                  a.products.map((p) => (
                    <tr key={p.slug}>
                      <td className="ptable__piece">
                        <span className="ptable__thumb">{p.image ? <img src={p.image} alt="" /> : <span>—</span>}</span>
                        <Link href={`/product/${p.slug}`} className="ptable__name">{p.name}</Link>
                      </td>
                      <td className="num">{p.views.toLocaleString('es-DO')}</td>
                      <td className="num">{p.addToCart.toLocaleString('es-DO')}</td>
                      <td className="num">{p.purchases.toLocaleString('es-DO')}</td>
                      <td className="num">
                        <span className={`convpill ${p.convRate >= 3 ? 'is-good' : p.convRate > 0 ? 'is-mid' : 'is-zero'}`}>{p.convRate}%</span>
                      </td>
                      <td className="num strong">{formatPrice(p.revenueCents)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Reveal>

        {/* Abandoned carts + sources/devices */}
        <div className="an__grid an__grid--62">
          <Reveal className="an__card">
            <h2 className="an__card-title">
              Carritos abandonados <span className="an__count-badge">{a.abandonedCarts.value}</span>
            </h2>
            {a.abandoned.length === 0 ? (
              <p className="an__note">Ningún carrito abandonado en este periodo — o aún no hay carritos. Aparecerán aquí con su valor y en qué paso se fueron.</p>
            ) : (
              <ul className="acart">
                {a.abandoned.map((c) => (
                  <li key={c.sessionId} className="acart__row">
                    <div className="acart__items">
                      {c.items.slice(0, 3).map((it, k) => (
                        <span key={k} className="acart__item">
                          {a.products.find((p) => p.slug === it.slug)?.name ?? it.slug} {it.size ? `· T${it.size}` : ''} ×{it.qty}
                        </span>
                      ))}
                      {c.items.length > 3 && <span className="acart__more">+{c.items.length - 3}</span>}
                    </div>
                    <div className="acart__meta">
                      <span className="acart__value">{formatPrice(c.valueCents)}</span>
                      <span className={`acart__step acart__step--${c.lastStep ?? 'add'}`}>
                        {c.lastStep === 'checkout_started' ? 'Abandonó en pago' : 'Abandonó en carrito'}
                      </span>
                      <span className="acart__when">{timeAgo(c.updatedAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Reveal>

          <div className="an__stack">
            <Reveal className="an__card" delay={80}>
              <h2 className="an__card-title">Fuentes de tráfico</h2>
              <Bars rows={a.sources} empty="Sin fuentes aún — verás de dónde llegan (Instagram, Google, directo…)." />
            </Reveal>
            <Reveal className="an__card" delay={140}>
              <h2 className="an__card-title">Dispositivos</h2>
              <Bars rows={a.devices} empty="Móvil vs. escritorio aparecerá con tus primeras visitas." />
            </Reveal>
          </div>
        </div>

        {/* Behavior: top pages + most-selected sizes */}
        <div className="an__grid">
          <Reveal className="an__card">
            <h2 className="an__card-title">Páginas más vistas</h2>
            <Bars rows={a.topPages} empty="Las páginas más visitadas se listarán aquí." />
          </Reveal>
          <Reveal className="an__card" delay={80}>
            <h2 className="an__card-title">Tallas más elegidas</h2>
            <Bars rows={a.topSizes} empty="Revela la demanda real — qué tallas eligen, aunque no compren." />
          </Reveal>
        </div>

        <p className="an__privacy">
          🔒 Privacidad: sesión anónima de primera parte, sin IP ni datos que identifiquen a una persona. Los nombres y
          correos viven solo en Pedidos (Stripe). Un carrito se marca <strong>abandonado</strong> tras{' '}
          {ABANDON_AFTER_MINUTES / 60} horas de inactividad sin compra.
        </p>
      </main>
    </>
  );
}
