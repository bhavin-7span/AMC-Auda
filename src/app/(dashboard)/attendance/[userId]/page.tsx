import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  addDays,
  adminListAllAttendance,
  formatMinutes,
  getAttendanceRules,
  summarizeByDay,
  todayIST,
  type DaySummary,
} from '@/lib/data/attendance';
import { getAssignableStaff } from '@/lib/data/inspections';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RangePicker } from '../AttendanceFilters';
import { PunchLog } from '../PunchLog';
import { STATUS_BADGE, fmtDate, fmtTime } from '../format';

const MAX_RANGE_DAYS = 62;

function isDate(v: string | undefined): v is string {
  return Boolean(v && /^\d{4}-\d{2}-\d{2}$/.test(v));
}

/**
 * One employee's attendance (Phase 6): statistics for the range and, day by day, every
 * in/out punch with location, geo-fence result, flags and inline correction. Opened from
 * the day-wise list with `?date=` (shows the 7 days ending that date) or with `?from=&to=`.
 */
export default async function EmployeeAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ date?: string; from?: string; to?: string }>;
}) {
  const { userId } = await params;
  const sp = await searchParams;
  // createClient awaits connection(), so reading the clock below is request-time.
  const supabase = await createClient();
  const today = todayIST();

  let to = isDate(sp.to) ? sp.to : isDate(sp.date) ? sp.date : today;
  if (to > today) to = today;
  let from = isDate(sp.from) && sp.from <= to ? sp.from : addDays(to, -6);
  if (from < addDays(to, -(MAX_RANGE_DAYS - 1))) from = addDays(to, -(MAX_RANGE_DAYS - 1));

  let error: string | null = null;
  let days: DaySummary[] = [];
  let name: string | null = null;
  let employeeId: string | null = null;

  try {
    const [punches, rules, staff] = await Promise.all([
      adminListAllAttendance(supabase, { user: userId, dateFrom: from, dateTo: to }),
      getAttendanceRules(supabase),
      getAssignableStaff(supabase).catch(() => []),
    ]);
    days = summarizeByDay(punches, rules);
    const member = staff.find((s) => s.user_id === userId);
    name = member?.full_name ?? punches[0]?.full_name ?? null;
    employeeId = member?.employee_id ?? punches[0]?.employee_id ?? null;
  } catch (e) {
    error =
      e instanceof Error && /not authorized/i.test(e.message)
        ? 'You do not have permission to view attendance.'
        : 'Could not load attendance.';
  }

  const byDate = new Map(days.map((d) => [d.attendance_date, d]));
  const dates: string[] = [];
  for (let d = to; d >= from; d = addDays(d, -1)) dates.push(d);

  const totalWorked = days.reduce((n, d) => n + d.worked_minutes, 0);
  const summary = {
    present: days.length,
    absent: dates.length - days.length,
    halfDay: days.filter((d) => d.status === 'half_day').length,
    missingOut: days.filter((d) => d.status === 'missing_out').length,
    exceptions: days.reduce((n, d) => n + d.exception_count, 0),
    outside: days.reduce((n, d) => n + d.outside_count, 0),
    punches: days.reduce((n, d) => n + d.punch_count, 0),
  };
  const firstIns = days.map((d) => d.first_in).filter((t): t is string => Boolean(t));
  const avgFirstIn = firstIns.length
    ? (() => {
        // Average clock time of first check-in, in IST minutes past midnight.
        const mins = firstIns.map((t) => (Math.floor(new Date(t).getTime() / 60000) + 330) % 1440);
        const avg = Math.round(mins.reduce((a, b) => a + b, 0) / mins.length);
        const h = Math.floor(avg / 60);
        return `${h % 12 || 12}:${String(avg % 60).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
      })()
    : '—';

  const stats = [
    { title: 'Days present', value: `${summary.present} / ${dates.length}`, hint: `${summary.absent} absent` },
    { title: 'Total worked', value: formatMinutes(totalWorked), hint: `${summary.punches} punches` },
    {
      title: 'Avg. per day',
      value: formatMinutes(summary.present ? Math.round(totalWorked / summary.present) : 0),
      hint: 'Days present only',
    },
    { title: 'Avg. first in', value: avgFirstIn, hint: 'IST' },
    { title: 'Half day / missing out', value: `${summary.halfDay} / ${summary.missingOut}`, hint: '' },
    { title: 'Exceptions', value: summary.exceptions, hint: `${summary.outside} outside geo-fence` },
  ];

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2"
        nativeButton={false}
        render={<Link href={`/attendance${to !== today ? `?date=${to}` : ''}`} data-testid="back-to-attendance" />}
      >
        <ArrowLeft /> Day-wise attendance
      </Button>

      {error ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight" data-testid="employee-name">
                {name ?? 'Employee'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {employeeId ?? '—'} · {fmtDate(from)} – {fmtDate(to)}
              </p>
            </div>
            <RangePicker from={from} to={to} today={today} />
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6" data-testid="employee-stats">
            {stats.map((s) => (
              <Card key={s.title} size="sm">
                <CardHeader>
                  <CardDescription>{s.title}</CardDescription>
                  <CardTitle className="text-2xl font-semibold tabular-nums group-data-[size=sm]/card:text-2xl">{s.value}</CardTitle>
                </CardHeader>
                {s.hint && <CardContent className="text-xs text-muted-foreground">{s.hint}</CardContent>}
              </Card>
            ))}
          </div>

          <div className="space-y-6" data-testid="employee-days">
            {dates.map((date) => {
              const day = byDate.get(date);
              const status = STATUS_BADGE[day?.status ?? 'absent'];
              return (
                <Card key={date} size="sm" className="gap-0 py-0" data-testid={`day-${date}`}>
                  <CardHeader className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b bg-muted/50 py-3">
                    <CardTitle className="min-w-36">{fmtDate(date)}</CardTitle>
                    <Badge variant={status.variant}>{status.label}</Badge>
                    {day && (
                      <CardDescription className="flex flex-wrap gap-x-6 gap-y-1">
                        <span>
                          In <strong className="font-medium text-foreground tabular-nums">{fmtTime(day.first_in)}</strong>
                        </span>
                        <span>
                          Out <strong className="font-medium text-foreground tabular-nums">{fmtTime(day.last_out)}</strong>
                        </span>
                        <span>
                          Worked{' '}
                          <strong className="font-medium text-foreground tabular-nums">
                            {formatMinutes(day.worked_minutes)}
                          </strong>
                        </span>
                      </CardDescription>
                    )}
                    {day && day.exception_count > 0 && (
                      <Badge variant="destructive">
                        {day.exception_count} exception{day.exception_count === 1 ? '' : 's'}
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent className="px-0">
                    {day ? (
                      <PunchLog punches={day.punches} />
                    ) : (
                      <p className="px-4 py-3 text-sm text-muted-foreground">No punches recorded.</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
