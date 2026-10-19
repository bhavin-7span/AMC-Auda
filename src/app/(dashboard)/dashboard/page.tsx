import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getDashboardWidgets, type DashboardWidgets } from '@/lib/data/dashboard';
import { Widget } from '@/components/ui/Widget';
import { MapContainer } from '@/components/ui/MapContainer';
import { DashboardFilters, type DeptOption } from './DashboardFilters';

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  submitted: 'Submitted',
  under_review: 'Under Review',
  rework: 'Rework',
  completed: 'Completed',
  closed: 'Closed',
};

/**
 * Role-scoped dashboard (Phase 7). KPI widgets + status breakdown with drill-down to the
 * filtered inspection list, department/date filters, and a GIS map seam. Data comes from
 * admin_dashboard_widgets (role-scoped, aggregated server-side).
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ department?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  let error: string | null = null;
  let widgets: DashboardWidgets | null = null;
  let departments: DeptOption[] = [];

  try {
    const [w, depts] = await Promise.all([
      getDashboardWidgets(supabase, {
        department: sp.department ?? null,
        from: sp.from ? `${sp.from}T00:00:00+05:30` : null,
        to: sp.to ? `${sp.to}T23:59:59+05:30` : null,
      }),
      supabase.from('departments').select('id, name').eq('is_active', true).order('sort_order'),
    ]);
    widgets = w;
    departments = (depts.data ?? []) as DeptOption[];
  } catch (e) {
    error =
      e instanceof Error && /not authorized/i.test(e.message)
        ? 'You do not have permission to view the dashboard.'
        : 'Could not load the dashboard.';
  }

  // Preserve the active department filter when drilling into a status list.
  const deptQuery = sp.department ? `&department=${sp.department}` : '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-zinc-600 dark:text-zinc-400">Overview of field operations.</p>
      </div>

      {error ? (
        <p className="rounded-md border border-red-500/40 bg-red-50 px-3 py-2 text-sm text-red-900 dark:bg-red-950/60 dark:text-red-100">
          {error}
        </p>
      ) : widgets ? (
        <>
          <DashboardFilters
            departments={departments}
            current={{ department: sp.department, from: sp.from, to: sp.to }}
          />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/inspections" data-testid="widget-total">
              <Widget title="Total inspections" value={widgets.inspections.total} />
            </Link>
            <Link href="/inspections?status=assigned" data-testid="widget-open">
              <Widget title="Open" value={widgets.inspections.open} hint="not completed/closed" />
            </Link>
            <Link href="/inspections?status=completed" data-testid="widget-completed">
              <Widget title="Completed" value={widgets.inspections.completed} />
            </Link>
            <Link href="/attendance?exceptions=1" data-testid="widget-att-exceptions">
              <Widget
                title="Attendance exceptions (today)"
                value={widgets.attendance_today.exceptions}
                hint={`of ${widgets.attendance_today.total} punches`}
              />
            </Link>
          </div>

          <section className="space-y-2">
            <h2 className="text-lg font-medium">Inspections by status</h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" data-testid="status-breakdown">
              {Object.entries(STATUS_LABELS).map(([code, label]) => {
                const count = widgets!.inspections.by_status[code] ?? 0;
                return (
                  <Link
                    key={code}
                    href={`/inspections?status=${code}${deptQuery}`}
                    data-testid={`status-${code}`}
                    className="flex items-center justify-between rounded-md border border-black/10 px-3 py-2 text-sm hover:bg-black/[.03] dark:border-white/15 dark:hover:bg-white/[.04]"
                  >
                    <span>{label}</span>
                    <span className="font-semibold">{count}</span>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-medium">Field activity map</h2>
            <MapContainer label="Inspection & staff locations" height={300} />
          </section>
        </>
      ) : null}
    </div>
  );
}
