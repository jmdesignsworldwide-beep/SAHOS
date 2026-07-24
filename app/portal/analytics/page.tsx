/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { PortalHeader } from '@/components/portal/PortalHeader';
import { formatPrice } from '@/lib/format';
import { adminInsights, ABANDON_AFTER_MINUTES, type Range } from '@/lib/insights';
import { adminAnalytics, type Range as LocRange } from '@/lib/analytics';
import { Funnel } from '@/components/portal/analytics/Funnel';
import { AnalyticsTrend } from '@/components/portal/analytics/AnalyticsTrend';
import { VisitMap } from '@/components/portal/analytics/VisitMap';

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

  return (
    <>
      <PortalHeader />
      <main className="pwrap pwrap--wide">
        <div className="an__head">
          <div>
            <h1 className="ptitle">Analytics</h1>
            <p className="an__sub">Comportamiento, carritos y conversión — en un vistazo. Anónimo, sin datos personales.</p>
          </div>
          <div className="an__ranges" role="group" aria-label="Periodo">
            {RANGES.map((r) => (
              <Link key={r.key} href={qp({ range: r.key })} className={`an__range ${range === r.key ? 'is-active' : ''}`}>
                {r.label}
              </Link>
            ))}
          </div>
        </div>

        {!a.hasData ? (
          <div className="an__empty">
            <p>
              {a.configured
                ? 'Aún no hay datos suficientes en este periodo — aparecerán con tus primeras visitas.'
                : 'El registro se activará automáticamente cuando el sitio esté publicado con la base de datos configurada.'}
            </p>
          </div>
        ) : (
          <>
            {/* KPI row */}
            <div className="kpis">
              <div className="kpi">
                <span className="kpi__label">Visitantes</span>
                <span className="kpi__num">{a.visitors.value.toLocaleString('es-DO')}</span>
                <Delta d={a.visitors} />
              </div>
              <div className="kpi">
                <span className="kpi__label">Tasa de conversión</span>
                <span className="kpi__num">{a.conversionRate.value}%</span>
                <Delta d={a.conversionRate} />
              </div>
              <div className="kpi">
                <span className="kpi__label">Carritos abandonados</span>
                <span className="kpi__num">{a.abandonedCarts.value.toLocaleString('es-DO')}</span>
                <Delta d={a.abandonedCarts} invert />
              </div>
              <div className="kpi kpi--accent">
                <span className="kpi__label">Valor perdido</span>
                <span className="kpi__num">{formatPrice(a.lostValueCents)}</span>
                <span className="kpi__foot">en carritos abandonados</span>
              </div>
              <div className="kpi">
                <span className="kpi__label">Ingresos</span>
                <span className="kpi__num">{formatPrice(a.revenueCents.value)}</span>
                <Delta d={a.revenueCents} />
              </div>
            </div>

            {/* Funnel + trend */}
            <div className="an__grid an__grid--62">
              <section className="an__card">
                <div className="an__card-head">
                  <h2 className="an__card-title">Embudo de conversión</h2>
                  <div className="an__pieces">
                    <Link href={qp({ piece: '' })} className={`an__chip ${!funnelSlug ? 'is-active' : ''}`}>
                      Todas
                    </Link>
                    {a.products.map((p) => (
                      <Link
                        key={p.slug}
                        href={qp({ piece: p.slug })}
                        className={`an__chip ${funnelSlug === p.slug ? 'is-active' : ''}`}
                      >
                        {p.name}
                      </Link>
                    ))}
                  </div>
                </div>
                <Funnel steps={a.funnel} />
              </section>

              <section className="an__card">
                <h2 className="an__card-title">Visitantes e ingresos</h2>
                <AnalyticsTrend trend={a.trend} />
              </section>
            </div>

            {/* Per-piece performance */}
            <section className="an__card">
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
                    {a.products.map((p) => (
                      <tr key={p.slug}>
                        <td className="ptable__piece">
                          <span className="ptable__thumb">{p.image ? <img src={p.image} alt="" /> : <span>—</span>}</span>
                          <Link href={`/product/${p.slug}`} className="ptable__name">
                            {p.name}
                          </Link>
                        </td>
                        <td className="num">{p.views.toLocaleString('es-DO')}</td>
                        <td className="num">{p.addToCart.toLocaleString('es-DO')}</td>
                        <td className="num">{p.purchases.toLocaleString('es-DO')}</td>
                        <td className="num">
                          <span className={`convpill ${p.convRate >= 3 ? 'is-good' : p.convRate > 0 ? 'is-mid' : 'is-zero'}`}>
                            {p.convRate}%
                          </span>
                        </td>
                        <td className="num strong">{formatPrice(p.revenueCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Abandoned carts + sources/devices */}
            <div className="an__grid an__grid--62">
              <section className="an__card">
                <h2 className="an__card-title">
                  Carritos abandonados <span className="an__count-badge">{a.abandonedCarts.value}</span>
                </h2>
                {a.abandoned.length === 0 ? (
                  <p className="an__muted">Sin carritos abandonados en este periodo. 🎉</p>
                ) : (
                  <ul className="acart">
                    {a.abandoned.map((c) => (
                      <li key={c.sessionId} className="acart__row">
                        <div className="acart__items">
                          {c.items.slice(0, 3).map((it, k) => (
                            <span key={k} className="acart__item">
                              {slugName(a.products, it.slug)} {it.size ? `· T${it.size}` : ''} ×{it.qty}
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
              </section>

              <div className="an__stack">
                <section className="an__card">
                  <h2 className="an__card-title">Fuentes de tráfico</h2>
                  <SourceBars rows={a.sources} />
                </section>
                <section className="an__card">
                  <h2 className="an__card-title">Dispositivos</h2>
                  <SourceBars rows={a.devices} />
                </section>
              </div>
            </div>

            {/* Location map (from the location analytics table) */}
            {loc.totalVisits > 0 && (
              <section className="an__card an__card--map">
                <h2 className="an__card-title">¿De dónde vienen?</h2>
                <VisitMap byCountry={loc.byCountry} />
              </section>
            )}
          </>
        )}

        <p className="an__privacy">
          🔒 Privacidad: sesión anónima de primera parte, sin IP ni datos que identifiquen a una persona. Los nombres y
          correos viven solo en Pedidos (Stripe). Un carrito se marca <strong>abandonado</strong> tras{' '}
          {ABANDON_AFTER_MINUTES / 60} horas de inactividad sin compra.
        </p>
      </main>
    </>
  );
}

function slugName(products: { slug: string; name: string }[], slug: string): string {
  return products.find((p) => p.slug === slug)?.name ?? slug;
}

function SourceBars({ rows }: { rows: { key: string; label: string; count: number; pct: number }[] }) {
  if (rows.length === 0) return <p className="an__muted">Sin datos todavía.</p>;
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
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}
