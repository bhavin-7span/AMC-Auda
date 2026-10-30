import type { AuditRow } from '@/lib/data/admin';

/**
 * Plain-language rendering of audit_log rows for the Audit Trail screen. The log stores
 * machine codes (action, entity, raw before/after rows); this maps them to labels an
 * administrator can read. Unknown codes fall back to a humanised version of the code.
 */

/** id → display name for users, departments and master records referenced by a row. */
export type NameLookup = Record<string, string>;

export const ACTION_LABELS: Record<string, string> = {
  login: 'Signed in',
  export_report: 'Exported report',
  set_role: 'Updated user role',
  create_master: 'Added master record',
  update_master: 'Updated master record',
  activate_master: 'Activated master record',
  deactivate_master: 'Deactivated master record',
  create_challan: 'Created challan',
  update_challan: 'Updated challan',
  challan_issue: 'Issued challan',
  challan_pay: 'Marked challan paid',
  challan_cancel: 'Cancelled challan',
  attendance_correction: 'Corrected attendance',
  update_attendance_rules: 'Updated attendance rules',
};

export const ENTITY_LABELS: Record<string, string> = {
  'auth.users': 'User account',
  inspections: 'Inspections',
  staff_roles: 'User role',
  department: 'Department',
  inspection_type: 'Inspection type',
  shift: 'Shift',
  work_location: 'Work location',
  challan_type: 'Challan type',
  challans: 'Challan',
  attendance_punches: 'Attendance punch',
};

const ROLE_LABELS: Record<string, string> = {
  field_officer: 'Field Officer',
  supervisor: 'Supervisor',
  dept_head: 'Department Head',
  admin: 'Administrator',
};

const CLIENT_LABELS: Record<string, string> = { web: 'Web portal', mobile: 'Mobile app' };

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  code: 'Code',
  is_active: 'Active',
  role: 'Role',
  user_id: 'User',
  department_id: 'Department',
  department: 'Department',
  supervisor_id: 'Supervisor',
  status: 'Status',
  from: 'From',
  to: 'To',
  ref_no: 'Challan no.',
  amount: 'Amount',
  reason: 'Reason',
  violation: 'Violation',
  rule_section: 'Rule section',
  offender_name: 'Offender name',
  offender_contact: 'Offender contact',
  offender_address: 'Offender address',
  location_name: 'Location',
  challan_type_id: 'Challan type',
  issued_by: 'Issued by',
  issued_at: 'Issued on',
  paid_at: 'Paid on',
  cancelled_at: 'Cancelled on',
  punch_type: 'Punch type',
  punched_at: 'Punch time',
  punched_by: 'Recorded by',
  attendance_date: 'Attendance date',
  inside_geofence: 'Inside work area',
  work_location_id: 'Work location',
  shift_id: 'Shift',
};

/** Technical columns that mean nothing to an administrator. */
const HIDDEN_FIELDS = new Set([
  'id',
  'created_at',
  'updated_at',
  'notified_at',
  'name_i18n',
  'sort_order',
  'latitude',
  'longitude',
  'accuracy_m',
  'distance_to_site_m',
  'is_mocked',
  'clock_suspect',
  'temp_ref',
  'device_time',
  'client_captured_at',
  'captured_offline',
  'flags',
  'form_schema',
]);

function humanize(code: string): string {
  const words = code.replace(/[._/]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? humanize(action);
}

export function entityLabel(entity: string): string {
  return ENTITY_LABELS[entity] ?? humanize(entity);
}

export function roleLabel(role: string | null): string | null {
  return role ? (ROLE_LABELS[role] ?? humanize(role)) : null;
}

export function clientLabel(client: string | null): string | null {
  return client ? (CLIENT_LABELS[client] ?? humanize(client)) : null;
}

export function fmtDateTime(ts: string): string {
  return new Date(ts).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/**
 * The thing the action was performed on, e.g. "Challan CH-2026-0012" or
 * "Department · Engineering". Null when the row has no meaningful target (sign-in).
 */
export function recordLabel(row: AuditRow, names: NameLookup): string | null {
  const data = asRecord(row.after) ?? asRecord(row.before) ?? {};
  const kind = entityLabel(row.entity);
  switch (row.entity) {
    case 'auth.users':
      return null;
    case 'inspections':
      return row.action === 'export_report' && row.entity_id
        ? `Inspections report (${row.entity_id.toUpperCase()})`
        : kind;
    case 'staff_roles': {
      const userId = (data.user_id as string | undefined) ?? row.entity_id;
      return userId && names[userId] ? names[userId] : kind;
    }
    case 'challans':
      return typeof data.ref_no === 'string' && data.ref_no ? `Challan ${data.ref_no}` : kind;
    case 'attendance_punches': {
      const userId = data.user_id as string | undefined;
      return userId && names[userId] ? `Attendance · ${names[userId]}` : kind;
    }
  }
  const name =
    (typeof data.name === 'string' && data.name) || (row.entity_id ? names[row.entity_id] : undefined);
  return name ? `${kind} · ${name}` : kind;
}

function looksLikeTimestamp(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v);
}

function formatValue(key: string, value: unknown, names: NameLookup): string | null {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    return key === 'amount' ? `₹${value.toLocaleString('en-IN')}` : value.toLocaleString('en-IN');
  }
  if (typeof value !== 'string') return null;
  if (key.endsWith('_id') || key === 'issued_by' || key === 'punched_by' || key === 'department') {
    return names[value] ?? null;
  }
  if (key === 'role') return roleLabel(value);
  if (key === 'status' || key === 'punch_type') return humanize(value);
  if (looksLikeTimestamp(value)) return fmtDateTime(value);
  return value;
}

export interface AuditChange {
  field: string;
  before: string | null;
  after: string | null;
}

function visible(key: string): boolean {
  return !HIDDEN_FIELDS.has(key) && !key.endsWith('_path') && !key.startsWith('face_');
}

/**
 * Readable field-level summary of a row. For edits it lists only the fields whose value
 * changed; for creates/exports it lists the recorded values (before is null). Fields whose
 * value cannot be shown meaningfully (unresolved ids, nested JSON) are left out.
 */
export function describeChanges(row: AuditRow, names: NameLookup): AuditChange[] {
  const before = asRecord(row.before);
  const after = asRecord(row.after);
  if (!before && !after) return [];

  const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])].filter(visible);
  const changes: AuditChange[] = [];
  for (const key of keys) {
    const b = before?.[key];
    const a = after?.[key];
    if (before && after && JSON.stringify(b) === JSON.stringify(a)) continue;
    const bText = before ? formatValue(key, b, names) : null;
    const aText = after ? formatValue(key, a, names) : null;
    // Skip values we could not turn into something readable.
    if ((before && bText === null) || (after && aText === null)) continue;
    // A create/export with an empty field adds nothing.
    if (!before && aText === '—') continue;
    changes.push({ field: FIELD_LABELS[key] ?? humanize(key), before: bText, after: aText });
  }
  return changes;
}

/** Every id a page of rows may need a name for (actors, users, departments, masters). */
export function referencedIds(rows: AuditRow[]): { people: string[]; departments: string[]; masters: Record<string, string[]> } {
  const people = new Set<string>();
  const departments = new Set<string>();
  const masters: Record<string, Set<string>> = {};
  const add = (bucket: Set<string>, v: unknown) => {
    if (typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v)) bucket.add(v);
  };
  for (const r of rows) {
    add(people, r.actor_id);
    if (r.entity === 'staff_roles') add(people, r.entity_id);
    if (r.entity in MASTER_TABLES && r.entity_id) {
      add((masters[r.entity] ??= new Set()), r.entity_id);
    }
    for (const data of [asRecord(r.before), asRecord(r.after)]) {
      if (!data) continue;
      for (const key of ['user_id', 'supervisor_id', 'issued_by', 'punched_by']) add(people, data[key]);
      add(departments, data.department_id);
      add(departments, data.department);
      add((masters.challan_type ??= new Set()), data.challan_type_id);
      add((masters.work_location ??= new Set()), data.work_location_id);
      add((masters.shift ??= new Set()), data.shift_id);
    }
  }
  return {
    people: [...people],
    departments: [...departments],
    masters: Object.fromEntries(Object.entries(masters).map(([k, v]) => [k, [...v]])),
  };
}

/** Audit entity code → master table holding its `name`. */
export const MASTER_TABLES = {
  department: 'departments',
  inspection_type: 'inspection_types',
  shift: 'shifts',
  work_location: 'work_locations',
  challan_type: 'challan_types',
} as const;
