'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { bulkUploadUsersAction, type BulkActionState } from './bulk-actions';

const INITIAL: BulkActionState = { result: null, error: null };
const SAMPLE = 'email,employee_id,full_name,role\njane@auda.gov.in,EMP-001,Jane Doe,supervisor';

/**
 * Bulk user upload via pasted CSV, in a dialog. Upserts profile + role for EXISTING auth
 * accounts (matched by email) and shows per-row results. Account creation is separate
 * (needs the Auth admin API). Admin-gated + audited server-side.
 */
export function BulkUploadPanel() {
  const [state, formAction, pending] = useActionState(bulkUploadUsersAction, INITIAL);

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" data-testid="bulk-open" />}>Bulk upload</DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <form action={formAction} data-testid="bulk-form" className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Bulk upload users</DialogTitle>
            <DialogDescription>Update profile and role for existing accounts from CSV.</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="csv">Paste CSV (header + rows)</FieldLabel>
            <Textarea id="csv" name="csv" data-testid="bulk-csv" rows={6} defaultValue={SAMPLE} className="font-mono text-xs" />
            <FieldDescription>
              Columns: <code>email, employee_id, full_name, role</code>. Users must already have an
              account; unmatched emails are reported as errors.
            </FieldDescription>
          </Field>

          {state.error && <FieldError>{state.error}</FieldError>}

          {state.result && (
            <div data-testid="bulk-result" className="max-h-48 overflow-y-auto rounded-lg border p-3 text-sm">
              <p className="font-medium">
                {state.result.ok} succeeded, {state.result.failed} failed of {state.result.total}
              </p>
              <ul className="mt-2 space-y-0.5">
                {state.result.results.map((r) => (
                  <li key={r.row} className={r.ok ? 'text-green-700 dark:text-green-400' : 'text-destructive'}>
                    Row {r.row} ({r.email ?? '—'}): {r.ok ? 'OK' : r.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={pending} data-testid="bulk-submit">
              {pending ? 'Uploading…' : 'Upload'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
