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

/**
 * All punches matching the filters, paged through admin_list_attendance. The day-wise and
 * per-employee views aggregate in the app, so they need every punch in the range
 * rather than one page. Capped so a runaway range can't hammer the RPC.
 */
export async function adminListAllAttendance(
  supabase: Client,
  f: Omit<AttendanceFilters, 'page' | 'pageSize' | 'exceptionsOnly'>,
  maxPages = 20,
): Promise<AttendanceRow[]> {
  const pageSize = 500;
  const rows: AttendanceRow[] = [];
  for (let page = 0; page < maxPages; page++) {
    const res = await adminListAttendance(supabase, { ...f, page, pageSize });
    rows.push(...res.rows);
    if (res.rows.length < pageSize || rows.length >= res.total) break;
  }
  return rows.sort((a, b) => a.punched_at.localeCompare(b.punched_at));
}

export type DayStatus = 'checked_in' | 'present' | 'half_day' | 'missing_out' | 'absent';

export interface DaySummary {
  user_id: string;
  employee_id: string | null;
  full_name: string | null;
  attendance_date: string;
  first_in: string | null;
  last_out: string | null;
  worked_minutes: number;
  punch_count: number;
  exception_count: number;
  outside_count: number;
  status: DayStatus;
  /** Punches for the day, oldest first. */
  punches: AttendanceRow[];
}

const WORK_START = new Set(['in']);
const WORK_END = new Set(['out']);

/** Today's date in IST as YYYY-MM-DD (attendance_date is IST-based). */
export function todayIST(now = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

/** Shift a YYYY-MM-DD date by whole days. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Summarise one employee's punches for one attendance date. Worked time is the sum of
 * in→out sessions, minus breaks when the rules deduct them, plus field duty when the rules
 * count it as work. An open session counts up to `now` for today, and is flagged
 * "missing out" (not counted) on past days.
 */
export function summarizeDay(
  punches: AttendanceRow[],
  rules: AttendanceRules | null,
  now = new Date(),
): DaySummary {
  const sorted = [...punches].sort((a, b) => a.punched_at.localeCompare(b.punched_at));
  const first = sorted[0];
  const isToday = first.attendance_date === todayIST(now);
  const deductBreaks = rules?.deduct_breaks ?? true;
  const countFieldDuty = rules?.count_field_duty_as_work ?? true;

  let workStart: number | null = null;
  let breakStart: number | null = null;
  let fieldStart: number | null = null;
  let worked = 0;
  let firstIn: string | null = null;
  let lastOut: string | null = null;

  for (const p of sorted) {
    const t = new Date(p.punched_at).getTime();
    if (WORK_START.has(p.punch_type)) {
      firstIn ??= p.punched_at;
      if (workStart === null) workStart = t;
    } else if (WORK_END.has(p.punch_type)) {
      lastOut = p.punched_at;
      if (workStart !== null) worked += t - workStart;
      workStart = null;
    } else if (p.punch_type === 'break_start') {
      breakStart = t;
    } else if (p.punch_type === 'break_end') {
      if (breakStart !== null && workStart !== null && deductBreaks) worked -= t - breakStart;
      breakStart = null;
    } else if (p.punch_type === 'field_duty_start') {
      fieldStart = t;
    } else if (p.punch_type === 'field_duty_end') {
      // Field duty inside an open in-session is already counted.
      if (fieldStart !== null && workStart === null && countFieldDuty) worked += t - fieldStart;
      fieldStart = null;
    }
  }

  const open = workStart !== null;
  if (open && isToday) worked += now.getTime() - workStart!;
  const workedMinutes = Math.max(0, Math.round(worked / 60000));

  let status: DayStatus;
  if (open) status = isToday ? 'checked_in' : 'missing_out';
  else if (!firstIn) status = 'present';
  else if (rules && rules.half_day_minutes > 0 && workedMinutes < rules.half_day_minutes) status = 'half_day';
  else status = 'present';

  return {
    user_id: first.user_id,
    employee_id: first.employee_id,
    full_name: first.full_name,
    attendance_date: first.attendance_date,
    first_in: firstIn,
    // While checked in, an earlier check-out isn't the day's last out.
    last_out: open && isToday ? null : lastOut,
    worked_minutes: workedMinutes,
    punch_count: sorted.length,
    exception_count: sorted.filter((p) => p.is_exception).length,
    outside_count: sorted.filter((p) => !p.inside_geofence).length,
    status,
    punches: sorted,
  };
}

/** Group punches by employee + attendance date and summarise each group. */
export function summarizeByDay(
  punches: AttendanceRow[],
  rules: AttendanceRules | null,
  now = new Date(),
): DaySummary[] {
  const groups = new Map<string, AttendanceRow[]>();
  for (const p of punches) {
    const key = `${p.user_id}|${p.attendance_date}`;
    const list = groups.get(key);
    if (list) list.push(p);
    else groups.set(key, [p]);
  }
  return [...groups.values()].map((g) => summarizeDay(g, rules, now));
}

/** "7h 05m" style duration. */
export function formatMinutes(minutes: number): string {
  if (minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}
