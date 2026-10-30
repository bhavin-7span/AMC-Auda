'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Pagination, PaginationContent, PaginationItem } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ReportName, ReportRow } from '@/lib/data/reports';

const REPORT_ITEMS = [
  { value: 'inspections', label: 'Inspections' },
  { value: 'attendance', label: 'Attendance' },
];

const STATUS_ITEMS = [
  { value: '', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'rework', label: 'Rework' },
  { value: 'completed', label: 'Completed' },
  { value: 'closed', label: 'Closed' },
];

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
  const deptItems = [{ value: '', label: 'All' }, ...departments.map((d) => ({ value: d.id, label: d.name }))];
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);

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
    const nextReport = String(formData.get('report') ?? report);
    const q = buildQuery({
      report: nextReport,
      department: String(formData.get('department') ?? ''),
      // Status values are inspection statuses; drop them when switching report type.
      status: nextReport === 'inspections' ? String(formData.get('status') ?? '') : '',
      from: String(formData.get('from') ?? ''),
      to: String(formData.get('to') ?? ''),
    });
    router.push(`/reports?${q}`);
  }

  function goToPage(next: number) {
    router.push(`/reports?${buildQuery({ page: String(next) })}`);
  }

  const exportHref = (format: string) => `/reports/export?${buildQuery({})}&format=${format}`;

  return (
    <div className="space-y-4">
      <Card data-testid="filter-bar">
        <CardContent>
          {/* Keyed on the applied filters: React resets the form after the action, so remount with the new defaults. */}
          <form key={JSON.stringify({ report, ...filters })} action={apply} className="flex flex-wrap items-end gap-3">
            <Field className="w-44">
              <FieldLabel htmlFor="report">Report</FieldLabel>
              <Select name="report" items={REPORT_ITEMS} defaultValue={report}>
                <SelectTrigger id="report" className="h-9 w-full" data-testid="report-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {REPORT_ITEMS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field className="w-48">
              <FieldLabel htmlFor="department">Department</FieldLabel>
              <Select name="department" items={deptItems} defaultValue={filters.department ?? ''}>
                <SelectTrigger id="department" className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {deptItems.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {report === 'inspections' && (
              <Field className="w-44">
                <FieldLabel htmlFor="status">Status</FieldLabel>
                <Select name="status" items={STATUS_ITEMS} defaultValue={filters.status ?? ''}>
                  <SelectTrigger id="status" className="h-9 w-full" data-testid="report-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {STATUS_ITEMS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <Field className="w-40">
              <FieldLabel htmlFor="from">From</FieldLabel>
              <Input id="from" name="from" type="date" className="h-9" defaultValue={filters.from ?? ''} />
            </Field>
            <Field className="w-40">
              <FieldLabel htmlFor="to">To</FieldLabel>
              <Input id="to" name="to" type="date" className="h-9" defaultValue={filters.to ?? ''} />
            </Field>
            <Button type="submit" size="lg" data-testid="report-apply">
              Run
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="ml-auto"
              data-testid="filter-clear"
              onClick={() => router.push(`/reports?report=${report}`)}
            >
              Clear filters
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Export:</span>
        {[
          ['csv', 'CSV'],
          ['xlsx', 'Excel'],
          ['pdf', 'PDF'],
        ].map(([format, label]) => (
          <Button
            key={format}
            variant="outline"
            nativeButton={false}
            render={<a href={exportHref(format)} data-testid={`export-${format}`} />}
          >
            <Download /> {label}
          </Button>
        ))}
      </div>

      <Card className="py-0" data-testid="data-table">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.length ? (
                  columns.map((key) => (
                    <TableHead key={key} className="capitalize first:pl-4 last:pr-4">
                      {key.replace(/_/g, ' ')}
                    </TableHead>
                  ))
                ) : (
                  <TableHead className="pl-4">—</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell className="py-8 text-center text-muted-foreground" data-testid="data-table-empty">
                    No rows for this report and filter.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r, i) => (
                  <TableRow key={`${page}-${i}`}>
                    {columns.map((key) => (
                      <TableCell key={key} className="first:pl-4 last:pr-4">
                        {String(r[key] ?? '—')}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span data-testid="data-table-range">
          {from}–{to} of {total}
        </span>
        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <Button variant="ghost" data-testid="page-prev" disabled={page <= 0} onClick={() => goToPage(page - 1)}>
                <ChevronLeft /> Previous
              </Button>
            </PaginationItem>
            <PaginationItem className="px-2" data-testid="page-indicator">
              Page {page + 1} of {pageCount}
            </PaginationItem>
            <PaginationItem>
              <Button
                variant="ghost"
                data-testid="page-next"
                disabled={page >= pageCount - 1}
                onClick={() => goToPage(page + 1)}
              >
                Next <ChevronRight />
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
