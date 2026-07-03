/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { adminListProducts } from '@/lib/admin';
import { formatPrice } from '@/lib/format';
import { PortalHeader } from '@/components/portal/PortalHeader';
import { DeleteProductButton } from '@/components/portal/DeleteProductButton';

export default async function ProductosPage() {
  const products = await adminListProducts();

  return (
    <>
      <PortalHeader />
      <main className="pwrap">
        <div className="ptoolbar">
          <h1 className="ptitle">Productos</h1>
          <Link href="/portal/productos/nuevo" className="pbtn pbtn--primary">
            Agregar producto
          </Link>
        </div>

        {products.length === 0 ? (
          <p className="pmsg">Aún no hay productos. Crea el primero.</p>
        ) : (
          <ul className="plist">
            {products.map((p) => {
              const thumb = p.images.find((i) => i.type === 'model')?.url;
              return (
                <li key={p.id} className="plist__row">
                  <div className="plist__thumb">
                    {thumb ? <img src={thumb} alt="" /> : <span className="plist__thumb-empty">—</span>}
                  </div>
                  <div className="plist__info">
                    <span className="plist__name">{p.name}</span>
                    <span className="plist__sub">{p.subtitle}</span>
                  </div>
                  <span className="plist__price">{formatPrice(p.price_cents, p.currency)}</span>
                  <span className={`pbadge ${p.active ? 'is-on' : 'is-off'}`}>
                    {p.active ? 'Activo' : 'Inactivo'}
                  </span>
                  <div className="plist__actions">
                    <Link href={`/portal/productos/${p.id}`} className="pbtn">
                      Editar
                    </Link>
                    <DeleteProductButton id={p.id} name={p.name} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
