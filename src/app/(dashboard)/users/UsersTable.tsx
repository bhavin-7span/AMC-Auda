'use client';

import { useState, useTransition } from 'react';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Button, Select } from '@/components/ui/Form';
import { useToast } from '@/components/ui/Toast';
import { setUserRoleAction } from './actions';
import type { AdminUserRow, StaffRole } from '@/lib/data/admin';

const ROLES: StaffRole[] = ['field_officer', 'supervisor', 'dept_head', 'admin'];
const ROLE_LABELS: Record<StaffRole, string> = {
  field_officer: 'Field Officer',
  supervisor: 'Supervisor',
  dept_head: 'Department Head',
  admin: 'Administrator',
};

export interface DepartmentOption {
  id: string;
  name: string;
}

/**
 * Users list with inline role editing. Reads come from admin_list_users (server);
 * role changes go through the setUserRoleAction → admin_set_role RPC (admin-gated,
 * audited server-side). Paging is driven by server round-trips via the page URL.
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
  const { show } = useToast();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [draftRole, setDraftRole] = useState<StaffRole>('field_officer');
  const [draftDept, setDraftDept] = useState<string>('');

  function goToPage(next: number) {
    const url = new URL(window.location.href);
    url.searchParams.set('page', String(next));
    window.location.href = url.toString();
  }

  function startEdit(row: AdminUserRow) {
    setEditing(row.id);
    setDraftRole(row.role);
    setDraftDept(row.department_id ?? '');
  }

  function save(userId: string) {
    const fd = new FormData();
    fd.set('userId', userId);
    fd.set('role', draftRole);
    fd.set('departmentId', draftDept);
    startTransition(async () => {
      const res = await setUserRoleAction({ ok: false, error: null }, fd);
      if (res.ok) {
        show('Role updated', 'success');
        setEditing(null);
      } else {
        show(res.error ?? 'Could not update role', 'error');
      }
    });
  }

  const columns: Column<AdminUserRow>[] = [
    { key: 'employee_id', header: 'Employee ID', cell: (r) => r.employee_id },
    { key: 'full_name', header: 'Name', cell: (r) => r.full_name || '—' },
    { key: 'email', header: 'Email', cell: (r) => r.email || '—' },
    {
      key: 'role',
      header: 'Role',
      cell: (r) =>
        editing === r.id ? (
          <Select
            aria-label="Role"
            data-testid={`role-select-${r.id}`}
            value={draftRole}
            onChange={(e) => setDraftRole(e.target.value as StaffRole)}
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </Select>
        ) : (
          <span data-testid={`role-cell-${r.id}`}>{ROLE_LABELS[r.role]}</span>
        ),
    },
    {
      key: 'department',
      header: 'Department',
      cell: (r) =>
        editing === r.id ? (
          <Select
            aria-label="Department"
            value={draftDept}
            onChange={(e) => setDraftDept(e.target.value)}
          >
            <option value="">—</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        ) : (
          (r.department_name ?? '—')
        ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      cell: (r) =>
        editing === r.id ? (
          <span className="flex justify-end gap-2">
            <Button
              variant="secondary"
              data-testid={`cancel-${r.id}`}
              onClick={() => setEditing(null)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button data-testid={`save-${r.id}`} onClick={() => save(r.id)} disabled={pending}>
              {pending ? 'Saving…' : 'Save'}
            </Button>
          </span>
        ) : (
          <Button
            variant="ghost"
            data-testid={`edit-${r.id}`}
            onClick={() => startEdit(r)}
          >
            Edit
          </Button>
        ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      page={page}
      pageSize={pageSize}
      total={total}
      onPageChange={goToPage}
      emptyMessage="No users found."
    />
  );
}
