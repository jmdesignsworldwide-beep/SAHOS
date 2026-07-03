import Link from 'next/link';
import { notFound } from 'next/navigation';
import { adminGetProduct } from '@/lib/admin';
import { PortalHeader } from '@/components/portal/PortalHeader';
import { ProductForm } from '@/components/portal/ProductForm';
import { PhotoManager } from '@/components/portal/PhotoManager';

export default async function EditarProductoPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { saved?: string };
}) {
  const product = await adminGetProduct(params.id);
  if (!product) notFound();

  return (
    <>
      <PortalHeader />
      <main className="pwrap">
        <div className="ptoolbar">
          <h1 className="ptitle">{product.name}</h1>
          <Link href="/portal/productos" className="pbtn">
            ← Volver
          </Link>
        </div>

        {searchParams.saved && <p className="pmsg pmsg--ok">Cambios guardados.</p>}

        <ProductForm product={product} />

        <hr className="pdivider" />
        <h2 className="psection-title">Fotos</h2>
        <PhotoManager productId={product.id} images={product.images} />
      </main>
    </>
  );
}
