'use client';

import { useState, useTransition } from 'react';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Button, Field, Input } from '@/components/ui/Form';
import { useToast } from '@/components/ui/Toast';
import type { MasterType } from '@/lib/data/masters';
import { upsertMasterAction, setMasterActiveAction, bulkUploadMasterAction } from './actions';

export interface FieldSpec {
  key: string;
  label: string;
  type?: 'text' | 'number';
  required?: boolean;
  step?: string;
}

export interface MasterRecord {
  id: string;
  is_active: boolean;
  [key: string]: unknown;
}

/**
 * Generic master-data manager: a table of records + an add/edit form, driven by a
 * field spec. Writes go through the admin-gated, audited server actions
 * (upsertMasterAction / setMasterActiveAction → admin RPCs). "Delete" is a soft-delete
 * (is_active toggle), per RFP 4.3.
 */
export function MasterManager({
  masterType,
  title,
  fields,
  rows,
}: {
  masterType: MasterType;
  title: string;
  fields: FieldSpec[];
  rows: MasterRecord[];
}) {
  const { show } = useToast();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<MasterRecord | 'new' | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  function submitBulk(formData: FormData) {
    formData.set('type', masterType);
    startTransition(async () => {
      const res = await bulkUploadMasterAction({ result: null, error: null }, formData);
      if (res.error) show(res.error, 'error');
      else if (res.result) {
        show(`${res.result.ok} added, ${res.result.failed} failed`, res.result.failed ? 'warning' : 'success');
        if (!res.result.failed) setBulkOpen(false);
      }
    });
  }

  function submit(formData: FormData) {
    formData.set('type', masterType);
    startTransition(async () => {
      const res = await upsertMasterAction({ ok: false, error: null }, formData);
      if (res.ok) {
        show(`${title} saved`, 'success');
        setEditing(null);
      } else {
        show(res.error ?? 'Save failed', 'error');
      }
    });
  }

  function toggleActive(row: MasterRecord) {
    const fd = new FormData();
    fd.set('type', masterType);
    fd.set('id', row.id);
    fd.set('active', String(!row.is_active));
    startTransition(async () => {
      const res = await setMasterActiveAction({ ok: false, error: null }, fd);
      if (res.ok) show(row.is_active ? `${title} deactivated` : `${title} activated`, 'success');
      else show(res.error ?? 'Update failed', 'error');
    });
  }

  const columns: Column<MasterRecord>[] = [
    ...fields.map<Column<MasterRecord>>((f) => ({
      key: f.key,
      header: f.label,
      cell: (r) => String(r[f.key] ?? '—'),
    })),
    {
      key: 'is_active',
      header: 'Status',
      cell: (r) => (
        <span data-testid={`status-${r.id}`} className={r.is_active ? 'text-green-700 dark:text-green-400' : 'text-zinc-500'}>
          {r.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      cell: (r) => (
        <span className="flex justify-end gap-2">
          <Button variant="ghost" data-testid={`edit-${r.id}`} onClick={() => setEditing(r)}>
            Edit
          </Button>
          <Button
            variant="secondary"
            data-testid={`toggle-${r.id}`}
            onClick={() => toggleActive(r)}
            disabled={pending}
          >
            {r.is_active ? 'Deactivate' : 'Activate'}
          </Button>
        </span>
      ),
    },
  ];

  const current = editing === 'new' ? null : editing;

  return (
    <section className="space-y-3" data-testid={`master-${masterType}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">{title}</h2>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            data-testid={`bulk-${masterType}`}
            onClick={() => setBulkOpen((v) => !v)}
          >
            {bulkOpen ? 'Close bulk' : 'Bulk upload'}
          </Button>
          <Button data-testid={`add-${masterType}`} onClick={() => setEditing('new')}>
            Add
          </Button>
        </div>
      </div>

      {bulkOpen && (
        <form action={submitBulk} data-testid={`bulk-form-${masterType}`} className="space-y-2 rounded-lg border border-black/10 p-4 dark:border-white/15">
          <label htmlFor={`bulk-csv-${masterType}`} className="block text-sm font-medium">
            Paste CSV (header row + records)
          </label>
          <textarea
            id={`bulk-csv-${masterType}`}
            name="csv"
            rows={5}
            data-testid={`bulk-csv-${masterType}`}
            className="w-full rounded-md border border-black/15 bg-transparent p-2 font-mono text-xs outline-none focus:border-zinc-500 dark:border-white/20"
            placeholder={`Columns: ${fields.map((f) => f.key).join(', ')}, is_active`}
          />
          <Button type="submit" disabled={pending} data-testid={`bulk-submit-${masterType}`}>
            {pending ? 'Uploading…' : 'Upload'}
          </Button>
        </form>
      )}

      {editing !== null && (
        <form
          action={submit}
          data-testid={`form-${masterType}`}
          className="grid max-w-2xl gap-3 rounded-lg border border-black/10 p-4 sm:grid-cols-2 dark:border-white/15"
        >
          {current && <input type="hidden" name="id" value={current.id} />}
          {fields.map((f) => (
            <Field key={f.key} label={f.label} htmlFor={f.key} required={f.required}>
              <Input
                id={f.key}
                name={f.key}
                type={f.type ?? 'text'}
                step={f.step}
                required={f.required}
                defaultValue={current ? String(current[f.key] ?? '') : ''}
                data-testid={`input-${f.key}`}
              />
            </Field>
          ))}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={current ? Boolean(current.is_active) : true}
            />
            Active
          </label>
          <div className="flex items-end gap-2 sm:col-span-2">
            <Button type="submit" disabled={pending} data-testid={`save-${masterType}`}>
              {pending ? 'Saving…' : 'Save'}
            </Button>
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={pending}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        page={0}
        pageSize={rows.length || 1}
        total={rows.length}
        onPageChange={() => {}}
        emptyMessage={`No ${title.toLowerCase()} yet.`}
      />
    </section>
  );
}
