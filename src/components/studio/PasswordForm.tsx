'use client';

import { useActionState } from 'react';
import { passwordLogin } from '@/app/studio/actions';

export function PasswordForm() {
  const [state, action, pending] = useActionState(passwordLogin, undefined);
  return (
    <form action={action}>
      <div className="f">
        <label htmlFor="pw">Password</label>
        <input id="pw" name="password" type="password" autoComplete="current-password" required autoFocus />
      </div>
      {state?.error && <p className="err">{state.error}</p>}
      <button className="pill solid" type="submit" disabled={pending} style={{ justifyContent: 'center' }}>
        Sign in
      </button>
    </form>
  );
}
