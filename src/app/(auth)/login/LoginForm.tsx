'use client';

import { useActionState } from 'react';
import { loginAction, type LoginState } from './actions';
import { Button, Field, Input } from '@/components/ui/Form';

const INITIAL: LoginState = { error: null };

/**
 * Login form. Submits to the loginAction server action and shows a generic error on
 * failure (req 1.2). Password policy / lockout are enforced by Supabase Auth.
 */
export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, INITIAL);

  return (
    <form action={formAction} className="space-y-4" data-testid="login-form">
      <Field label="Email" htmlFor="email" required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          data-testid="login-email"
        />
      </Field>

      <Field label="Password" htmlFor="password" required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          data-testid="login-password"
        />
      </Field>

      {state.error && (
        <p className="text-sm text-red-600" role="alert" data-testid="login-error">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} data-testid="login-submit" className="w-full">
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
