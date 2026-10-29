'use client';

import { useState, useTransition } from 'react';
import { Search } from 'lucide-react';
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
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { setUserRoleAction } from './actions';
import type { AdminUserRow, StaffRole } from '@/lib/data/admin';

const ROLES: StaffRole[] = ['field_officer', 'supervisor', 'dept_head', 'admin'];
const ROLE_LABELS: Record<StaffRole, string> = {
  field_officer: 'Field Officer',
  supervisor: 'Supervisor',
  dept_head: 'Department Head',
  admin: 'Administrator',
};
const ROLE_ITEMS = ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }));

export interface DepartmentOption {
  id: string;
  name: string;
}

/**
 * Users list with live search and a per-row role/department edit dialog. Reads come from
 * admin_list_users (server); role changes go through the setUserRoleAction →
 * admin_set_role RPC (admin-gated, audited server-side). Paging via the page URL.
 */
export function UsersTable({
  rows,
  total,
  page,
  pageSize,
  departments,
}: {
  rows: AdminUserRow[];
  total: number;
  page: number;
  pageSize: number;
  departments: DepartmentOption[];
}) {
  const { search, setSearch } = useUrlFilters();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<AdminUserRow | null>(null);
  const [draftRole, setDraftRole] = useState<StaffRole>('field_officer');
  const [draftDept, setDraftDept] = useState<string>('');

  const deptItems = [{ value: '', label: '—' }, ...departments.map((d) => ({ value: d.id, label: d.name }))];
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);

  function goToPage(next: number) {
    const url = new URL(window.location.href);
    url.searchParams.set('page', String(next));
    window.location.href = url.toString();
  }

  function startEdit(row: AdminUserRow) {
    setEditing(row);
    setDraftRole(row.role);
    setDraftDept(row.department_id ?? '');
  }

  function save() {
    if (!editing) return;
    const fd = new FormData();
    fd.set('userId', editing.id);
    fd.set('role', draftRole);
    fd.set('departmentId', draftDept);
    startTransition(async () => {
      const res = await setUserRoleAction({ ok: false, error: null }, fd);
      if (res.ok) {
        toast.success('Role updated');
        setEditing(null);
      } else {
        toast.error(res.error ?? 'Could not update role');
      }
    });
  }

  const editForm = (row: AdminUserRow) => (
    <>
      <DialogHeader>
        <DialogTitle>Edit role</DialogTitle>
        <DialogDescription>
          {row.full_name || row.email} ({row.employee_id})
        </DialogDescription>
      </DialogHeader>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="edit-role">Role</FieldLabel>
          <Select items={ROLE_ITEMS} value={draftRole} onValueChange={(v) => v && setDraftRole(v as StaffRole)}>
            <SelectTrigger id="edit-role" aria-label="Role" data-testid={`role-select-${row.id}`} className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {ROLE_ITEMS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="edit-department">Department</FieldLabel>
          <Select items={deptItems} value={draftDept} onValueChange={(v) => setDraftDept(v == null ? '' : String(v))}>
            <SelectTrigger id="edit-department" aria-label="Department" className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {deptItems.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </FieldGroup>
      <div className="flex justify-end gap-2">
        <Button variant="outline" data-testid={`cancel-${row.id}`} onClick={() => setEditing(null)} disabled={pending}>
          Cancel
        </Button>
        <Button data-testid={`save-${row.id}`} onClick={save} disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </>
  );

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, employee ID or email"
            aria-label="Search by name, employee ID or email"
            data-testid="user-search"
            className="h-9 bg-card pl-8"
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card shadow-card" data-testid="data-table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Employee ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead className="pr-4 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground" data-testid="data-table-empty">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="pl-4">{r.employee_id}</TableCell>
                  <TableCell>{r.full_name || '—'}</TableCell>
                  <TableCell>{r.email || '—'}</TableCell>
                  <TableCell data-testid={`role-cell-${r.id}`}>{ROLE_LABELS[r.role]}</TableCell>
                  <TableCell>{r.department_name ?? '—'}</TableCell>
                  <TableCell className="pr-4 text-right">
                    <Dialog
                      open={editing?.id === r.id}
                      onOpenChange={(open) => {
                        if (pending) return;
                        if (open) startEdit(r);
                        else setEditing(null);
                      }}
                    >
                      <DialogTrigger render={<Button variant="ghost" size="sm" data-testid={`edit-${r.id}`} />}>
                        Edit
                      </DialogTrigger>
                      <DialogContent
                        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md"
                      >
                        {editForm(r)}
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span data-testid="data-table-range">
          {from}–{to} of {total}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" data-testid="page-prev" disabled={page <= 0} onClick={() => goToPage(page - 1)}>
            Previous
          </Button>
          <span data-testid="page-indicator">
            Page {page + 1} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            data-testid="page-next"
            disabled={page >= pageCount - 1}
            onClick={() => goToPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
