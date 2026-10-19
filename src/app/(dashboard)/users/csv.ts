import type { BulkUserRow, StaffRole } from '@/lib/data/admin';

const ROLES: StaffRole[] = ['field_officer', 'supervisor', 'dept_head', 'admin'];

/**
 * Parse CSV text with a header row into bulk user rows. Expected headers:
 * email, employee_id, full_name, role. Order-independent; unknown columns ignored.
 * Pure helper (no 'use server') so it can be imported by both server and client code.
 */
export function parseCsv(text: string): BulkUserRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const idx = (name: string) => headers.indexOf(name);
  const emailI = idx('email');
  const empI = idx('employee_id');
  const nameI = idx('full_name');
  const roleI = idx('role');

  const rows: BulkUserRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map((c) => c.trim());
    const roleRaw = roleI >= 0 ? (cells[roleI] as StaffRole) : undefined;
    rows.push({
      email: emailI >= 0 ? cells[emailI] : '',
      employee_id: empI >= 0 ? cells[empI] : '',
      full_name: nameI >= 0 ? cells[nameI] : undefined,
      role: roleRaw && ROLES.includes(roleRaw) ? roleRaw : undefined,
    });
  }
  return rows;
}
