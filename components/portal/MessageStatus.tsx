'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateMessageStatusAction } from '@/app/portal/actions';
import type { MessageStatus as Status } from '@/lib/admin';

const NEXT: Record<Status, { to: Status; label: string } | null> = {
  new: { to: 'read', label: 'Marcar leído' },
  read: { to: 'replied', label: 'Marcar respondido' },
  replied: null,
};

const LABEL: Record<Status, string> = { new: 'Nuevo', read: 'Leído', replied: 'Respondido' };

export function MessageStatusControl({ id, status }: { id: string; status: Status }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const set = (to: Status) => {
    const fd = new FormData();
    fd.set('id', id);
    fd.set('status', to);
    start(async () => {
      await updateMessageStatusAction(fd);
      router.refresh();
    });
  };

  const next = NEXT[status];

  return (
    <div className="msg__status">
      <span className={`pbadge msg__badge msg__badge--${status}`}>{LABEL[status]}</span>
      {next && (
        <button type="button" className="pbtn" onClick={() => set(next.to)} disabled={pending}>
          {pending ? '…' : next.label}
        </button>
      )}
      {status !== 'new' && (
        <button
          type="button"
          className="msg__reset"
          onClick={() => set('new')}
          disabled={pending}
        >
          Marcar como nuevo
        </button>
      )}
    </div>
  );
}
