import Link from 'next/link';
import { notFound } from 'next/navigation';
import { adminGetOrder } from '@/lib/admin';
import { formatPrice } from '@/lib/format';
import { FULFILLMENT_LABEL, PAYMENT_LABEL } from '@/lib/orderStatus';
import { PortalHeader } from '@/components/portal/PortalHeader';
import { OrderStatusControl } from '@/components/portal/OrderStatusControl';

function shipping(o: any): { name?: string; line1?: string; line2?: string; city?: string; country?: string } {
  const s = o.shipping_json ?? {};
  const addr = s.address ?? s.shipping?.address ?? {};
  return {
    name: s.name,
    line1: addr.line1,
    line2: addr.line2,
    city: [addr.city, addr.state, addr.postal_code].filter(Boolean).join(', '),
    country: addr.country,
  };
}

export default async function PedidoDetallePage({ params }: { params: { id: string } }) {
  const order = await adminGetOrder(params.id);
  if (!order) notFound();
  const addr = shipping(order);

  return (
    <>
      <PortalHeader />
      <main className="pwrap">
        <div className="ptoolbar">
          <h1 className="ptitle">
            Pedido #{(order.stripe_payment_intent ?? order.id).slice(-8).toUpperCase()}
          </h1>
          <Link href="/portal/pedidos" className="pbtn">
            ← Pedidos
          </Link>
        </div>

        <div className="odetail">
          <section className="ocard">
            <h2 className="ocard__title">Estado del envío</h2>
            <OrderStatusControl order={order} />
          </section>

          <div className="odetail__grid">
            <section className="ocard">
              <h2 className="ocard__title">Artículos</h2>
              <ul className="oitems">
                {order.items.map((it) => (
                  <li key={it.id} className="oitem">
                    <span className="oitem__name">{it.name}</span>
                    <span className="oitem__meta">Talla {it.size} · x{it.qty}</span>
                    <span className="oitem__price">{formatPrice(it.unit_price_cents * it.qty, order.currency)}</span>
                  </li>
                ))}
              </ul>
              <div className="oitems__total">
                <span>Total pagado</span>
                <span>{formatPrice(order.amount_cents, order.currency)}</span>
              </div>
              <p className="ocard__note">
                Pago: <strong>{PAYMENT_LABEL[order.status]}</strong> · Fulfillment:{' '}
                <strong>{FULFILLMENT_LABEL[order.fulfillment_status]}</strong>
                <br />
                El estado de pago lo administra Stripe y no se edita a mano.
              </p>
            </section>

            <section className="ocard">
              <h2 className="ocard__title">Cliente y envío</h2>
              <div className="okv">
                <span>Nombre</span>
                <span>{order.customer_name || addr.name || '—'}</span>
              </div>
              <div className="okv">
                <span>Email</span>
                <span>{order.email || '—'}</span>
              </div>
              <div className="okv">
                <span>Dirección</span>
                <span>
                  {[addr.line1, addr.line2, addr.city, addr.country].filter(Boolean).join(', ') || '—'}
                </span>
              </div>
              {order.tracking_number && (
                <div className="okv">
                  <span>Tracking</span>
                  <span>
                    {order.tracking_number}
                    {order.courier ? ` · ${order.courier}` : ''}
                  </span>
                </div>
              )}
              <div className="okv">
                <span>Fecha</span>
                <span>{new Date(order.created_at).toLocaleString('es-DO')}</span>
              </div>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
