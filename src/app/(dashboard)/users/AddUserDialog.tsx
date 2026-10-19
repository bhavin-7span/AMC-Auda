'use client';

import { useActionState, useState } from 'react';
import { Button, Field, Input, Select } from '@/components/ui/Form';
import { useToast } from '@/components/ui/Toast';
import { createUserAction, type AccountActionResult } from './account-actions';
import type { StaffRole } from '@/lib/data/admin';

const INITIAL: AccountActionResult = { ok: false, error: null };
const ROLES: { value: StaffRole; label: string }[] = [
  { value: 'field_officer', label: 'Field Officer' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'dept_head', label: 'Department Head' },
  { value: 'admin', label: 'Administrator' },
];

/**
 * Create-user form. Enabled only when the Auth admin API is configured on the server
 * (service role key present). When disabled, shows why, so the operator understands the
 * missing-config state instead of hitting a silent failure.
 */
export function AddUserDialog({ adminApiConfigured }: { adminApiConfigured: boolean }) {
  const { show } = useToast();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: AccountActionResult, fd: FormData) => {
      const res = await createUserAction(prev, fd);
      if (res.ok) {
        show('User created', 'success');
        setOpen(false);
      } else if (res.error) {
        show(res.error, 'error');
      }
      return res;
    },
    INITIAL,
  );

  if (!adminApiConfigured) {
    return (
      <div
        className="rounded-md border border-amber-500/40 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/60 dark:text-amber-100"
        data-testid="add-user-disabled"
      >
        Creating users is unavailable: the server is missing{' '}
        <code>SUPABASE_SERVICE_ROLE_KEY</code>. Role &amp; department assignment for existing
        users still works below.
      </div>
    );
  }

  return (
    <div>
      <Button data-testid="add-user-open" onClick={() => setOpen((v) => !v)}>
        {open ? 'Close' : 'Add user'}
      </Button>

      {open && (
        <form
          action={formAction}
          data-testid="add-user-form"
          className="mt-3 grid max-w-xl gap-3 rounded-lg border border-black/10 p-4 sm:grid-cols-2 dark:border-white/15"
        >
          <Field label="Employee ID" htmlFor="employeeId" required>
            <Input id="employeeId" name="employeeId" required />
          </Field>
          <Field label="Full name" htmlFor="fullName">
            <Input id="fullName" name="fullName" />
          </Field>
          <Field label="Email" htmlFor="email" required>
            <Input id="email" name="email" type="email" required />
          </Field>
          <Field label="Temporary password" htmlFor="password" required>
            <Input id="password" name="password" type="password" required />
          </Field>
          <Field label="Role" htmlFor="role" required>
            <Select id="role" name="role" defaultValue="field_officer">
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end">
            <Button type="submit" disabled={pending} data-testid="add-user-submit">
              {pending ? 'Creating…' : 'Create user'}
            </Button>
          </div>
          {state.error && (
            <p className="text-sm text-red-600 sm:col-span-2" role="alert">
              {state.error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
