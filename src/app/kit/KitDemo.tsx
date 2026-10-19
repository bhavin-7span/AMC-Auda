'use client';

import { useMemo, useState } from 'react';
import { Button, Field, Input, Select } from '@/components/ui/Form';
import { FilterBar } from '@/components/ui/FilterBar';
import { Widget } from '@/components/ui/Widget';
import { MapContainer } from '@/components/ui/MapContainer';
import { DataTable, type Column, type SortState } from '@/components/ui/DataTable';
import { useToast } from '@/components/ui/Toast';

interface DemoRow {
  id: string;
  ref: string;
  title: string;
  status: string;
}

// Local sample data to exercise the controlled table. Real screens fetch from the
// backend (RLS reads / admin RPCs); this is UI-kit demonstration only.
const ALL_ROWS: DemoRow[] = Array.from({ length: 23 }, (_, i) => ({
  id: String(i + 1),
  ref: `INS-2026-${String(i + 1).padStart(6, '0')}`,
  title: `Sample inspection ${i + 1}`,
  status: ['new', 'assigned', 'in_progress', 'completed'][i % 4],
}));

const PAGE_SIZE = 5;

export function KitDemo() {
  const { show } = useToast();
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<SortState | null>({ column: 'ref', direction: 'asc' });

  const sorted = useMemo(() => {
    const rows = [...ALL_ROWS];
    if (sort) {
      rows.sort((a, b) => {
        const av = a[sort.column as keyof DemoRow];
        const bv = b[sort.column as keyof DemoRow];
        const cmp = String(av).localeCompare(String(bv));
        return sort.direction === 'asc' ? cmp : -cmp;
      });
    }
    return rows;
  }, [sort]);

  const pageRows = sorted.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const columns: Column<DemoRow>[] = [
    { key: 'ref', header: 'Reference', sortable: true, cell: (r) => r.ref },
    { key: 'title', header: 'Title', sortable: true, cell: (r) => r.title },
    { key: 'status', header: 'Status', cell: (r) => r.status },
  ];

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Widgets</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Widget title="Open inspections" value="12" hint="across 4 departments" />
          <Widget title="Present today" value="38" hint="of 50 staff" />
          <Widget title="Attendance exceptions" value="3" hint="outside geo-fence" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Form controls &amp; filters</h2>
        <FilterBar onClear={() => show('Filters cleared', 'info')}>
          <Field label="Search" htmlFor="q">
            <Input id="q" placeholder="Search…" />
          </Field>
          <Field label="Status" htmlFor="status">
            <Select id="status" defaultValue="">
              <option value="">All</option>
              <option value="new">New</option>
              <option value="completed">Completed</option>
            </Select>
          </Field>
          <Button data-testid="toast-success" onClick={() => show('Saved successfully', 'success')}>
            Trigger success toast
          </Button>
          <Button
            variant="danger"
            data-testid="toast-error"
            onClick={() => show('Something went wrong', 'error')}
          >
            Trigger error toast
          </Button>
        </FilterBar>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Data table</h2>
        <DataTable
          columns={columns}
          rows={pageRows}
          rowKey={(r) => r.id}
          page={page}
          pageSize={PAGE_SIZE}
          total={ALL_ROWS.length}
          sort={sort}
          onPageChange={setPage}
          onSortChange={(s) => {
            setSort(s);
            setPage(0);
          }}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Map container</h2>
        <MapContainer label="Inspection locations" />
      </section>
    </div>
  );
}
