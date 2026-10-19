'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/Form';
import { bulkUploadUsersAction, type BulkActionState } from './bulk-actions';

const INITIAL: BulkActionState = { result: null, error: null };
const SAMPLE = 'email,employee_id,full_name,role\njane@auda.gov.in,EMP-001,Jane Doe,supervisor';

/**
 * Bulk user upload via pasted CSV. Upserts profile + role for EXISTING auth accounts
 * (matched by email) and shows per-row results. Account creation is separate (needs the
 * Auth admin API). Admin-gated + audited server-side.
 */
export function BulkUploadPanel() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(bulkUploadUsersAction, INITIAL);

  return (
    <div>
      <Button variant="secondary" data-testid="bulk-open" onClick={() => setOpen((v) => !v)}>
        {open ? 'Close bulk upload' : 'Bulk upload'}
      </Button>

      {open && (
        <form action={formAction} data-testid="bulk-form" className="mt-3 space-y-3">
          <label htmlFor="csv" className="block text-sm font-medium">
            Paste CSV (header + rows)
          </label>
          <textarea
            id="csv"
            name="csv"
            data-testid="bulk-csv"
            rows={6}
            defaultValue={SAMPLE}
            className="w-full rounded-md border border-black/15 bg-transparent p-2 font-mono text-xs outline-none focus:border-zinc-500 dark:border-white/20"
          />
          <p className="text-xs text-zinc-500">
            Columns: <code>email, employee_id, full_name, role</code>. Users must already
            have an account; unmatched emails are reported as errors.
          </p>
          <Button type="submit" disabled={pending} data-testid="bulk-submit">
            {pending ? 'Uploading…' : 'Upload'}
          </Button>

          {state.error && (
            <p className="text-sm text-red-600" role="alert">
              {state.error}
            </p>
          )}

          {state.result && (
            <div data-testid="bulk-result" className="rounded-md border border-black/10 p-3 text-sm dark:border-white/15">
              <p className="font-medium">
                {state.result.ok} succeeded, {state.result.failed} failed of {state.result.total}
              </p>
              <ul className="mt-2 space-y-0.5">
                {state.result.results.map((r) => (
                  <li
                    key={r.row}
                    className={r.ok ? 'text-green-700 dark:text-green-400' : 'text-red-600'}
                  >
                    Row {r.row} ({r.email ?? '—'}): {r.ok ? 'OK' : r.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
