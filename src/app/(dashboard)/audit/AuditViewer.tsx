'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { FilterBar } from '@/components/ui/FilterBar';
import { Button, Field, Input } from '@/components/ui/Form';
import type { AuditRow } from '@/lib/data/admin';

function fmt(ts: string): string {
  return new Date(ts).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

/**
 * Read-only audit log viewer (Phase 9). Filters (action, entity, date range) live in the
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

  function buildQuery(overrides: Record<string, string>): string {
    const params = new URLSearchParams();
    for (const key of ['action', 'entity', 'from', 'to'] as const) {
      const val = overrides[key] ?? filters[key];
      if (val) params.set(key, val);
    }
    if (overrides.page) params.set('page', overrides.page);
    return params.toString();
  }

  function apply(formData: FormData) {
    router.push(
      `/audit?${buildQuery({
        action: String(formData.get('action') ?? ''),
        entity: String(formData.get('entity') ?? ''),
        from: String(formData.get('from') ?? ''),
        to: String(formData.get('to') ?? ''),
      })}`,
    );
  }

  function goToPage(next: number) {
    router.push(`/audit?${buildQuery({ page: String(next) })}`);
  }

  const columns: Column<AuditRow>[] = [
    { key: 'created_at', header: 'Time (IST)', cell: (r) => fmt(r.created_at) },
    { key: 'actor', header: 'Actor', cell: (r) => `${r.actor_role ?? '—'} (${r.actor_id?.slice(0, 8) ?? '—'})` },
    { key: 'action', header: 'Action', cell: (r) => r.action },
    { key: 'entity', header: 'Entity', cell: (r) => `${r.entity}${r.entity_id ? `/${r.entity_id.slice(0, 8)}` : ''}` },
    { key: 'client', header: 'Client', cell: (r) => r.client ?? '—' },
    {
      key: 'detail',
      header: '',
      className: 'text-right',
      cell: (r) => (
        <Button
          variant="ghost"
          data-testid={`expand-${r.id}`}
          onClick={() => setExpanded(expanded === r.id ? null : r.id)}
        >
          {expanded === r.id ? 'Hide' : 'Details'}
        </Button>
      ),
    },
  ];

  const expandedRow = rows.find((r) => r.id === expanded);

  return (
    <div className="space-y-4">
      <form action={apply}>
        <FilterBar onClear={() => router.push('/audit')}>
          <Field label="Action" htmlFor="action">
            <Input id="action" name="action" defaultValue={filters.action ?? ''} placeholder="e.g. set_role" />
          </Field>
          <Field label="Entity" htmlFor="entity">
            <Input id="entity" name="entity" defaultValue={filters.entity ?? ''} placeholder="e.g. staff_roles" />
          </Field>
          <Field label="From" htmlFor="from">
            <Input id="from" name="from" type="date" defaultValue={filters.from ?? ''} />
          </Field>
          <Field label="To" htmlFor="to">
            <Input id="to" name="to" type="date" defaultValue={filters.to ?? ''} />
          </Field>
          <Button type="submit" data-testid="audit-apply">
            Search
          </Button>
        </FilterBar>
      </form>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={goToPage}
        emptyMessage="No audit entries for this filter."
      />

      {expandedRow && (
        <div className="rounded-lg border border-black/10 p-4 text-xs dark:border-white/15" data-testid="audit-detail">
          <p className="mb-2 font-medium">
            {expandedRow.action} · {expandedRow.entity} · {fmt(expandedRow.created_at)}
            {expandedRow.source_ip ? ` · ${expandedRow.source_ip}` : ''}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-zinc-500">Before</p>
              <pre className="overflow-x-auto rounded bg-black/[.04] p-2 dark:bg-white/[.06]">
                {JSON.stringify(expandedRow.before ?? null, null, 2)}
              </pre>
            </div>
            <div>
              <p className="mb-1 text-zinc-500">After</p>
              <pre className="overflow-x-auto rounded bg-black/[.04] p-2 dark:bg-white/[.06]">
                {JSON.stringify(expandedRow.after ?? null, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
