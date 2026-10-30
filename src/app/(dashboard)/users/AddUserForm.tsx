'use client';

import { useActionState, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
 * Create-user form in a dialog. Enabled only when the Auth admin API is configured on the server
 * (service role key present). When disabled, shows why, so the operator understands the
 * missing-config state instead of hitting a silent failure.
 */
export function AddUserForm({ adminApiConfigured }: { adminApiConfigured: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: AccountActionResult, fd: FormData) => {
      const res = await createUserAction(prev, fd);
      if (res.ok) {
        toast.success('User created');
        setOpen(false);
      } else if (res.error) {
        toast.error(res.error);
      }
      return res;
    },
    INITIAL,
  );

  if (!adminApiConfigured) {
    return (
      <div
        className="rounded-lg border border-amber-500/40 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/60 dark:text-amber-100"
        data-testid="add-user-disabled"
      >
        Creating users is unavailable: the server is missing{' '}
        <code>SUPABASE_SERVICE_ROLE_KEY</code>. Role &amp; department assignment for existing
        users still works below.
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button data-testid="add-user-open" />}>Add user</DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <form action={formAction} data-testid="add-user-form" className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
            <DialogDescription>Creates the sign-in account with a temporary password.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="employeeId">
                Employee ID <span className="text-destructive">*</span>
              </FieldLabel>
              <Input id="employeeId" name="employeeId" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="fullName">Full name</FieldLabel>
              <Input id="fullName" name="fullName" />
            </Field>
            <Field>
              <FieldLabel htmlFor="email">
                Email <span className="text-destructive">*</span>
              </FieldLabel>
              <Input id="email" name="email" type="email" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">
                Temporary password <span className="text-destructive">*</span>
              </FieldLabel>
              <Input id="password" name="password" type="password" required />
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="role">
                Role <span className="text-destructive">*</span>
              </FieldLabel>
              <Select name="role" items={ROLES} defaultValue="field_officer">
                <SelectTrigger id="role" className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {state.error && <FieldError className="sm:col-span-2">{state.error}</FieldError>}
          </FieldGroup>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending} data-testid="add-user-submit">
              {pending ? 'Creating…' : 'Create user'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
