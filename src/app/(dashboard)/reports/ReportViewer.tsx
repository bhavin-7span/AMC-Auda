'use client';

import { useRouter } from 'next/navigation';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { FilterBar } from '@/components/ui/FilterBar';
import { Button, Field, Input, Select } from '@/components/ui/Form';
import type { ReportName, ReportRow } from '@/lib/data/reports';

export interface DeptOption {
  id: string;
  name: string;
}

/**
 * Report viewer: report selector + filters + a server-paged preview table + export
 * buttons. Filters live in the URL so the server re-queries admin_report; exports link to
 * the export route with the same query (audited server-side).
 */
export function ReportViewer({
  report,
  rows,
  total,
  page,
  pageSize,
  departments,
  filters,
}: {
  report: ReportName;
  rows: ReportRow[];
  total: number;
  page: number;
  pageSize: number;
  departments: DeptOption[];
  filters: { department?: string; status?: string; from?: string; to?: string };
}) {
  const router = useRouter();

  function buildQuery(overrides: Record<string, string>): string {
    const params = new URLSearchParams();
    params.set('report', overrides.report ?? report);
    for (const key of ['department', 'status', 'from', 'to'] as const) {
      const val = overrides[key] ?? filters[key];
      if (val) params.set(key, val);
    }
    if (overrides.page) params.set('page', overrides.page);
    return params.toString();
  }

  function apply(formData: FormData) {
    const q = buildQuery({
      report: String(formData.get('report') ?? report),
      department: String(formData.get('department') ?? ''),
      status: String(formData.get('status') ?? ''),
      from: String(formData.get('from') ?? ''),
      to: String(formData.get('to') ?? ''),
    });
    router.push(`/reports?${q}`);
  }

  function goToPage(next: number) {
    router.push(`/reports?${buildQuery({ page: String(next) })}`);
  }

  const columns: Column<ReportRow>[] =
    rows.length > 0
      ? Object.keys(rows[0]).map((key) => ({
          key,
          header: key.replace(/_/g, ' '),
          cell: (r) => String(r[key] ?? '—'),
        }))
      : [{ key: 'empty', header: '—', cell: () => '' }];

  const exportHref = (format: string) => `/reports/export?${buildQuery({})}&format=${format}`;

  return (
    <div className="space-y-4">
      <form action={apply}>
        <FilterBar onClear={() => router.push(`/reports?report=${report}`)}>
          <Field label="Report" htmlFor="report">
            <Select id="report" name="report" defaultValue={report} data-testid="report-select">
              <option value="inspections">Inspections</option>
              <option value="attendance">Attendance</option>
            </Select>
          </Field>
          <Field label="Department" htmlFor="department">
            <Select id="department" name="department" defaultValue={filters.department ?? ''}>
              <option value="">All</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="From" htmlFor="from">
            <Input id="from" name="from" type="date" defaultValue={filters.from ?? ''} />
          </Field>
          <Field label="To" htmlFor="to">
            <Input id="to" name="to" type="date" defaultValue={filters.to ?? ''} />
          </Field>
          <Button type="submit" data-testid="report-apply">
            Run
          </Button>
        </FilterBar>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-zinc-500">Export:</span>
        <a href={exportHref('csv')} data-testid="export-csv">
          <Button variant="secondary">CSV</Button>
        </a>
        <a href={exportHref('xlsx')} data-testid="export-xlsx">
          <Button variant="secondary">Excel</Button>
        </a>
        <a href={exportHref('pdf')} data-testid="export-pdf">
          <Button variant="secondary">PDF</Button>
        </a>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => JSON.stringify(r).slice(0, 80)}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={goToPage}
        emptyMessage="No rows for this report and filter."
      />
    </div>
  );
}
