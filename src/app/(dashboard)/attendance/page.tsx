import { Hourglass, LogIn, Timer, TriangleAlert, UserCheck, UserX } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import {
  adminListAllAttendance,
  formatMinutes,
  getAttendanceRules,
  summarizeByDay,
  todayIST,
  type AttendanceRules,
} from '@/lib/data/attendance';
import { getAssignableStaff } from '@/lib/data/inspections';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { DayPicker, EmployeeSearch, StatusTabs } from './AttendanceFilters';
import { RulesForm } from './RulesForm';
import { DayTable, type DailyRow } from './DayTable';
import { fmtDate } from './format';

const PAGE_SIZE = 20;

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'present', label: 'Present' },
  { key: 'checked_in', label: 'Checked in' },
  { key: 'absent', label: 'Absent' },
  { key: 'exceptions', label: 'Exceptions' },
] as const;
type Tab = (typeof TABS)[number]['key'];


/**
 * GPS attendance administration & monitoring (Phase 6), day-wise. For the selected date
 * every employee gets one row (first in, last out, worked time, exceptions) plus day
 * statistics; the employee opens their in/out punch log at /attendance/[userId]. Punches
 * come from the admin-gated admin_list_attendance RPC and are aggregated here; staff
 * without punches are shown as absent. Rules config (6.3) stays on this page.
 */
export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; date?: string; status?: string; exceptions?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(0, Number.parseInt(sp.page ?? '0', 10) || 0);
  // createClient awaits connection(), so reading the clock below is request-time.
  const supabase = await createClient();
  const today = todayIST();
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) && sp.date <= today ? sp.date : today;
  const tab: Tab =
    sp.exceptions === '1' ? 'exceptions' : (TABS.find((t) => t.key === sp.status)?.key ?? 'all');
  const q = (sp.q ?? '').trim().toLowerCase();

  let error: string | null = null;
  let all: DailyRow[] = [];
  let rules: AttendanceRules | null = null;

  try {
    const [punches, rulesRow, staff] = await Promise.all([
      adminListAllAttendance(supabase, { dateFrom: date, dateTo: date }),
      getAttendanceRules(supabase),
      // Staff list only adds absentees; never fail the view if it can't load.
      getAssignableStaff(supabase).catch(() => []),
    ]);
    rules = rulesRow;
    const summaries = summarizeByDay(punches, rules);
    const seen = new Set(summaries.map((s) => s.user_id));
    all = [
      // Punches stay on the server; the table only needs the day totals.
      ...summaries.map<DailyRow>((s) => ({
        user_id: s.user_id,
        full_name: s.full_name,
        employee_id: s.employee_id,
        status: s.status,
        first_in: s.first_in,
        last_out: s.last_out,
        worked_minutes: s.worked_minutes,
        punch_count: s.punch_count,
        exception_count: s.exception_count,
        outside_count: s.outside_count,
      })),
      ...staff
        .filter((s) => !seen.has(s.user_id))
        .map<DailyRow>((s) => ({
          user_id: s.user_id,
          full_name: s.full_name,
          employee_id: s.employee_id,
          status: 'absent',
          first_in: null,
          last_out: null,
          worked_minutes: 0,
          punch_count: 0,
          exception_count: 0,
          outside_count: 0,
        })),
    ].sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? ''));
  } catch (e) {
    error =
      e instanceof Error && /not authorized/i.test(e.message)
        ? 'You do not have permission to view attendance.'
        : 'Could not load attendance.';
  }

  const present = all.filter((r) => r.status !== 'absent');
  const counts: Record<Tab, number> = {
    all: all.length,
    present: present.length,
    checked_in: all.filter((r) => r.status === 'checked_in').length,
    absent: all.length - present.length,
    exceptions: all.filter((r) => r.exception_count > 0).length,
  };
  const halfDay = all.filter((r) => r.status === 'half_day').length;
  const missingOut = all.filter((r) => r.status === 'missing_out').length;
  const exceptionPunches = all.reduce((n, r) => n + r.exception_count, 0);
  const avgWorked = present.length
    ? Math.round(present.reduce((n, r) => n + r.worked_minutes, 0) / present.length)
    : 0;
  const rate = all.length ? Math.round((present.length / all.length) * 100) : 0;

  const stats = [
    { title: 'Present', value: `${present.length} / ${all.length}`, hint: `${rate}% attendance`, icon: UserCheck, tone: 'bg-success-soft text-success' },
    { title: 'Checked in now', value: counts.checked_in, hint: date === today ? 'No check-out yet' : 'Past day', icon: LogIn, tone: 'bg-info-soft text-info' },
    { title: 'Absent', value: counts.absent, hint: 'No punches for the day', icon: UserX, tone: 'bg-destructive-soft text-destructive' },
    { title: 'Avg. worked', value: formatMinutes(avgWorked), hint: 'Per present employee', icon: Timer, tone: 'bg-info-soft text-info' },
    {
      title: 'Half day / missing out',
      value: `${halfDay} / ${missingOut}`,
      hint: rules ? `Half day under ${formatMinutes(rules.half_day_minutes)}` : '',
      icon: Hourglass,
      tone: 'bg-warning-soft text-warning',
    },
    {
      title: 'Exceptions',
      value: exceptionPunches,
      hint: `${counts.exceptions} employee${counts.exceptions === 1 ? '' : 's'} affected`,
      icon: TriangleAlert,
      tone: 'bg-destructive-soft text-destructive',
    },
  ];

  const matchesTab = (r: DailyRow) => {
    switch (tab) {
      case 'present':
        return r.status !== 'absent';
      case 'checked_in':
        return r.status === 'checked_in';
      case 'absent':
        return r.status === 'absent';
      case 'exceptions':
        return r.exception_count > 0;
      default:
        return true;
    }
  };
  const filtered = all.filter(
    (r) =>
      matchesTab(r) &&
      (!q || `${r.full_name ?? ''} ${r.employee_id ?? ''}`.toLowerCase().includes(q)),
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function pageHref(next: number) {
    const params = new URLSearchParams(
      Object.entries(sp).filter((e): e is [string, string] => Boolean(e[1]) && e[0] !== 'page'),
    );
    if (next > 0) params.set('page', String(next));
    const qs = params.toString();
    return `/attendance${qs ? `?${qs}` : ''}`;
  }

  if (error) {
    return (
      <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {error}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6" data-testid="attendance-stats">
        {stats.map((s) => (
          <Card key={s.title} size="sm">
            <CardHeader>
              <span className={`mb-2 flex size-8 items-center justify-center rounded-md ${s.tone}`}>
                <s.icon className="size-4" />
              </span>
              <CardDescription>{s.title}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums group-data-[size=sm]/card:text-2xl">{s.value}</CardTitle>
            </CardHeader>
            {s.hint && <CardContent className="text-xs text-muted-foreground">{s.hint}</CardContent>}
          </Card>
        ))}
      </div>

      <Card className="gap-0 py-0">
        <div className="border-b px-4">
          <StatusTabs value={tab} tabs={TABS.map((t) => ({ ...t, count: counts[t.key] }))} />
        </div>
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <EmployeeSearch value={sp.q ?? ''} />
          <div className="ml-auto flex flex-wrap items-center gap-3">
            <div className="text-right leading-tight">
              <p className="text-sm font-medium" data-testid="attendance-day">
                {fmtDate(date, { weekday: 'long' })}
              </p>
              {date === today && <p className="text-xs text-success">Today · live</p>}
            </div>
            <DayPicker date={date} today={today} />
          </div>
        </div>
        <DayTable rows={rows} date={date} />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm text-muted-foreground">
          <span data-testid="data-table-range">
            Showing {filtered.length ? page * PAGE_SIZE + 1 : 0}–{Math.min(filtered.length, (page + 1) * PAGE_SIZE)} of{' '}
            {filtered.length} records
          </span>
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href={pageHref(page - 1)}
                  aria-disabled={page <= 0}
                  className={page <= 0 ? 'pointer-events-none opacity-50' : undefined}
                />
              </PaginationItem>
              {Array.from({ length: pageCount }, (_, i) => i)
                .filter((i) => Math.abs(i - page) <= 2 || i === 0 || i === pageCount - 1)
                .map((i, idx, shown) => (
                  <PaginationItem key={i} className="flex items-center">
                    {idx > 0 && i - shown[idx - 1] > 1 && <PaginationEllipsis />}
                    <PaginationLink
                      href={pageHref(i)}
                      isActive={i === page}
                      className={i === page ? 'border-info bg-info-soft text-info' : undefined}
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
              <PaginationItem className="sr-only" data-testid="page-indicator">
                Page {page + 1} of {pageCount}
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href={pageHref(page + 1)}
                  aria-disabled={page >= pageCount - 1}
                  className={page >= pageCount - 1 ? 'pointer-events-none opacity-50' : undefined}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </Card>

      {rules ? (
        <RulesForm rules={rules} />
      ) : (
        <p className="text-sm text-muted-foreground">Attendance rules not configured.</p>
      )}
    </div>
  );
}
