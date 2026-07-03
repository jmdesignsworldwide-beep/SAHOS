import Link from 'next/link';
import { adminListOrders, type FulfillmentStatus } from '@/lib/admin';
import { formatPrice } from '@/lib/format';
import { FULFILLMENT_LABEL, PAYMENT_LABEL } from '@/lib/orderStatus';
import { PortalHeader } from '@/components/portal/PortalHeader';

const TABS: { key: string; label: string }[] = [
  { key: '', label: 'Todos' },
  { key: 'new', label: 'Nuevos' },
  { key: 'preparing', label: 'Preparando' },
  { key: 'shipped', label: 'Enviados' },
  { key: 'delivered', label: 'Entregados' },
];

function shortId(o: { stripe_payment_intent: string | null; id: string }) {
  const src = o.stripe_payment_intent ?? o.id;
  return src.slice(-8).toUpperCase();
}

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const status = searchParams.status as FulfillmentStatus | undefined;
  const q = searchParams.q?.trim() || undefined;
  const orders = await adminListOrders({ status: status || undefined, q });

  return (
    <>
      <PortalHeader />
      <main className="pwrap">
        <div className="ptoolbar">
          <h1 className="ptitle">Pedidos</h1>
        </div>

        <div className="ofilters">
          <div className="otabs">
            {TABS.map((t) => {
              const params = new URLSearchParams();
              if (t.key) params.set('status', t.key);
              if (q) params.set('q', q);
              const href = `/portal/pedidos${params.toString() ? `?${params}` : ''}`;
              const active = (status ?? '') === t.key;
              return (
                <Link key={t.key} href={href} className={`otab ${active ? 'is-active' : ''}`}>
                  {t.label}
                </Link>
              );
            })}
          </div>
          <form className="osearch" action="/portal/pedidos" method="get">
            {status && <input type="hidden" name="status" value={status} />}
            <input name="q" defaultValue={q ?? ''} placeholder="Buscar por cliente o email" />
            <button className="pbtn" type="submit">
              Buscar
            </button>
          </form>
        </div>

        {orders.length === 0 ? (
          <div className="pempty">
            <p className="pempty__title">Aún no hay pedidos</p>
            <p className="pempty__sub">
              Aparecerán aquí automáticamente cuando entre tu primera venta.
            </p>
          </div>
        ) : (
          <ul className="olist">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/portal/pedidos/${o.id}`} className="orow">
                  <div className="orow__main">
                    <span className="orow__id">#{shortId(o)}</span>
                    <span className="orow__cust">{o.customer_name || o.email || 'Cliente'}</span>
                    <span className="orow__items">
                      {o.items.reduce((n, i) => n + i.qty, 0)} artículo(s)
                    </span>
                  </div>
                  <div className="orow__meta">
                    <span className="orow__date">
                      {new Date(o.created_at).toLocaleDateString('es-DO', { day: '2-digit', month: 'short' })}
                    </span>
                    <span className="orow__amount">{formatPrice(o.amount_cents, o.currency)}</span>
                    <span className={`opill opay opay--${o.status}`}>{PAYMENT_LABEL[o.status]}</span>
                    <span className={`opill ofx ofx--${o.fulfillment_status}`}>
                      {FULFILLMENT_LABEL[o.fulfillment_status]}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
