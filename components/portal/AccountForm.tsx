'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { changePasswordAction, type ActionState } from '@/app/portal/actions';

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="pbtn pbtn--primary" disabled={pending}>
      {pending ? 'Guardando…' : 'Cambiar contraseña'}
    </button>
  );
}

export function AccountForm() {
  const [state, formAction] = useFormState<ActionState, FormData>(changePasswordAction, {});
  return (
    <form action={formAction} className="pform" key={state.ok ? 'done' : 'form'}>
      <label className="pfield">
        <span>Nueva contraseña</span>
        <input type="password" name="password" autoComplete="new-password" required minLength={8} />
      </label>
      <label className="pfield">
        <span>Confirmar contraseña</span>
        <input type="password" name="confirm" autoComplete="new-password" required minLength={8} />
      </label>
      {state.error && <p className="pmsg pmsg--error">{state.error}</p>}
      {state.ok && <p className="pmsg pmsg--ok">Contraseña actualizada.</p>}
      <SaveButton />
    </form>
  );
}
