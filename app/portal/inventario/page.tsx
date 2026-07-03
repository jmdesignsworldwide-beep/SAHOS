import { adminInventory } from '@/lib/dashboard';
import { PortalHeader } from '@/components/portal/PortalHeader';
import { InventoryTable } from '@/components/portal/InventoryTable';

export default async function InventarioPage() {
  const { pieces, grandTotal } = await adminInventory();

  return (
    <>
      <PortalHeader />
      <main className="pwrap pwrap--wide">
        <div className="ptoolbar">
          <h1 className="ptitle">Inventario</h1>
          <span className="inv-total">
            Total general: <strong>{grandTotal}</strong> unidades
          </span>
        </div>

        <p className="pmsg">
          Edita la cantidad de cualquier talla y guarda con ✓. El stock también baja solo con cada venta.
          Las piezas en <strong>Stock limitado</strong> se marcan agotadas en la tienda al llegar a 0.
        </p>

        {pieces.length === 0 ? (
          <div className="pempty">
            <p className="pempty__title">Aún no hay piezas</p>
            <p className="pempty__sub">Crea productos en la sección Productos para gestionar su stock aquí.</p>
          </div>
        ) : (
          <InventoryTable pieces={pieces} />
        )}
      </main>
    </>
  );
}
