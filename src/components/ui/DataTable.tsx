'use client';

import type { ReactNode } from 'react';

/**
 * Generic, controlled data table for the Admin Panel.
 *
 * Paging, sorting and filtering are SERVER-SIDE: this component renders state and
 * emits intent via callbacks. Feature screens own the data fetching (RLS-guarded
 * reads / admin RPCs) and pass rows + total back in. Keeps all list screens
 * consistent and keeps large datasets off the client.
 */

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  column: string;
  direction: SortDirection;
}

export interface Column<Row> {
  /** Key sent to the server for sorting; also the test id suffix. */
  key: string;
  header: string;
  /** Cell renderer. */
  cell: (row: Row) => ReactNode;
  /** Whether this column is sortable (server-side). */
  sortable?: boolean;
  className?: string;
}

export interface DataTableProps<Row> {
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  /** Zero-based page index. */
  page: number;
  pageSize: number;
  /** Total matching rows on the server (for page count). */
  total: number;
  sort?: SortState | null;
  loading?: boolean;
  emptyMessage?: string;
  onPageChange: (page: number) => void;
  onSortChange?: (sort: SortState) => void;
}

export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  page,
  pageSize,
  total,
  sort,
  loading = false,
  emptyMessage = 'No records found.',
  onPageChange,
  onSortChange,
}: DataTableProps<Row>) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);

  function toggleSort(col: Column<Row>) {
    if (!col.sortable || !onSortChange) return;
    const nextDir: SortDirection =
      sort?.column === col.key && sort.direction === 'asc' ? 'desc' : 'asc';
    onSortChange({ column: col.key, direction: nextDir });
  }

  return (
    <div className="space-y-3" data-testid="data-table">
      <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 bg-black/[.02] dark:border-white/15 dark:bg-white/[.03]">
            <tr>
              {columns.map((col) => {
                const isSorted = sort?.column === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={`px-3 py-2 font-medium ${col.className ?? ''}`}
                    aria-sort={
                      isSorted ? (sort!.direction === 'asc' ? 'ascending' : 'descending') : 'none'
                    }
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        data-testid={`sort-${col.key}`}
                        onClick={() => toggleSort(col)}
                        className="inline-flex items-center gap-1 hover:underline"
                      >
                        {col.header}
                        <span aria-hidden className="text-xs text-zinc-400">
                          {isSorted ? (sort!.direction === 'asc' ? '▲' : '▼') : '↕'}
                        </span>
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-6 text-center text-zinc-500">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  data-testid="data-table-empty"
                  className="px-3 py-6 text-center text-zinc-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  className="border-b border-black/[.06] last:border-0 dark:border-white/[.08]"
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-3 py-2 ${col.className ?? ''}`}>
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
        <span data-testid="data-table-range">
          {from}–{to} of {total}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="page-prev"
            disabled={page <= 0}
            onClick={() => onPageChange(page - 1)}
            className="rounded border border-black/15 px-2 py-1 disabled:opacity-40 dark:border-white/20"
          >
            Previous
          </button>
          <span data-testid="page-indicator">
            Page {page + 1} of {pageCount}
          </span>
          <button
            type="button"
            data-testid="page-next"
            disabled={page >= pageCount - 1}
            onClick={() => onPageChange(page + 1)}
            className="rounded border border-black/15 px-2 py-1 disabled:opacity-40 dark:border-white/20"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
