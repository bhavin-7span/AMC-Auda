import { createClient } from '@/lib/supabase/server';
import { adminAuditSearch, type AuditRow } from '@/lib/data/admin';
import { AuditViewer } from './AuditViewer';

const PAGE_SIZE = 25;

/**
 * Audit trail & activity logs (Phase 9). Read-only, searchable view over the append-only
 * audit_log via admin_audit_search (admin/dept_head only). The log records create/update/
 * delete, role/user changes, master/config changes, attendance corrections and exports
 * from across the panel. Append-only is guaranteed at the DB (no UPDATE/DELETE policy).
 */
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; entity?: string; from?: string; to?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(0, Number.parseInt(sp.page ?? '0', 10) || 0);

  const supabase = await createClient();

  let error: string | null = null;
  let rows: AuditRow[] = [];
  let total = 0;

  try {
    const result = await adminAuditSearch(supabase, {
      action: sp.action ?? null,
      entity: sp.entity ?? null,
      from: sp.from ? `${sp.from}T00:00:00+05:30` : null,
      to: sp.to ? `${sp.to}T23:59:59+05:30` : null,
      page,
      pageSize: PAGE_SIZE,
    });
    rows = result.rows;
    total = result.total;
  } catch (e) {
    error =
      e instanceof Error && /not authorized/i.test(e.message)
        ? 'You do not have permission to view the audit trail.'
        : 'Could not load the audit trail.';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Trail</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Append-only record of administrative and data actions across the system.
        </p>
      </div>

      {error ? (
        <p className="rounded-md border border-red-500/40 bg-red-50 px-3 py-2 text-sm text-red-900 dark:bg-red-950/60 dark:text-red-100">
          {error}
        </p>
      ) : (
        <AuditViewer
          rows={rows}
          total={total}
          page={page}
          pageSize={PAGE_SIZE}
          filters={{ action: sp.action, entity: sp.entity, from: sp.from, to: sp.to }}
        />
      )}
    </div>
  );
}
