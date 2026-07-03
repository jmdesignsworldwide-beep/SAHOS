import Link from 'next/link';
import { signOutAction } from '@/app/portal/actions';

// Admin chrome for the inner portal pages.
export function PortalHeader() {
  return (
    <header className="phead">
      <Link href="/portal/productos" className="phead__brand">
        SAHOS<span>· Portal</span>
      </Link>
      <nav className="phead__nav">
        <Link href="/portal/productos">Productos</Link>
        <Link href="/portal/cuenta">Cuenta</Link>
        <form action={signOutAction}>
          <button type="submit" className="phead__signout">
            Cerrar sesión
          </button>
        </form>
      </nav>
    </header>
  );
}
