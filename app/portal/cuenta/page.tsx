import { getSessionUser } from '@/lib/supabase/ssr';
import { PortalHeader } from '@/components/portal/PortalHeader';
import { AccountForm } from '@/components/portal/AccountForm';

export default async function CuentaPage() {
  const user = await getSessionUser();

  return (
    <>
      <PortalHeader />
      <main className="pwrap pwrap--narrow">
        <h1 className="ptitle">Cuenta</h1>
        {user?.email && <p className="pmsg">Sesión: {user.email}</p>}
        <AccountForm />
      </main>
    </>
  );
}
