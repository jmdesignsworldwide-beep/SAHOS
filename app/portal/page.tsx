import Image from 'next/image';
import { hasSupabasePublic } from '@/lib/env';
import { LoginForm } from '@/components/portal/LoginForm';

// Login screen. Middleware already redirects an authenticated visitor away to
// /portal/productos, so reaching here means signed-out (or Supabase unconfigured).
export default function PortalLoginPage() {
  const configured = hasSupabasePublic();
  return (
    <div className="plogin">
      <div className="plogin__card">
        <Image
          src="/brand/sahos-logo.jpg"
          alt="SAHOS"
          width={200}
          height={179}
          unoptimized
          className="plogin__logo"
          priority
        />
        <p className="plogin__eyebrow">Portal de administración</p>

        {configured ? (
          <LoginForm />
        ) : (
          <p className="pmsg pmsg--error">
            El portal aún no está configurado. Falta añadir las variables de entorno de Supabase en Vercel.
          </p>
        )}
      </div>
    </div>
  );
}
