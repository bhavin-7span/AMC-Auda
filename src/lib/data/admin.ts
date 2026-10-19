import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

type Client = SupabaseClient<Database>;

/**
 * Typed wrappers for the Phase 1 admin-only RPCs (added in migrations m4_05_*).
 *
 * Every function here maps to a SECURITY DEFINER RPC that enforces the admin/dept_head
 * role internally and writes to audit_log on mutation (see .kiro/steering/backend.md).
 * This module is the single entry point for admin operations; prefer it over ad-hoc
 * supabase.rpc(...) calls so audit + authorization stay consistent.
 */

export interface AdminListResult<Row> {
  rows: Row[];
  total: number;
  page: number;
  page_size: number;
}

export interface AdminInspectionRow {
  id: string;
  ref_no: string;
  title: string;
  status: string;
  priority: string;
  department_id: string;
  inspection_type_id: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  scheduled_at: string;
}

export interface InspectionListFilters {
  search?: string | null;
  department?: string | null;
  type?: string | null;
  status?: string | null;
  assignedTo?: string | null;
  from?: string | null;
  to?: string | null;
  sort?: string;
  dir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

/** Page-number-paginated, filterable inspection list for admin screens (Phase 5). */
export async function adminListInspections(
  supabase: Client,
  f: InspectionListFilters = {},
): Promise<AdminListResult<AdminInspectionRow>> {
  const { data, error } = await supabase.rpc('admin_list_inspections', {
    p_search: f.search ?? undefined,
    p_department: f.department ?? undefined,
    p_type: f.type ?? undefined,
    p_status: f.status ?? undefined,
    p_assigned_to: f.assignedTo ?? undefined,
    p_from: f.from ?? undefined,
    p_to: f.to ?? undefined,
    p_sort: f.sort ?? 'created_at',
    p_dir: f.dir ?? 'desc',
    p_page: f.page ?? 0,
    p_page_size: f.pageSize ?? 20,
  });
  if (error) throw error;
  return data as unknown as AdminListResult<AdminInspectionRow>;
}

export interface AuditRow {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  before: unknown;
  after: unknown;
  source_ip: string | null;
  client: string | null;
  created_at: string;
}

export interface AuditSearchFilters {
  actor?: string | null;
  action?: string | null;
  entity?: string | null;
  from?: string | null;
  to?: string | null;
  page?: number;
  pageSize?: number;
}

/** Audit-log search for admin/dept_head (Phase 9). */
export async function adminAuditSearch(
  supabase: Client,
  f: AuditSearchFilters = {},
): Promise<AdminListResult<AuditRow>> {
  const { data, error } = await supabase.rpc('admin_audit_search', {
    p_actor: f.actor ?? undefined,
    p_action: f.action ?? undefined,
    p_entity: f.entity ?? undefined,
    p_from: f.from ?? undefined,
    p_to: f.to ?? undefined,
    p_page: f.page ?? 0,
    p_page_size: f.pageSize ?? 20,
  });
  if (error) throw error;
  return data as unknown as AdminListResult<AuditRow>;
}

export type StaffRole = 'field_officer' | 'supervisor' | 'dept_head' | 'admin';

export interface AdminUserRow {
  id: string;
  employee_id: string;
  full_name: string;
  email: string | null;
  face_enrolled_at: string | null;
  created_at: string;
  role: StaffRole;
  department_id: string | null;
  department_name: string | null;
  supervisor_id: string | null;
  role_updated_at: string | null;
}

export interface UserListFilters {
  search?: string | null;
  role?: StaffRole | null;
  department?: string | null;
  page?: number;
  pageSize?: number;
}

/** List users (employee_profiles + staff_roles) for admin screens (Phase 3). */
export async function adminListUsers(
  supabase: Client,
  f: UserListFilters = {},
): Promise<AdminListResult<AdminUserRow>> {
  const { data, error } = await supabase.rpc('admin_list_users', {
    p_search: f.search ?? undefined,
    p_role: f.role ?? undefined,
    p_department: f.department ?? undefined,
    p_page: f.page ?? 0,
    p_page_size: f.pageSize ?? 20,
  });
  if (error) throw error;
  return data as unknown as AdminListResult<AdminUserRow>;
}

export interface BulkUserRow {
  email: string;
  employee_id: string;
  full_name?: string;
  role?: StaffRole;
}

export interface BulkUploadResult {
  total: number;
  ok: number;
  failed: number;
  results: { row: number; email: string | null; ok: boolean; error?: string }[];
}

/**
 * Bulk upsert users (profile + role) for existing auth accounts, matched by email.
 * Returns per-row results. Does NOT create auth accounts (rows without one are reported
 * as errors). Admin only; audited server-side. (Phase 3.4)
 */
export async function adminBulkUploadUsers(
  supabase: Client,
  rows: BulkUserRow[],
): Promise<BulkUploadResult> {
  const { data, error } = await supabase.rpc('admin_bulk_upload_users', {
    p_rows: rows as never,
  });
  if (error) throw error;
  return data as unknown as BulkUploadResult;
}

/** Set a user's role/department/supervisor (Phase 3). Admin only; audited server-side. */
export async function adminSetRole(
  supabase: Client,
  args: { userId: string; role: StaffRole; departmentId?: string | null; supervisorId?: string | null },
) {
  const { data, error } = await supabase.rpc('admin_set_role', {
    p_user_id: args.userId,
    p_role: args.role,
    p_department: args.departmentId ?? undefined,
    p_supervisor: args.supervisorId ?? undefined,
  });
  if (error) throw error;
  return data;
}

/** Correct/override an attendance punch (Phase 6). Admin only; records history + audit. */
export async function adminCorrectAttendance(
  supabase: Client,
  args: {
    punchId: string;
    reason: string;
    punchType?: string | null;
    punchedAt?: string | null;
    insideGeofence?: boolean | null;
    workLocationId?: string | null;
  },
) {
  const { data, error } = await supabase.rpc('admin_correct_attendance', {
    p_punch_id: args.punchId,
    p_reason: args.reason,
    p_punch_type: args.punchType ?? undefined,
    p_punched_at: args.punchedAt ?? undefined,
    p_inside_geofence: args.insideGeofence ?? undefined,
    p_work_location_id: args.workLocationId ?? undefined,
  });
  if (error) throw error;
  return data;
}
