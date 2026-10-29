import type { DayStatus } from '@/lib/data/attendance';

export function fmtTime(ts: string | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function fmtDateTime(ts: string): string {
  return new Date(ts).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

export function fmtDate(date: string, opts: Intl.DateTimeFormatOptions = {}): string {
  return new Date(`${date}T00:00:00+05:30`).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...opts,
  });
}

/** Label + shadcn Badge variant per day status. */
export const STATUS_BADGE: Record<
  DayStatus,
  { label: string; variant: 'success' | 'info' | 'warning' | 'destructive' }
> = {
  checked_in: { label: 'Checked in', variant: 'info' },
  present: { label: 'Present', variant: 'success' },
  half_day: { label: 'Half day', variant: 'warning' },
  missing_out: { label: 'Missing out', variant: 'warning' },
  absent: { label: 'Absent', variant: 'destructive' },
};

export const PUNCH_TYPES = ['in', 'out', 'break_start', 'break_end', 'field_duty_start', 'field_duty_end'];

const PUNCH_LABELS: Record<string, string> = {
  in: 'In',
  out: 'Out',
  break_start: 'Break start',
  break_end: 'Break end',
  field_duty_start: 'Field duty start',
  field_duty_end: 'Field duty end',
};

export function punchLabel(type: string): string {
  return PUNCH_LABELS[type] ?? type;
}
