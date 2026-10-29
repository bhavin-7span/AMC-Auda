'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
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
 * Generic master-data manager: a table of records with add/edit and bulk-upload dialogs,
 * driven by a field spec. Writes go through the admin-gated, audited server actions
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
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<MasterRecord | 'new' | null>(null);
  const [active, setActive] = useState(true);
  const [bulkOpen, setBulkOpen] = useState(false);

  function openEdit(row: MasterRecord | 'new') {
    setEditing(row);
    setActive(row === 'new' ? true : Boolean(row.is_active));
  }

  function submitBulk(formData: FormData) {
    formData.set('type', masterType);
    startTransition(async () => {
      const res = await bulkUploadMasterAction({ result: null, error: null }, formData);
      if (res.error) toast.error(res.error);
      else if (res.result) {
        const msg = `${res.result.ok} added, ${res.result.failed} failed`;
        if (res.result.failed) toast.warning(msg);
        else {
          toast.success(msg);
          setBulkOpen(false);
        }
      }
    });
  }

  function submit(formData: FormData) {
    formData.set('type', masterType);
    if (editing && editing !== 'new') formData.set('id', editing.id);
    // The action reads is_active as "on" when checked; the shadcn Checkbox is controlled.
    if (active) formData.set('is_active', 'on');
    else formData.delete('is_active');
    startTransition(async () => {
      const res = await upsertMasterAction({ ok: false, error: null }, formData);
      if (res.ok) {
        toast.success(`${title} saved`);
        setEditing(null);
      } else {
        toast.error(res.error ?? 'Save failed');
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
      if (res.ok) toast.success(row.is_active ? `${title} deactivated` : `${title} activated`);
      else toast.error(res.error ?? 'Update failed');
    });
  }

  // Shared by the "Add" dialog (current = null) and each row's "Edit" dialog.
  const editForm = (current: MasterRecord | null) => (
    <form action={submit} data-testid={`form-${masterType}`} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>
          {current ? 'Edit' : 'Add'} {title.toLowerCase()}
        </DialogTitle>
        <DialogDescription>Changes are audited.</DialogDescription>
      </DialogHeader>
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <Field key={f.key}>
            <FieldLabel htmlFor={`${masterType}-${f.key}`}>
              {f.label}
              {f.required && <span className="text-destructive">*</span>}
            </FieldLabel>
            <Input
              id={`${masterType}-${f.key}`}
              name={f.key}
              type={f.type ?? 'text'}
              step={f.step}
              required={f.required}
              defaultValue={current ? String(current[f.key] ?? '') : ''}
              data-testid={`input-${f.key}`}
            />
          </Field>
        ))}
        <Label className="font-normal sm:col-span-2">
          <Checkbox checked={active} onCheckedChange={setActive} /> Active
        </Label>
      </FieldGroup>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => setEditing(null)} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending} data-testid={`save-${masterType}`}>
          {pending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  );

  const editDialogProps = (target: MasterRecord | 'new') => ({
    open: target === 'new' ? editing === 'new' : editing !== 'new' && editing?.id === target.id,
    onOpenChange: (open: boolean) => {
      if (pending) return;
      if (open) openEdit(target);
      else setEditing(null);
    },
  });

  return (
    <Card data-testid={`master-${masterType}`}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardAction className="flex gap-2">
          <Dialog open={bulkOpen} onOpenChange={(open) => !pending && setBulkOpen(open)}>
            <DialogTrigger render={<Button variant="outline" data-testid={`bulk-${masterType}`} />}>
              Bulk upload
            </DialogTrigger>
            <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
              <form action={submitBulk} data-testid={`bulk-form-${masterType}`} className="grid gap-4">
                <DialogHeader>
                  <DialogTitle>Bulk upload {title.toLowerCase()}</DialogTitle>
                  <DialogDescription>Paste CSV with a header row followed by records.</DialogDescription>
                </DialogHeader>
                <Field>
                  <FieldLabel htmlFor={`bulk-csv-${masterType}`}>CSV</FieldLabel>
                  <Textarea
                    id={`bulk-csv-${masterType}`}
                    name="csv"
                    rows={6}
                    data-testid={`bulk-csv-${masterType}`}
                    className="font-mono text-xs"
                    placeholder={`Columns: ${fields.map((f) => f.key).join(', ')}, is_active`}
                  />
                </Field>
                <div className="flex justify-end gap-2">
                  <Button type="submit" disabled={pending} data-testid={`bulk-submit-${masterType}`}>
                    {pending ? 'Uploading…' : 'Upload'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog {...editDialogProps('new')}>
            <DialogTrigger render={<Button data-testid={`add-${masterType}`} />}>Add</DialogTrigger>
            <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
              {editForm(null)}
            </DialogContent>
          </Dialog>
        </CardAction>
      </CardHeader>
      <CardContent className="px-0">
        <Table data-testid="data-table">
          <TableHeader>
            <TableRow>
              {fields.map((f, i) => (
                <TableHead key={f.key} className={i === 0 ? 'pl-4' : undefined}>
                  {f.label}
                </TableHead>
              ))}
              <TableHead>Status</TableHead>
              <TableHead className="pr-4 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={fields.length + 2} className="py-8 text-center text-muted-foreground" data-testid="data-table-empty">
                  No {title.toLowerCase()} yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  {fields.map((f, i) => (
                    <TableCell key={f.key} className={i === 0 ? 'pl-4' : undefined}>
                      {String(r[f.key] ?? '—')}
                    </TableCell>
                  ))}
                  <TableCell>
                    <Badge variant={r.is_active ? 'success' : 'outline'} data-testid={`status-${r.id}`}>
                      {r.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Dialog {...editDialogProps(r)}>
                        <DialogTrigger render={<Button variant="ghost" size="sm" data-testid={`edit-${r.id}`} />}>
                          Edit
                        </DialogTrigger>
                        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
                          {editForm(r)}
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid={`toggle-${r.id}`}
                        onClick={() => toggleActive(r)}
                        disabled={pending}
                      >
                        {r.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
