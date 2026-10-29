import { createClient } from '@/lib/supabase/server';
import { runReport, type ReportName, type ReportRow, type ReportFilters } from '@/lib/data/reports';
import { ReportViewer, type DeptOption } from './ReportViewer';

const PAGE_SIZE = 50;
const REPORTS: ReportName[] = ['inspections', 'attendance'];

/**
 * MIS reports & export (Phase 8). Report selector + filters + server-paged preview, with
 * CSV / Excel / PDF export. Every report is role-scoped by admin_report; exports are
 * audited in admin_log_export. The (dashboard) layout + proxy require authentication.
 */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    report?: string;
    department?: string;
    status?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const report: ReportName = REPORTS.includes(sp.report as ReportName)
    ? (sp.report as ReportName)
    : 'inspections';
  const page = Math.max(0, Number.parseInt(sp.page ?? '0', 10) || 0);

  const filters: ReportFilters = {
    department: sp.department ?? null,
    status: sp.status ?? null,
    from: sp.from ? `${sp.from}T00:00:00+05:30` : null,
    to: sp.to ? `${sp.to}T23:59:59+05:30` : null,
  };

  const supabase = await createClient();

  let error: string | null = null;
  let rows: ReportRow[] = [];
  let total = 0;
  let departments: DeptOption[] = [];

  try {
    const [result, depts] = await Promise.all([
      runReport(supabase, report, filters, page, PAGE_SIZE),
      supabase.from('departments').select('id, name').eq('is_active', true).order('sort_order'),
    ]);
    rows = result.rows;
    total = result.total;
    departments = (depts.data ?? []) as DeptOption[];
  } catch (e) {
    error =
      e instanceof Error && /not authorized/i.test(e.message)
        ? 'You do not have permission to run reports.'
        : 'Could not run the report.';
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-md border border-red-500/40 bg-red-50 px-3 py-2 text-sm text-red-900 dark:bg-red-950/60 dark:text-red-100">
          {error}
        </p>
      ) : (
        <ReportViewer
          report={report}
          rows={rows}
          total={total}
          page={page}
          pageSize={PAGE_SIZE}
          departments={departments}
          filters={{
            department: sp.department,
            status: sp.status,
            from: sp.from,
            to: sp.to,
          }}
        />
      )}
    </div>
  );
}
