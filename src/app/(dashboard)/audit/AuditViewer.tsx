'use client';

import { useRouter } from 'next/navigation';
import { Fragment, useState } from 'react';
import { ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Pagination, PaginationContent, PaginationItem } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import {
  ACTION_LABELS,
  ENTITY_LABELS,
  actionLabel,
  clientLabel,
  describeChanges,
  fmtDateTime,
  recordLabel,
  roleLabel,
  type NameLookup,
} from '@/lib/audit-labels';

const FILTER_KEYS = ['entity', 'from', 'to'];

const ACTION_ITEMS = [
  { value: '', label: 'All actions' },
  ...Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label })),
];
const ENTITY_ITEMS = [
  { value: '', label: 'All records' },
  ...Object.entries(ENTITY_LABELS).map(([value, label]) => ({ value, label })),
];

/**
 * Read-only audit log viewer (Phase 9). Action and record-type/date filters live in the
 * URL so the server re-queries admin_audit_search. Codes are shown as plain-language
 * labels, and rows expand to a field-by-field "what changed" summary instead of raw
 * JSON. The log is append-only (no edit/delete affordances) — the real guarantee is the
 * DB (no UPDATE/DELETE policy on audit_log).
 */
export function AuditViewer({
  rows,
  total,
  page,
  pageSize,
  names,
  filters,
}: {
  rows: AuditRow[];
  total: number;
  page: number;
  pageSize: number;
  names: NameLookup;
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
        <Select
          items={ACTION_ITEMS}
          value={filters.action ?? ''}
          onValueChange={(v) => url.setParam('action', v ? String(v) : null)}
        >
          <SelectTrigger aria-label="Action" data-testid="audit-search" className="h-9 flex-1 bg-card sm:w-60 sm:flex-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {ACTION_ITEMS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                <SheetDescription>Narrow the audit log by record type and date.</SheetDescription>
              </SheetHeader>
              <FieldGroup className="flex-1 overflow-y-auto p-4">
                <Field>
                  <FieldLabel htmlFor="entity">Record type</FieldLabel>
                  <Select name="entity" items={ENTITY_ITEMS} defaultValue={filters.entity ?? ''}>
                    <SelectTrigger id="entity" className="h-9 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      {ENTITY_ITEMS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <TableHead>Done by</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Record</TableHead>
                <TableHead>Source</TableHead>
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
                rows.map((r) => {
                  const actor = (r.actor_id && names[r.actor_id]) || null;
                  const record = recordLabel(r, names);
                  const changes = describeChanges(r, names);
                  const isEdit = r.before != null && r.after != null;
                  return (
                    <Fragment key={r.id}>
                      <TableRow data-state={expanded === r.id ? 'selected' : undefined}>
                        <TableCell className="pl-4">{fmtDateTime(r.created_at)}</TableCell>
                        <TableCell>
                          <div className="font-medium">{actor ?? roleLabel(r.actor_role) ?? 'System'}</div>
                          {actor && r.actor_role && (
                            <div className="text-xs text-muted-foreground">{roleLabel(r.actor_role)}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{actionLabel(r.action)}</Badge>
                        </TableCell>
                        <TableCell>{record ?? <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell>{clientLabel(r.client) ?? '—'}</TableCell>
                        <TableCell className="pr-4 text-right">
                          {changes.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`expand-${r.id}`}
                              onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                            >
                              {expanded === r.id ? 'Hide' : 'Details'}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                      {expanded === r.id && (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={6} className="px-4 whitespace-normal" data-testid="audit-detail">
                            <p className="mb-2 text-xs text-muted-foreground">
                              {isEdit ? 'What changed' : 'Details recorded'}
                              {r.source_ip ? ` · IP address ${r.source_ip}` : ''}
                            </p>
                            <div className="max-w-3xl overflow-hidden rounded-md border text-sm">
                              <table className="w-full">
                                <thead className="bg-muted text-xs text-muted-foreground">
                                  <tr>
                                    <th className="px-3 py-1.5 text-left font-medium">Field</th>
                                    {isEdit && <th className="px-3 py-1.5 text-left font-medium">Before</th>}
                                    <th className="px-3 py-1.5 text-left font-medium">{isEdit ? 'After' : 'Value'}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {changes.map((c) => (
                                    <tr key={c.field} className="border-t">
                                      <td className="px-3 py-1.5 text-muted-foreground">{c.field}</td>
                                      {isEdit && <td className="px-3 py-1.5">{c.before ?? '—'}</td>}
                                      <td className="px-3 py-1.5 font-medium">
                                        {(isEdit ? c.after : (c.after ?? c.before)) ?? '—'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })
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
