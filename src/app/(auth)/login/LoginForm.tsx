'use client';

import { useActionState } from 'react';
import { loginAction, type LoginState } from './actions';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

const INITIAL: LoginState = { error: null };

/**
 * Login form. Submits to the loginAction server action and shows a generic error on
 * failure (req 1.2). Password policy / lockout are enforced by Supabase Auth.
 */
export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, INITIAL);

  return (
    <form action={formAction} data-testid="login-form">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">
            Email <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="h-9"
            data-testid="login-email"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="password">
            Password <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="h-9"
            data-testid="login-password"
          />
        </Field>

        {state.error && <FieldError data-testid="login-error">{state.error}</FieldError>}

        <Button type="submit" size="lg" disabled={pending} data-testid="login-submit" className="w-full">
          {pending && <Spinner />}
          {pending ? 'Signing in…' : 'Sign in'}
        </Button>
      </FieldGroup>
    </form>
  );
}
