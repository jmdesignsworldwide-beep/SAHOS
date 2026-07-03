import Link from 'next/link';
import { PortalHeader } from '@/components/portal/PortalHeader';
import { ProductForm } from '@/components/portal/ProductForm';

export default function NuevoProductoPage() {
  return (
    <>
      <PortalHeader />
      <main className="pwrap">
        <div className="ptoolbar">
          <h1 className="ptitle">Nuevo producto</h1>
          <Link href="/portal/productos" className="pbtn">
            ← Volver
          </Link>
        </div>
        <p className="pmsg">Guarda la pieza y luego podrás subir sus fotos.</p>
        <ProductForm />
      </main>
    </>
  );
}
