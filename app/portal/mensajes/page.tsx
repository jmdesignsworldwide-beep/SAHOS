import { adminListMessages } from '@/lib/admin';
import { PortalHeader } from '@/components/portal/PortalHeader';
import { MessageStatusControl } from '@/components/portal/MessageStatus';

export const dynamic = 'force-dynamic';

// DR timezone-agnostic date string for the list.
function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('es-DO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Customer-service inbox: messages sent from /contact. The owner reads them,
// replies by email (mailto), and marks new → read → replied.
export default async function MensajesPage() {
  const messages = await adminListMessages();
  const unread = messages.filter((m) => m.status === 'new').length;

  return (
    <>
      <PortalHeader />
      <main className="pwrap">
        <div className="ptoolbar">
          <h1 className="ptitle">Mensajes</h1>
          {unread > 0 && <span className="pbadge is-on">{unread} sin leer</span>}
        </div>
        <p className="pmsg pmsg--muted">
          Mensajes de servicio al cliente enviados desde la página de Contacto. Responde por correo
          y marca cada uno como leído o respondido.
        </p>

        {messages.length === 0 ? (
          <div className="pempty">
            <p className="pempty__title">Aún no hay mensajes</p>
            <p className="pempty__sub">Aparecerán aquí cuando un cliente escriba desde Contacto.</p>
          </div>
        ) : (
          <ul className="msg-list">
            {messages.map((m) => (
              <li key={m.id} className={`msg ${m.status === 'new' ? 'is-unread' : ''}`}>
                <div className="msg__head">
                  <div>
                    <span className="msg__name">{m.name || 'Sin nombre'}</span>
                    <a className="msg__email" href={`mailto:${m.email}?subject=Re:%20SAHOS`}>
                      {m.email}
                    </a>
                  </div>
                  <time className="msg__date">{fmtDate(m.created_at)}</time>
                </div>
                <p className="msg__body">{m.message}</p>
                <div className="msg__foot">
                  <a className="pbtn pbtn--primary" href={`mailto:${m.email}?subject=Re:%20SAHOS`}>
                    Responder
                  </a>
                  <MessageStatusControl id={m.id} status={m.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
