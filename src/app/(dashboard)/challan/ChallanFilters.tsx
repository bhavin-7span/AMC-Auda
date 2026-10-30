'use client';

import { useState, type ReactNode } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectOptions, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useUrlFilters } from '@/hooks/use-url-filters';
import type { DeptOption } from './CreateChallan';

const STATUS_ITEMS = [
  { value: '', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'issued', label: 'Issued' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
];

/**
 * Challan history toolbar (RFP 9.3: challan history, status, department-wise): live
 * search plus a status/department filter sheet. Writes the URL so the server page
 * re-queries admin_list_challans.
 */
export function ChallanFilters({
  departments,
  current,
  left,
}: {
  departments: DeptOption[];
  current: { q?: string; status?: string; department?: string };
  left?: ReactNode;
}) {
  const filters = useUrlFilters({ filterKeys: ['status', 'department'] });
  const [open, setOpen] = useState(false);
  const deptItems = [{ value: '', label: 'All' }, ...departments.map((d) => ({ value: d.id, label: d.name }))];

  return (
    <div className="flex flex-wrap items-center gap-3" data-testid="table-toolbar">
      <div className="flex flex-wrap items-center gap-3">{left}</div>
      <div className="ml-auto flex w-full items-center gap-2 sm:w-auto">
        <div className="relative flex-1 sm:w-72 sm:flex-none">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={filters.search}
            onChange={(e) => filters.setSearch(e.target.value)}
            placeholder="Search reference, violation or offender"
            aria-label="Search reference, violation or offender"
            data-testid="challan-search"
            className="h-9 bg-card pl-8"
          />
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button
                variant="outline"
                size="icon-lg"
                className="relative bg-card"
                aria-label="Show filters"
                data-testid="filter-toggle"
              />
            }
          >
            <SlidersHorizontal />
            {filters.activeCount > 0 && (
              <Badge className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[10px]" data-testid="filter-count">
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
                <SheetDescription>Narrow challans by status and department.</SheetDescription>
              </SheetHeader>
              <FieldGroup className="flex-1 overflow-y-auto px-4">
                <Field>
                  <FieldLabel htmlFor="challan-status-filter">Status</FieldLabel>
                  <Select name="status" items={STATUS_ITEMS} defaultValue={current.status ?? ''}>
                    <SelectTrigger id="challan-status-filter" className="h-9 w-full">
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
                <Field>
                  <FieldLabel htmlFor="challan-department-filter">Department</FieldLabel>
                  <Select name="department" items={deptItems} defaultValue={current.department ?? ''}>
                    <SelectTrigger id="challan-department-filter" className="h-9 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      <SelectOptions items={deptItems} />
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
              <SheetFooter className="flex-row justify-end border-t">
                <Button
                  type="button"
                  variant="outline"
                  data-testid="filter-clear"
                  onClick={() => {
                    filters.clear();
                    setOpen(false);
                  }}
                >
                  Clear
                </Button>
                <Button type="submit" data-testid="challan-apply">
                  Apply
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
