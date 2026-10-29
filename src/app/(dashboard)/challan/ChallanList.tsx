'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ChallanRow } from '@/lib/data/challans';
import { CHALLAN_STATUS_VARIANT, ChallanDrawer } from './ChallanDrawer';

/**
 * Challan list with server-side paging (URL `page`). Clicking a row opens its detail in a
 * drawer on the same route (`?challan=<id>`).
 */
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  const openId = searchParams.get('challan');

  function hrefWith(mutate: (p: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const qs = params.toString();
    return `${pathname}${qs ? `?${qs}` : ''}`;
  }
  const detailHref = (id: string) => hrefWith((p) => p.set('challan', id));
  const openDetail = (id: string) => router.push(detailHref(id), { scroll: false });
  const closeDetail = () =>
    router.replace(
      hrefWith((p) => p.delete('challan')),
      { scroll: false },
    );

  const pageHref = (next: number) =>
    hrefWith((p) => (next > 0 ? p.set('page', String(next)) : p.delete('page')));

  return (
    <>
      <div className="space-y-3" data-testid="data-table">
        <div className="overflow-hidden rounded-lg border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Reference</TableHead>
                <TableHead>Violation</TableHead>
                <TableHead>Offender</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="pr-4">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-muted-foreground"
                    data-testid="data-table-empty"
                  >
                    No challans yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer"
                    data-state={openId === r.id ? 'selected' : undefined}
                    onClick={() => openDetail(r.id)}
                  >
                    <TableCell className="pl-4">
                      <Link
                        href={detailHref(r.id)}
                        scroll={false}
                        data-testid={`challan-link-${r.id}`}
                        className="font-semibold text-info hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {r.ref_no}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-64 truncate">{r.violation}</TableCell>
                    <TableCell>{r.offender_name || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={CHALLAN_STATUS_VARIANT[r.status] ?? 'outline'} className="capitalize">
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">{r.amount != null ? `₹${r.amount}` : '—'}</TableCell>
                    <TableCell className="pr-4">{r.created_ist}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span data-testid="data-table-range">
            {from}–{to} of {total}
          </span>
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href={pageHref(page - 1)}
                  data-testid="page-prev"
                  aria-disabled={page <= 0}
                  className={page <= 0 ? 'pointer-events-none opacity-50' : undefined}
                />
              </PaginationItem>
              <PaginationItem className="px-2" data-testid="page-indicator">
                Page {page + 1} of {pageCount}
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href={pageHref(page + 1)}
                  data-testid="page-next"
                  aria-disabled={page >= pageCount - 1}
                  className={page >= pageCount - 1 ? 'pointer-events-none opacity-50' : undefined}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
      <ChallanDrawer id={openId} onClose={closeDetail} />
    </>
  );
}
