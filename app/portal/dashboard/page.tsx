/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { adminDashboard } from '@/lib/dashboard';
import { formatPrice } from '@/lib/format';
import { FULFILLMENT_LABEL } from '@/lib/orderStatus';
import { PortalHeader } from '@/components/portal/PortalHeader';
import { SalesChart } from '@/components/portal/SalesChart';

function pct(month: number, prev: number): { text: string; dir: 'up' | 'down' | 'flat' } {
  if (prev <= 0) return month > 0 ? { text: 'nuevo', dir: 'up' } : { text: '—', dir: 'flat' };
  const change = ((month - prev) / prev) * 100;
  const dir = change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
  return { text: `${change > 0 ? '+' : ''}${change.toFixed(0)}%`, dir };
}

export default async function DashboardPage() {
  const d = await adminDashboard();
  const change = pct(d.salesMonthCents, d.salesPrevMonthCents);
  const monthName = new Date().toLocaleDateString('es-DO', { month: 'long' });

  return (
    <>
      <PortalHeader />
      <main className="pwrap pwrap--wide">
        <h1 className="ptitle dash__title">Tu negocio hoy</h1>

        {/* Fila urgente / accionable */}
        <div className="dash__urgent">
          <Link href="/portal/pedidos?status=new" className="ucard">
            <span className="ucard__label">Pedidos nuevos sin procesar</span>
            <span className="ucard__num">{d.newOrders}</span>
            <span className="ucard__cta">
              {d.newOrders === 0 ? 'No hay pedidos pendientes.' : 'Procesar pedidos →'}
            </span>
          </Link>

          <Link href="/portal/inventario" className="ucard">
            <span className="ucard__label">Alertas de stock</span>
            {d.lowStock.length === 0 ? (
              <>
                <span className="ucard__num ucard__num--ok">✓</span>
                <span className="ucard__cta">Todo el inventario en buen nivel.</span>
              </>
            ) : (
              <>
                <span className="ucard__num ucard__num--warn">{d.lowStock.length}</span>
                <ul className="ucard__list">
                  {d.lowStock.slice(0, 3).map((s) => (
                    <li key={`${s.slug}-${s.size}`}>
                      <span>{s.name} · {s.size}</span>
                      <span className={s.soldOut ? 'tag tag--out' : 'tag tag--low'}>
                        {s.soldOut ? 'Agotado' : `${s.stock} und.`}
                      </span>
                    </li>
                  ))}
                  {d.lowStock.length > 3 && <li className="ucard__more">+{d.lowStock.length - 3} más →</li>}
                </ul>
              </>
            )}
          </Link>
        </div>

        {/* Métricas */}
        <div className="dash__metrics">
          <div className="mcard">
            <span className="mcard__label">Ventas de {monthName}</span>
            <span className="mcard__num">{formatPrice(d.salesMonthCents)}</span>
            <span className={`mcard__delta mcard__delta--${change.dir}`}>
              {change.dir === 'up' ? '▲' : change.dir === 'down' ? '▼' : ''} {change.text} vs mes anterior
            </span>
          </div>
          <div className="mcard">
            <span className="mcard__label">Ventas de hoy</span>
            <span className="mcard__num">{formatPrice(d.salesTodayCents)}</span>
          </div>
          <div className="mcard">
            <span className="mcard__label">Ticket promedio</span>
            <span className="mcard__num">{d.ordersMonth > 0 ? formatPrice(d.avgTicketCents) : '—'}</span>
            <span className="mcard__sub">{d.ordersMonth} pedido(s) este mes</span>
          </div>
          <div className="mcard">
            <span className="mcard__label">Unidades vendidas</span>
            <span className="mcard__num">{d.unitsSoldMonth}</span>
            <span className="mcard__sub">este mes</span>
          </div>
        </div>

        {/* Gráfica + top piezas */}
        <div className="dash__mid">
          <section className="dcard">
            <h2 className="dcard__title">Ventas · últimos 30 días</h2>
            {d.hasSales ? (
              <SalesChart daily={d.daily} />
            ) : (
              <div className="dempty">
                <p>Tus ventas aparecerán aquí.</p>
                <span>En cuanto entre tu primera venta, verás la gráfica llenarse.</span>
              </div>
            )}
          </section>

          <section className="dcard">
            <h2 className="dcard__title">Piezas más vendidas</h2>
            <ul className="rank">
              {d.topPieces.map((p, i) => (
                <li key={p.slug} className="rank__row">
                  <span className="rank__n">{i + 1}</span>
                  <span className="rank__thumb">
                    {p.image ? <img src={p.image} alt="" /> : <span>—</span>}
                  </span>
                  <span className="rank__name">{p.name}</span>
                  <span className="rank__units">{p.units > 0 ? `${p.units} und.` : 'Aún sin ventas'}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Inventario total + pedidos recientes */}
        <div className="dash__mid">
          <Link href="/portal/inventario" className="dcard dcard--stat">
            <span className="dcard__title">Unidades en inventario</span>
            <span className="dstat__num">{d.totalInventoryUnits}</span>
            <span className="dstat__sub">Total en las 5 piezas · gestionar →</span>
          </Link>

          <section className="dcard">
            <h2 className="dcard__title">Pedidos recientes</h2>
            {d.recentOrders.length === 0 ? (
              <div className="dempty">
                <p>Aún no hay pedidos.</p>
                <span>Aparecerán aquí cuando entre tu primera venta.</span>
              </div>
            ) : (
              <ul className="rlist">
                {d.recentOrders.map((o) => (
                  <li key={o.id}>
                    <Link href={`/portal/pedidos/${o.id}`} className="rlist__row">
                      <span className="rlist__cust">{o.customer_name || o.email || 'Cliente'}</span>
                      <span className="rlist__amt">{formatPrice(o.amount_cents, o.currency)}</span>
                      <span className={`opill ofx ofx--${o.fulfillment_status}`}>
                        {FULFILLMENT_LABEL[o.fulfillment_status]}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
