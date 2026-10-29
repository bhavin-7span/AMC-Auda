'use client';

import { useRouter } from 'next/navigation';
import { Fragment, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Pagination, PaginationContent, PaginationItem } from '@/components/ui/pagination';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useUrlFilters } from '@/hooks/use-url-filters';
import type { AuditRow } from '@/lib/data/admin';

function fmt(ts: string): string {
  return new Date(ts).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

const FILTER_KEYS = ['entity', 'from', 'to'];

/**
 * Read-only audit log viewer (Phase 9). Action search and entity/date filters live in the
 * URL so the server re-queries admin_audit_search. Rows expand to show before/after
 * JSON. The log is append-only (no edit/delete affordances) — the real guarantee is the
 * DB (no UPDATE/DELETE policy on audit_log).
 */
export function AuditViewer({
  rows,
  total,
  page,
  pageSize,
  filters,
}: {
  rows: AuditRow[];
  total: number;
  page: number;
  pageSize: number;
  filters: { action?: string; entity?: string; from?: string; to?: string };
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const url = useUrlFilters({ filterKeys: FILTER_KEYS, searchParam: 'action' });

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);

  function goToPage(next: number) {
    const params = new URLSearchParams();
    for (const key of ['action', 'entity', 'from', 'to'] as const) {
      if (filters[key]) params.set(key, filters[key]!);
    }
    params.set('page', String(next));
    router.push(`/audit?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2" data-testid="table-toolbar">
        <div className="relative flex-1 sm:w-72 sm:flex-none">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={url.search}
            onChange={(e) => url.setSearch(e.target.value)}
            placeholder="Search action, e.g. set_role"
            aria-label="Search action"
            data-testid="audit-search"
            className="h-9 bg-card pl-8"
          />
        </div>
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetTrigger
            render={
              <Button variant="outline" size="icon-lg" aria-label="Show filters" data-testid="filter-toggle" className="relative bg-card" />
            }
          >
            <SlidersHorizontal />
            {url.activeCount > 0 && (
              <Badge className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[10px]" data-testid="filter-count">
                {url.activeCount}
              </Badge>
            )}
          </SheetTrigger>
          <SheetContent data-testid="filter-drawer">
            <form
              key={url.formKey}
              action={(fd) => {
                url.apply(fd);
                setFiltersOpen(false);
              }}
              className="flex h-full flex-col"
            >
              <SheetHeader className="border-b">
                <SheetTitle>Filters</SheetTitle>
                <SheetDescription>Narrow the audit log by entity and date.</SheetDescription>
              </SheetHeader>
              <FieldGroup className="flex-1 overflow-y-auto p-4">
                <Field>
                  <FieldLabel htmlFor="entity">Entity</FieldLabel>
                  <Input id="entity" name="entity" defaultValue={filters.entity ?? ''} placeholder="e.g. staff_roles" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="from">From</FieldLabel>
                  <Input id="from" name="from" type="date" defaultValue={filters.from ?? ''} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="to">To</FieldLabel>
                  <Input id="to" name="to" type="date" defaultValue={filters.to ?? ''} />
                </Field>
              </FieldGroup>
              <SheetFooter className="flex-row justify-end border-t">
                <Button
                  type="button"
                  variant="secondary"
                  data-testid="filter-clear"
                  onClick={() => {
                    url.clear();
                    setFiltersOpen(false);
                  }}
                >
                  Clear
                </Button>
                <Button type="submit" data-testid="audit-apply">
                  Apply
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      <Card className="py-0" data-testid="data-table">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Time (IST)</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="pr-4 text-right">
                  <span className="sr-only">Details</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground" data-testid="data-table-empty">
                    No audit entries for this filter.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <Fragment key={r.id}>
                    <TableRow data-state={expanded === r.id ? 'selected' : undefined}>
                      <TableCell className="pl-4">{fmt(r.created_at)}</TableCell>
                      <TableCell>
                        {r.actor_role ?? '—'} ({r.actor_id?.slice(0, 8) ?? '—'})
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{r.action}</Badge>
                      </TableCell>
                      <TableCell>
                        {r.entity}
                        {r.entity_id ? `/${r.entity_id.slice(0, 8)}` : ''}
                      </TableCell>
                      <TableCell>{r.client ?? '—'}</TableCell>
                      <TableCell className="pr-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`expand-${r.id}`}
                          onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                        >
                          {expanded === r.id ? 'Hide' : 'Details'}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expanded === r.id && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={6} className="px-4 whitespace-normal" data-testid="audit-detail">
                          <p className="mb-2 text-xs font-medium">
                            {r.action} · {r.entity} · {fmt(r.created_at)}
                            {r.source_ip ? ` · ${r.source_ip}` : ''}
                          </p>
                          <div className="grid gap-3 text-xs sm:grid-cols-2">
                            <div>
                              <p className="mb-1 text-muted-foreground">Before</p>
                              <pre className="overflow-x-auto rounded-md bg-muted p-2">
                                {JSON.stringify(r.before ?? null, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <p className="mb-1 text-muted-foreground">After</p>
                              <pre className="overflow-x-auto rounded-md bg-muted p-2">
                                {JSON.stringify(r.after ?? null, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
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
