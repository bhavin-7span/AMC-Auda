import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import type { AdminListResult } from './admin';

type Client = SupabaseClient<Database>;

/**
 * Typed data-access for attendance administration (Phase 6).
 *
 * attendance_punches SELECT is self-only, so monitoring others goes through the
 * admin-gated admin_list_attendance RPC. Corrections use admin_correct_attendance
 * (Phase 1.2, records history + audit). Rules config uses admin_update_attendance_rules.
 */

export interface AttendanceRow {
  id: string;
  user_id: string;
  employee_id: string | null;
  full_name: string | null;
  punch_type: string;
  punched_at: string;
  attendance_date: string;
  latitude: number;
  longitude: number;
  accuracy_m: number | null;
  inside_geofence: boolean;
  distance_to_site_m: number | null;
  work_location_id: string | null;
  work_location_name: string | null;
  face_distance: number | null;
  selfie_path: string | null;
  is_mocked: boolean;
  captured_offline: boolean;
  clock_suspect: boolean;
  flags: string[];
  is_exception: boolean;
}

export interface AttendanceFilters {
  user?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  exceptionsOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export async function adminListAttendance(
  supabase: Client,
  f: AttendanceFilters = {},
): Promise<AdminListResult<AttendanceRow>> {
  const { data, error } = await supabase.rpc('admin_list_attendance', {
    p_user: f.user ?? undefined,
    p_date_from: f.dateFrom ?? undefined,
    p_date_to: f.dateTo ?? undefined,
    p_exceptions_only: f.exceptionsOnly ?? false,
    p_page: f.page ?? 0,
    p_page_size: f.pageSize ?? 20,
  });
  if (error) throw error;
  return data as unknown as AdminListResult<AttendanceRow>;
}

export interface AttendanceRules {
  id: number;
  timezone: string;
  day_start_rule: string;
  day_end_rule: string;
  deduct_breaks: boolean;
  count_field_duty_as_work: boolean;
  half_day_minutes: number;
  shift_window_minutes: number;
}

export async function getAttendanceRules(supabase: Client): Promise<AttendanceRules | null> {
  const { data, error } = await supabase
    .from('attendance_rules')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  return data as AttendanceRules | null;
}

export async function updateAttendanceRules(
  supabase: Client,
  payload: Partial<AttendanceRules>,
) {
  const { data, error } = await supabase.rpc('admin_update_attendance_rules', {
    p_payload: payload as never,
  });
  if (error) throw error;
  return data;
}
