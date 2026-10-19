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

export async function getAssignableStaff(supabase: Client): Promise<AssignableStaff[]> {
  const { data, error } = await supabase.rpc('get_assignable_staff');
  if (error) throw error;
  return (data as unknown as AssignableStaff[]) ?? [];
}

export interface TeamLocation {
  user_id: string;
  full_name: string | null;
  latitude: number;
  longitude: number;
  recorded_at: string;
}

export async function getTeamLocations(supabase: Client): Promise<TeamLocation[]> {
  const { data, error } = await supabase.rpc('get_team_locations');
  if (error) throw error;
  return (data as unknown as TeamLocation[]) ?? [];
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
