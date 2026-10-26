'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DataTable, type Column } from '@/components/ui/DataTable';
import type { ChallanRow } from '@/lib/data/challans';

const STATUS_COLORS: Record<string, string> = {
  draft: '#6B7280',
  issued: '#2563EB',
  paid: '#16A34A',
  cancelled: '#DC2626',
};

/** Challan list with server-side paging; rows link to detail. */
export function ChallanList({
  rows,
  total,
  page,
  pageSize,
}: {
  rows: ChallanRow[];
  total: number;
  page: number;
  pageSize: number;
}) {
  const router = useRouter();

  const columns: Column<ChallanRow>[] = [
    {
      key: 'ref_no',
      header: 'Reference',
      cell: (r) => (
        <Link href={`/challan/${r.id}`} data-testid={`challan-link-${r.id}`} className="font-medium underline-offset-2 hover:underline">
          {r.ref_no}
        </Link>
      ),
    },
    { key: 'violation', header: 'Violation', cell: (r) => r.violation },
    { key: 'offender_name', header: 'Offender', cell: (r) => r.offender_name || '—' },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => (
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[r.status] ?? '#9CA3AF' }} />
          {r.status}
        </span>
      ),
    },
    { key: 'amount', header: 'Amount', cell: (r) => (r.amount != null ? `₹${r.amount}` : '—') },
    { key: 'created_ist', header: 'Created', cell: (r) => r.created_ist },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      page={page}
      pageSize={pageSize}
      total={total}
      onPageChange={(p) => {
        const url = new URL(window.location.href);
        url.searchParams.set('page', String(p));
        router.push(url.pathname + url.search);
      }}
      emptyMessage="No challans yet."
    />
  );
}
