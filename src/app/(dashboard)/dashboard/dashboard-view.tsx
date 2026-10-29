'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { startTransition, useEffect, useState, type ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  FileCheck,
  Map as MapIcon,
  RotateCcw,
  ShieldCheck,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  getDashboardWidgets,
  getInspectionTrend,
  type DashboardWidgets,
  type TrendPoint,
} from '@/lib/data/dashboard';
import { adminAuditSearch, adminListInspections, type AdminInspectionRow, type AuditRow } from '@/lib/data/admin';
import {
  adminListAllAttendance,
  getAttendanceRules,
  summarizeByDay,
  todayIST,
  type DayStatus,
} from '@/lib/data/attendance';
import { getAssignableStaff, getTeamLocations } from '@/lib/data/inspections';
import { getSystemHealth, type SystemHealth } from '@/lib/data/notifications';
import { PageActions } from '@/components/shell/Topbar';
import { MapContainer } from '@/components/ui/MapContainer';
import type { MapPoint } from '@/components/ui/map-types';
import { PageLoader } from '@/components/ui/page-loader';
import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreateInspectionDialog } from '../inspections/CreateInspectionDialog';
import { DashboardFilters, type DeptOption } from './DashboardFilters';
import { ActivityChart, PercentRing, STATUSES, StatusDonut } from './dashboard-charts';

const RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '14', label: 'Last 14 days' },
  { value: '30', label: 'Last 30 days' },
];

interface AttendanceToday {
  staff: number;
  counts: Record<DayStatus, number>;
  exceptionPunches: number;
  exceptionEmployees: number;
}

interface DeptPerformance {
  id: string;
  name: string;
  total: number;
  done: number;
}

interface DashboardData {
  widgets: DashboardWidgets;
  departments: DeptOption[];
  deptPerformance: DeptPerformance[];
  staffPoints: MapPoint[];
  recent: AdminInspectionRow[];
  typeNames: Map<string, string>;
  staffNames: Map<string, string>;
  attendance: AttendanceToday | null;
  health: SystemHealth | null;
  audit: AuditRow[];
}

const statusMeta = (code: string) => STATUSES.find((s) => s.code === code);
const humanize = (s: string) => s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
const fmtWhen = (ts: string) =>
  new Date(ts).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?';

/**
 * Field-operations dashboard. Every widget reads live, role-scoped data after hydration
 * (so prerender never reads the session clock). Optional widgets (attendance, system
 * health, audit) degrade to a note when the caller's role cannot read them.
 */
export function DashboardView() {
  const searchParams = useSearchParams();
  const department = searchParams.get('department') ?? undefined;
  const from = searchParams.get('from') ?? undefined;
  const to = searchParams.get('to') ?? undefined;
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [range, setRange] = useState('7');
  const [trend, setTrend] = useState<TrendPoint[]>([]);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    const scope = {
      department: department ?? null,
      from: from ? `${from}T00:00:00+05:30` : null,
      to: to ? `${to}T23:59:59+05:30` : null,
    };
    const today = todayIST();

    void (async () => {
      try {
        const [widgets, depts, team, recent, types, staff, punches, rules, health, audit] = await Promise.all([
          getDashboardWidgets(supabase, scope),
          supabase.from('departments').select('id, name').eq('is_active', true).order('sort_order'),
          getTeamLocations(supabase).catch(() => []),
          adminListInspections(supabase, { department: scope.department, pageSize: 5 })
            .then((r) => r.rows)
            .catch(() => []),
          supabase.from('inspection_types').select('id, name'),
          getAssignableStaff(supabase).catch(() => []),
          adminListAllAttendance(supabase, { dateFrom: today, dateTo: today }).catch(() => null),
          getAttendanceRules(supabase).catch(() => null),
          getSystemHealth(supabase).catch(() => null),
          adminAuditSearch(supabase, { pageSize: 3 })
            .then((r) => r.rows)
            .catch(() => []),
        ]);
        const departments = (depts.data ?? []) as DeptOption[];
        const perfScope = department ? departments.filter((d) => d.id === department) : departments;
        const deptPerformance = await Promise.all(
          perfScope.map(async (d) => {
            const w = await getDashboardWidgets(supabase, { ...scope, department: d.id }).catch(() => null);
            const done = (w?.inspections.by_status.completed ?? 0) + (w?.inspections.by_status.closed ?? 0);
            return { id: d.id, name: d.name, total: w?.inspections.total ?? 0, done };
          }),
        ).then((rows) =>
          // Busiest departments first; departments without inspections say nothing yet.
          rows.filter((d) => d.total > 0).sort((a, b) => b.total - a.total).slice(0, 5),
        );

        let attendance: AttendanceToday | null = null;
        if (punches) {
          const summaries = summarizeByDay(punches, rules);
          const counts: Record<DayStatus, number> = { checked_in: 0, present: 0, half_day: 0, missing_out: 0, absent: 0 };
          for (const s of summaries) counts[s.status] += 1;
          const seen = new Set(summaries.map((s) => s.user_id));
          counts.absent += staff.filter((s) => !seen.has(s.user_id)).length;
          attendance = {
            staff: Math.max(staff.length, summaries.length),
            counts,
            exceptionPunches: summaries.reduce((n, s) => n + s.exception_count, 0),
            exceptionEmployees: summaries.filter((s) => s.exception_count > 0).length,
          };
        }

        if (!active) return;
        startTransition(() => {
          setData({
            widgets,
            departments,
            deptPerformance,
            staffPoints: team.map((member) => ({
              id: member.user_id,
              lat: member.latitude,
              lon: member.longitude,
              label: member.full_name ?? 'Staff',
              recordedAt: member.recorded_at,
            })),
            recent,
            typeNames: new Map((types.data ?? []).map((t) => [t.id, t.name])),
            staffNames: new Map(staff.map((s) => [s.user_id, s.full_name])),
            attendance,
            health,
            audit,
          });
          setError(null);
          setReady(true);
        });
      } catch (caught) {
        if (!active) return;
        const message =
          caught instanceof Error && /not authorized/i.test(caught.message)
            ? 'You do not have permission to view the dashboard.'
            : 'Could not load the dashboard.';
        startTransition(() => {
          setData(null);
          setError(message);
          setReady(true);
        });
      }
    })();

    return () => {
      active = false;
    };
  }, [department, from, to]);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    getInspectionTrend(supabase, { today: todayIST(), days: Number(range), department })
      .catch(() => [])
      .then((points) => {
        if (active) startTransition(() => setTrend(points));
      });
    return () => {
      active = false;
    };
  }, [range, department]);

  const actions = (
    <PageActions>
      <CreateInspectionDialog triggerLabel="Assign inspection" />
    </PageActions>
  );

  if (!ready) return <PageLoader />;
  if (error || !data) {
    return (
      <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {error ?? 'Could not load the dashboard.'}
      </p>
    );
  }

  const { widgets, attendance } = data;
  const by = widgets.inspections.by_status;
  const count = (...codes: string[]) => codes.reduce((n, c) => n + (by[c] ?? 0), 0);
  const total = widgets.inspections.total;
  const done = count('completed', 'closed');
  const awaitingReview = count('submitted', 'under_review');
  const deptParam = department ? `&department=${encodeURIComponent(department)}` : '';
  const lastWeek = trend.slice(-7).reduce((n, p) => n + p.created, 0);
  const present = attendance ? attendance.staff - attendance.counts.absent : 0;
  const exceptions = attendance?.exceptionPunches ?? widgets.attendance_today.exceptions;

  return (
    <div className="space-y-5">
      {actions}

      <Alert className="border-info/20 bg-info-soft text-info">
        <ShieldCheck />
        <AlertDescription className="text-info">
          <span>
            <strong className="font-semibold">Secure administrator view</strong> · Figures are live and scoped to
            your role. Administrative actions are recorded in the audit trail.
          </span>
        </AlertDescription>
        <AlertAction>
          <Button variant="link" size="sm" className="text-info" nativeButton={false} render={<Link href="/audit" />}>
            View audit trail <ChevronRight />
          </Button>
        </AlertAction>
      </Alert>

      <DashboardFilters departments={data.departments} current={{ department, from, to }} />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Kpi
          href={`/inspections${department ? `?department=${encodeURIComponent(department)}` : ''}`}
          testId="widget-total"
          icon={ClipboardList}
          tone="bg-info-soft text-info"
          label="Total inspections"
          value={total}
          hint={`+${lastWeek} in the last 7 days`}
        />
        <Kpi
          href={`/inspections?status=new${deptParam}`}
          icon={Clock}
          tone="bg-warning-soft text-warning"
          label="Pending"
          value={count('new', 'assigned')}
          hint={`${by.new ?? 0} awaiting assignment`}
        />
        <Kpi
          href={`/inspections?status=in_progress${deptParam}`}
          icon={Activity}
          tone="bg-info-soft text-info"
          label="In progress"
          value={by.in_progress ?? 0}
          hint={`${awaitingReview} awaiting review`}
        />
        <Kpi
          href={`/inspections?status=completed${deptParam}`}
          icon={CheckCircle2}
          tone="bg-success-soft text-success"
          label="Completed"
          value={done}
          hint={`${total ? Math.round((done / total) * 1000) / 10 : 0}% completion`}
        />
        <Kpi
          href="/attendance?status=present"
          icon={UserCheck}
          tone="bg-accent text-primary"
          label="Employees present"
          value={attendance ? present : '—'}
          hint={attendance ? `of ${attendance.staff} staff today` : 'Not available for your role'}
        />
        <Kpi
          href="/attendance?exceptions=1"
          icon={AlertTriangle}
          tone="bg-destructive-soft text-destructive"
          label="Attendance exceptions"
          value={exceptions}
          hint={exceptions ? 'Needs review' : 'Nothing to review'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Inspection activity</CardTitle>
            <CardDescription>Inspections created vs completed per day</CardDescription>
            <CardAction>
              <Select items={RANGES} value={range} onValueChange={(v) => v && setRange(v)}>
                <SelectTrigger className="w-36" aria-label="Activity range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {RANGES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardAction>
          </CardHeader>
          <CardContent>
            <ActivityChart data={trend} />
          </CardContent>
        </Card>

        <Card data-testid="status-breakdown">
          <CardHeader>
            <CardTitle>Status distribution</CardTitle>
            <CardDescription>Inspection workflow</CardDescription>
          </CardHeader>
          <CardContent>
            <StatusDonut total={total} byStatus={by} departmentId={department} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Ahmedabad field map</CardTitle>
            <CardDescription>Last-known field staff locations for your scope</CardDescription>
            <CardAction>
              <Button variant="ghost" size="sm" className="text-info" nativeButton={false} render={<Link href="/inspections/travel" />}>
                <MapIcon /> Open full map
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <MapContainer label="Field staff locations" height={280} points={data.staffPoints} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attendance today</CardTitle>
            <CardDescription>Workforce summary</CardDescription>
            <CardAction>
              <Button
                variant="link"
                size="sm"
                className="text-info"
                nativeButton={false}
                render={<Link href="/attendance" data-testid="widget-att-exceptions" />}
              >
                View details
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {attendance ? (
              <>
                <div className="flex items-center gap-5 border-b pb-4">
                  <PercentRing percent={attendance.staff ? (present / attendance.staff) * 100 : 0} />
                  <div>
                    <p className="text-3xl font-bold text-primary tabular-nums">{present}</p>
                    <p className="text-sm text-muted-foreground">Checked in today</p>
                  </div>
                </div>
                <ul className="divide-y text-sm">
                  {[
                    { label: 'On duty now', value: attendance.counts.checked_in, color: 'var(--chart-1)' },
                    { label: 'Day complete', value: attendance.counts.present, color: 'var(--chart-2)' },
                    {
                      label: 'Half day / missing out',
                      value: attendance.counts.half_day + attendance.counts.missing_out,
                      color: 'var(--chart-3)',
                    },
                    { label: 'Not checked in', value: attendance.counts.absent, color: 'var(--chart-8)' },
                    { label: 'Exceptions', value: attendance.exceptionPunches, color: 'var(--chart-4)' },
                  ].map((row) => (
                    <li key={row.label} className="flex items-center gap-2 py-2">
                      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
                      <span className="flex-1 text-muted-foreground">{row.label}</span>
                      <span className="font-semibold tabular-nums">{row.value}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {widgets.attendance_today.total} punches today · {widgets.attendance_today.exceptions} exceptions
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <RecentInspections rows={data.recent} typeNames={data.typeNames} staffNames={data.staffNames} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Department performance</CardTitle>
            <CardDescription>Completed or closed share, busiest departments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.deptPerformance.length === 0 ? (
              <p className="text-sm text-muted-foreground">No inspections in this scope yet.</p>
            ) : (
              data.deptPerformance.map((d) => {
                const pct = d.total ? Math.round((d.done / d.total) * 100) : 0;
                return (
                  <Progress
                    key={d.id}
                    value={pct}
                    className="gap-1.5 [&_[data-slot=progress-track]]:h-1.5 [&_[data-slot=progress-track]]:bg-border"
                  >
                    <ProgressLabel className="flex-1 truncate font-normal text-muted-foreground">{d.name}</ProgressLabel>
                    <ProgressValue className="text-sm font-semibold">{() => `${pct}%`}</ProgressValue>
                  </Progress>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending approvals</CardTitle>
            <CardDescription>Supervisor action queue</CardDescription>
            <CardAction>
              <Badge variant="warning">{awaitingReview + (by.rework ?? 0) + exceptions} items</Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              <QueueItem
                href={`/inspections?status=submitted${deptParam}`}
                icon={FileCheck}
                tone="bg-info-soft text-info"
                title="Inspection reviews"
                detail={`${awaitingReview} awaiting decision`}
              />
              <QueueItem
                href={`/inspections?status=rework${deptParam}`}
                icon={RotateCcw}
                tone="bg-destructive-soft text-destructive"
                title="Rework requested"
                detail={`${by.rework ?? 0} sent back to field`}
              />
              <QueueItem
                href="/attendance?exceptions=1"
                icon={AlertTriangle}
                tone="bg-warning-soft text-warning"
                title="Attendance exceptions"
                detail={`${exceptions} awaiting decision`}
              />
            </ul>
          </CardContent>
        </Card>

        <SystemHealthCard health={data.health} />
      </div>

      <RecentActivity rows={data.audit} staffNames={data.staffNames} />
    </div>
  );
}

function Kpi({
  href,
  testId,
  icon: Icon,
  tone,
  label,
  value,
  hint,
}: {
  href: string;
  testId?: string;
  icon: LucideIcon;
  tone: string;
  label: string;
  value: ReactNode;
  hint: string;
}) {
  return (
    <Link href={href} data-testid={testId} className="rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring">
      <Card className="h-full transition-colors hover:border-info/40">
        <CardContent className="space-y-1">
          <span className={`mb-3 flex size-9 items-center justify-center rounded-md ${tone}`}>
            <Icon className="size-4.5" />
          </span>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-primary tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function QueueItem({
  href,
  icon: Icon,
  tone,
  title,
  detail,
}: {
  href: string;
  icon: LucideIcon;
  tone: string;
  title: string;
  detail: string;
}) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 py-3 hover:text-primary">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-md ${tone}`}>
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{title}</span>
          <span className="block text-xs text-muted-foreground">{detail}</span>
        </span>
        <ChevronRight className="size-4 text-muted-foreground" />
      </Link>
    </li>
  );
}

function RecentInspections({
  rows,
  typeNames,
  staffNames,
}: {
  rows: AdminInspectionRow[];
  typeNames: Map<string, string>;
  staffNames: Map<string, string>;
}) {
  const router = useRouter();
  return (
    <Card className="pb-0">
      <CardHeader>
        <CardTitle>Recent inspections</CardTitle>
        <CardDescription>Latest field records</CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm" className="text-info" nativeButton={false} render={<Link href="/inspections" />}>
            View all <ChevronRight />
          </Button>
        </CardAction>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Inspection ID</TableHead>
            <TableHead>Type / title</TableHead>
            <TableHead>Assigned officer</TableHead>
            <TableHead>Scheduled</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                No inspections yet.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => {
              const status = statusMeta(r.status);
              return (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => router.push(`/inspections?inspection=${r.id}`)}>
                  <TableCell>
                    <Link
                      href={`/inspections?inspection=${r.id}`}
                      className="font-semibold text-info hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {r.ref_no}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{typeNames.get(r.inspection_type_id) ?? 'Inspection'}</p>
                    <p className="text-xs text-muted-foreground">{r.title}</p>
                  </TableCell>
                  <TableCell>{r.assigned_to ? (staffNames.get(r.assigned_to) ?? 'Assigned') : 'Unassigned'}</TableCell>
                  <TableCell>{fmtWhen(r.scheduled_at)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: status?.color }} />
                      {status?.label ?? humanize(r.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize">{r.priority}</TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </Card>
  );
}

function SystemHealthCard({ health }: { health: SystemHealth | null }) {
  const entries = health ? Object.entries(health.sync).slice(0, 4) : [];
  return (
    <Card>
      <CardHeader>
        <CardTitle>System health</CardTitle>
        <CardDescription>Platform service status</CardDescription>
        <CardAction>
          <Button variant="link" size="sm" className="text-info" nativeButton={false} render={<Link href="/system" />}>
            Monitor
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        {health ? (
          <>
            <div className="flex items-center gap-3 rounded-lg bg-success-soft p-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success text-white">
                <CheckCircle2 className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-success">Services responding</p>
                <p className="text-xs text-muted-foreground">Last checked {fmtWhen(health.checked_at)} IST</p>
              </div>
            </div>
            <ul className="divide-y text-sm">
              {entries.map(([key, value]) => (
                <li key={key} className="flex items-center justify-between gap-2 py-2">
                  <span className="text-muted-foreground">{humanize(key)}</span>
                  <span className="font-medium tabular-nums">
                    {typeof value === 'string' && /\d{4}-\d{2}-\d{2}T/.test(value) ? fmtWhen(value) : (value ?? '—')}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">System health is available to administrators.</p>
        )}
      </CardContent>
    </Card>
  );
}

function RecentActivity({ rows, staffNames }: { rows: AuditRow[]; staffNames: Map<string, string> }) {
  const tones = ['bg-primary text-primary-foreground', 'bg-success text-white', 'bg-warning text-white'];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent admin activity</CardTitle>
        <CardDescription>Security-sensitive actions are logged</CardDescription>
        <CardAction>
          <Button variant="link" size="sm" className="text-info" nativeButton={false} render={<Link href="/audit" />}>
            Full audit trail
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity visible to your role.</p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-3 md:divide-x">
            {rows.map((r, i) => {
              const actor = (r.actor_id && staffNames.get(r.actor_id)) || humanize(r.actor_role ?? 'System');
              return (
                <li key={r.id} className="flex items-start gap-3 md:pr-4 md:not-first:pl-4">
                  <Avatar className="size-9">
                    <AvatarFallback className={`text-xs font-semibold ${tones[i % tones.length]}`}>
                      {initials(actor)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 text-sm">
                    <p className="truncate">
                      <span className="font-semibold">{actor}</span>{' '}
                      <span className="text-muted-foreground">· {humanize(r.action)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {fmtWhen(r.created_at)} IST · {humanize(r.entity.split('.').pop() ?? r.entity)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
