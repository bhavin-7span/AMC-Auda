import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

type Client = SupabaseClient<Database>;

/**
 * Typed data-access for field inspections (Phase 5).
 *
 * Reuses the existing inspection RPCs the mobile app uses (get_inspection_detail,
 * assign_inspection, transition_inspection, add_inspection_comment, get_team_locations)
 * plus the admin list/manager-action helpers. Every RPC enforces view/manage
 * authorization internally (inspection_can_view / inspection_can_manage); evidence and
 * events come back inside the detail payload.
 */

export interface InspectionDetailShape {
  inspection: Record<string, unknown> & {
    id: string;
    ref_no: string;
    title: string;
    status: string;
    priority: string;
    department_name?: string;
    type_name?: string;
    creator_name?: string | null;
    assignee_name?: string | null;
    latitude: number;
    longitude: number;
    gps_latitude?: number | null;
    gps_longitude?: number | null;
    location_name?: string | null;
    supervisor_remarks?: string | null;
    form_data?: Record<string, unknown>;
    scheduled_at?: string;
    created_at?: string;
  };
  can_manage: boolean;
  evidence: {
    id: string;
    media_type: 'photo' | 'video';
    storage_path: string;
    latitude: number | null;
    longitude: number | null;
    captured_at: string | null;
    is_mocked: boolean;
    clock_suspect: boolean;
  }[];
  events: {
    id: string;
    action: string;
    from_status: string | null;
    to_status: string | null;
    note: string | null;
    actor_name: string | null;
    assignee_name: string | null;
    created_at: string;
  }[];
  comments: {
    id: string;
    body: string;
    author_name: string | null;
    created_at: string;
  }[];
}

export async function getInspectionDetail(
  supabase: Client,
  id: string,
): Promise<InspectionDetailShape> {
  const { data, error } = await supabase.rpc('get_inspection_detail', { p_id: id });
  if (error) throw error;
  return data as unknown as InspectionDetailShape;
}

const EVIDENCE_BUCKET = 'inspection-evidence';

/**
 * Create short-lived signed URLs for evidence objects so private images/videos can be
 * displayed in the admin panel. Evidence lives in the private `inspection-evidence`
 * bucket; access is additionally gated by `inspection_evidence_readable` RLS. Returns a
 * map of storage_path → signed URL (paths that fail to sign are omitted).
 */
export async function signEvidenceUrls(
  supabase: Client,
  storagePaths: string[],
  expiresInSeconds = 3600,
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  if (storagePaths.length === 0) return out;

  const { data, error } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .createSignedUrls(storagePaths, expiresInSeconds);
  if (error) return out; // Non-fatal: detail page still renders without thumbnails.

  for (const item of data ?? []) {
    if (item.signedUrl && item.path) out[item.path] = item.signedUrl;
  }
  return out;
}

export interface ManagerAction {
  action: string;
  to_status: string;
  to_name: string;
  to_color: string | null;
}

export async function getManagerActions(
  supabase: Client,
  fromStatus: string,
): Promise<ManagerAction[]> {
  const { data, error } = await supabase.rpc('inspection_manager_actions', {
    p_from_status: fromStatus,
  });
  if (error) throw error;
  return data as unknown as ManagerAction[];
}

/** Assign/reassign an inspection to a staff member (manager-gated inside the RPC). */
export async function assignInspection(
  supabase: Client,
  args: { id: string; assignee: string; note?: string | null; eventId?: string },
) {
  const { data, error } = await supabase.rpc('assign_inspection', {
    p_id: args.id,
    p_assignee: args.assignee,
    p_note: args.note ?? undefined,
    p_event_id: args.eventId ?? crypto.randomUUID(),
  });
  if (error) throw error;
  return data;
}

/** Apply a workflow transition (approve / rework / start_review / close / assign). */
export async function transitionInspection(
  supabase: Client,
  args: { id: string; action: string; note?: string | null; eventId?: string },
) {
  const { data, error } = await supabase.rpc('transition_inspection', {
    p_id: args.id,
    p_action: args.action,
    p_note: args.note ?? undefined,
    p_event_id: args.eventId ?? crypto.randomUUID(),
  });
  if (error) throw error;
  return data;
}

export async function addInspectionComment(
  supabase: Client,
  args: { inspectionId: string; body: string },
) {
  const { data, error } = await supabase.rpc('add_inspection_comment', {
    p_id: crypto.randomUUID(),
    p_inspection_id: args.inspectionId,
    p_body: args.body,
    p_client_created_at: new Date().toISOString(),
  });
  if (error) throw error;
  return data;
}

export interface AssignableStaff {
  user_id: string;
  full_name: string;
  employee_id: string;
}

/**
 * get_assignable_staff rows carry the user's id as `id` (not `user_id`); normalize here so
 * every select posts a real user id instead of falling back to the option label.
 */
export async function getAssignableStaff(supabase: Client): Promise<AssignableStaff[]> {
  const { data, error } = await supabase.rpc('get_assignable_staff');
  if (error) throw error;
  const rows = (data as unknown as (Partial<AssignableStaff> & { id?: string })[]) ?? [];
  return rows
    .map((r) => ({
      user_id: r.user_id ?? r.id ?? '',
      full_name: r.full_name ?? '',
      employee_id: r.employee_id ?? '',
    }))
    .filter((r) => r.user_id);
}

export interface TeamLocation {
  user_id: string;
  full_name: string | null;
  latitude: number;
  longitude: number;
  recorded_at: string;
}

/** get_team_locations returns `{ members: TeamLocation[], server_time }` (role-scoped). */
export async function getTeamLocations(supabase: Client): Promise<TeamLocation[]> {
  const { data, error } = await supabase.rpc('get_team_locations');
  if (error) throw error;
  const members = (data as unknown as { members?: TeamLocation[] } | null)?.members;
  return Array.isArray(members) ? members : [];
}

export interface TravelReport {
  enabled: boolean;
  count: number;
  distance_m: number;
  points: { lat: number; lon: number; at: string; speed_mps: number | null; battery: number | null }[];
}

/**
 * Staff travel/activity report for a date (Phase 5.8). Gated server-side on
 * route_tracking_enabled; returns { enabled:false } when the feature is off so the UI can
 * explain rather than show empty data. Admin/dept_head/supervisor only.
 */
export async function getTravelReport(
  supabase: Client,
  userId: string,
  date: string,
): Promise<TravelReport> {
  const { data, error } = await supabase.rpc('admin_travel_report', {
    p_user: userId,
    p_date: date,
  });
  if (error) throw error;
  return data as unknown as TravelReport;
}

export interface NewInspection {
  title: string;
  departmentId: string;
  typeId: string;
  priority: string;
  locationName: string;
  latitude: number;
  longitude: number;
  /** ISO timestamp. */
  scheduledAt: string;
}

/**
 * Create an inspection via save_inspection (the same RPC the mobile app uses). The client
 * supplies the id and an idempotency op_id; the RPC validates the payload, department and
 * type, and authorizes the caller.
 */
export async function createInspection(supabase: Client, input: NewInspection): Promise<{ id: string; ref_no: string | null }> {
  const id = crypto.randomUUID();
  const { data, error } = await supabase.rpc('save_inspection', {
    p: {
      id,
      op_id: crypto.randomUUID(),
      title: input.title,
      department_id: input.departmentId,
      inspection_type_id: input.typeId,
      priority: input.priority,
      location_name: input.locationName,
      latitude: input.latitude,
      longitude: input.longitude,
      scheduled_at: input.scheduledAt,
      form_data: {},
    },
  });
  if (error) throw error;
  const row = (data ?? {}) as { id?: string; ref_no?: string; inspection?: { id?: string; ref_no?: string } };
  return { id: row.id ?? row.inspection?.id ?? id, ref_no: row.ref_no ?? row.inspection?.ref_no ?? null };
}
