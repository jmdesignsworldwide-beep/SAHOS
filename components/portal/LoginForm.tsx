'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { signInAction, type ActionState } from '@/app/portal/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="pbtn pbtn--primary pbtn--full" disabled={pending}>
      {pending ? 'Entrando…' : 'Entrar'}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState<ActionState, FormData>(signInAction, {});
  return (
    <form action={formAction} className="pform">
      <label className="pfield">
        <span>Correo</span>
        <input type="email" name="email" autoComplete="email" required autoFocus />
      </label>
      <label className="pfield">
        <span>Contraseña</span>
        <input type="password" name="password" autoComplete="current-password" required />
      </label>
      {state.error && <p className="pmsg pmsg--error">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
