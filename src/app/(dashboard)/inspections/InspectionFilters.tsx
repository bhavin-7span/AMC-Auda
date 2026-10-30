'use client';

import { useState, type ReactNode } from 'react';
import { Filter, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectOptions, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { INSPECTION_STATUS } from '@/lib/inspection-status';

export interface FilterOption {
  id: string;
  name: string;
}

const STATUS_ITEMS = [
  { value: '', label: 'All statuses' },
  ...Object.entries(INSPECTION_STATUS).map(([value, s]) => ({ value, label: s.label })),
];

/** Keys set from the filter sheet (status has its own select in the toolbar). */
const FILTER_KEYS = ['department', 'type', 'assignee', 'from', 'to'];

export interface InspectionFilterValues {
  q?: string;
  status?: string;
  department?: string;
  type?: string;
  assignee?: string;
  from?: string;
  to?: string;
}

/**
 * Inspection list toolbar (RFP 9.4 / 17): live search, a status select and a filter
 * sheet for department, category, user and date range. All write the URL so the server
 * page re-queries admin_list_inspections. `right` adds extra controls (e.g. Columns).
 */
export function InspectionFilters({
  departments,
  types,
  staff,
  current,
  right,
}: {
  departments: FilterOption[];
  types: FilterOption[];
  staff: FilterOption[];
  current: InspectionFilterValues;
  right?: ReactNode;
}) {
  const filters = useUrlFilters({ filterKeys: FILTER_KEYS });
  const [open, setOpen] = useState(false);

  const selects: { name: keyof InspectionFilterValues; label: string; items: { value: string; label: string }[] }[] = [
    { name: 'department', label: 'Department', items: departments.map((d) => ({ value: d.id, label: d.name })) },
    { name: 'type', label: 'Type', items: types.map((t) => ({ value: t.id, label: t.name })) },
    { name: 'assignee', label: 'Assigned officer', items: staff.map((s) => ({ value: s.id, label: s.name })) },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3" data-testid="table-toolbar">
      <div className="relative w-full sm:w-80">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={filters.search}
          onChange={(e) => filters.setSearch(e.target.value)}
          placeholder="Search inspections…"
          aria-label="Search inspections"
          data-testid="inspection-search"
          className="h-9 pl-9"
        />
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Select
          items={STATUS_ITEMS}
          value={current.status ?? ''}
          onValueChange={(v) => filters.setParam('status', v || null)}
        >
          <SelectTrigger className="h-9 w-40" aria-label="Status" data-testid="inspection-status">
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
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button variant="outline" size="lg" data-testid="filter-toggle" />}>
            <Filter /> Filters
            {filters.activeCount > 0 && (
              <Badge className="h-4 min-w-4 px-1 text-[10px]" data-testid="filter-count">
                {filters.activeCount}
              </Badge>
            )}
          </SheetTrigger>
          <SheetContent data-testid="filter-drawer">
            <form
              key={filters.formKey}
              action={(fd) => {
                filters.apply(fd);
                setOpen(false);
              }}
              className="flex h-full flex-col"
            >
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <FieldGroup className="flex-1 overflow-y-auto px-4">
                {selects.map((s) => {
                  const items = [{ value: '', label: 'All' }, ...s.items];
                  return (
                    <Field key={s.name}>
                      <FieldLabel htmlFor={s.name}>{s.label}</FieldLabel>
                      <Select name={s.name} items={items} defaultValue={current[s.name] ?? ''}>
                        <SelectTrigger id={s.name} className="h-9 w-full" data-testid={`inspection-${s.name}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent alignItemWithTrigger={false}>
                          <SelectOptions items={items} />
                        </SelectContent>
                      </Select>
                    </Field>
                  );
                })}
                <Field>
                  <FieldLabel htmlFor="from">Scheduled from</FieldLabel>
                  <Input id="from" name="from" type="date" className="h-9" defaultValue={current.from ?? ''} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="to">Scheduled to</FieldLabel>
                  <Input id="to" name="to" type="date" className="h-9" defaultValue={current.to ?? ''} />
                </Field>
              </FieldGroup>
              <SheetFooter className="flex-row justify-end border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    filters.clear();
                    setOpen(false);
                  }}
                  data-testid="filter-clear"
                >
                  Clear
                </Button>
                <Button type="submit" data-testid="inspection-apply">
                  Apply
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
        {right}
      </div>
    </div>
  );
}
