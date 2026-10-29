'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { adminCorrectAttendance } from '@/lib/data/admin';
import { updateAttendanceRules } from '@/lib/data/attendance';

export interface AttendanceActionState {
  ok: boolean;
  error: string | null;
}

function cleanError(e: unknown): string {
  const m = e instanceof Error ? e.message : 'Operation failed.';
  if (/not authorized|permission/i.test(m)) return 'Not authorized.';
  if (/reason/i.test(m)) return 'A correction reason (min 3 characters) is required.';
  return m;
}

/**
 * Correct/override an attendance punch. Requires a reason; the admin_correct_attendance
 * RPC records before/after history and an audit_log entry atomically (admin only).
 */
export async function correctAttendanceAction(
  _prev: AttendanceActionState,
  formData: FormData,
): Promise<AttendanceActionState> {
  const punchId = String(formData.get('punchId') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();
  const punchType = (formData.get('punchType') as string) || null;
  const insideRaw = formData.get('insideGeofence');
  const insideGeofence =
    insideRaw === null || insideRaw === '' ? null : insideRaw === 'true';

  if (!punchId) return { ok: false, error: 'Missing punch.' };
  if (reason.length < 3) return { ok: false, error: 'A correction reason (min 3 characters) is required.' };

  try {
    const supabase = await createClient();
    await adminCorrectAttendance(supabase, {
      punchId,
      reason,
      punchType,
      insideGeofence,
    });
    revalidatePath('/attendance', 'layout');
    return { ok: true, error: null };
  } catch (e) {
    return { ok: false, error: cleanError(e) };
  }
}

/** Update the attendance rules singleton (admin only, audited). */
export async function updateRulesAction(
  _prev: AttendanceActionState,
  formData: FormData,
): Promise<AttendanceActionState> {
  const payload = {
    day_start_rule: String(formData.get('day_start_rule') ?? ''),
    day_end_rule: String(formData.get('day_end_rule') ?? ''),
    deduct_breaks: formData.get('deduct_breaks') === 'on',
    count_field_duty_as_work: formData.get('count_field_duty_as_work') === 'on',
    half_day_minutes: Number.parseInt(String(formData.get('half_day_minutes') ?? '0'), 10) || 0,
    shift_window_minutes:
      Number.parseInt(String(formData.get('shift_window_minutes') ?? '0'), 10) || 0,
  };

  try {
    const supabase = await createClient();
    await updateAttendanceRules(supabase, payload);
    revalidatePath('/attendance', 'layout');
    return { ok: true, error: null };
  } catch (e) {
    return { ok: false, error: cleanError(e) };
  }
}
