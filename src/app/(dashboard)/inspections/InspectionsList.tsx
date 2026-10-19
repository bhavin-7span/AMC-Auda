'use client';

import Link from 'next/link';
import { DataTable, type Column } from '@/components/ui/DataTable';
import type { AdminInspectionRow } from '@/lib/data/admin';

const STATUS_COLORS: Record<string, string> = {
  new: '#6B7280',
  assigned: '#2563EB',
  in_progress: '#0891B2',
  submitted: '#7C3AED',
  under_review: '#D97706',
  rework: '#DC2626',
  completed: '#16A34A',
  closed: '#374151',
};

/**
 * Inspection list with server-side paging (admin_list_inspections). Row click opens the
 * detail page. Filters are applied via the page URL (server round-trip).
 */
export function InspectionsList({
  rows,
  total,
  page,
  pageSize,
}: {
  rows: AdminInspectionRow[];
  total: number;
  page: number;
  pageSize: number;
}) {
  function goToPage(next: number) {
    const url = new URL(window.location.href);
    url.searchParams.set('page', String(next));
    window.location.href = url.toString();
  }

  const columns: Column<AdminInspectionRow>[] = [
    {
      key: 'ref_no',
      header: 'Reference',
      cell: (r) => (
        <Link
          href={`/inspections/${r.id}`}
          data-testid={`inspection-link-${r.id}`}
          className="font-medium underline-offset-2 hover:underline"
        >
          {r.ref_no}
        </Link>
      ),
    },
    { key: 'title', header: 'Title', cell: (r) => r.title },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => (
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: STATUS_COLORS[r.status] ?? '#9CA3AF' }}
          />
          {r.status}
        </span>
      ),
    },
    { key: 'priority', header: 'Priority', cell: (r) => r.priority },
    {
      key: 'scheduled_at',
      header: 'Scheduled',
      cell: (r) => new Date(r.scheduled_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      page={page}
      pageSize={pageSize}
      total={total}
      onPageChange={goToPage}
      emptyMessage="No inspections found."
    />
  );
}
