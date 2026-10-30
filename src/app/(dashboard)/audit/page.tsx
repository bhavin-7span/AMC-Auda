import { createClient } from '@/lib/supabase/server';
import { adminAuditSearch, adminListUsers, type AuditRow } from '@/lib/data/admin';
import { MASTER_TABLES, referencedIds, type NameLookup } from '@/lib/audit-labels';
import { AuditViewer } from './AuditViewer';

const PAGE_SIZE = 25;

/** Look up display names for the users, departments and master records a page refers to. */
async function resolveNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: AuditRow[],
): Promise<NameLookup> {
  const ids = referencedIds(rows);
  const lookups: PromiseLike<{ data: { id: string; name: string }[] | null }>[] = [];
  if (ids.people.length) {
    // employee_profiles RLS only exposes the caller's own row; the admin RPC sees everyone.
    lookups.push(
      adminListUsers(supabase, { pageSize: 1000 }).then((r) => ({
        data: r.rows.map((u) => ({ id: u.id, name: u.full_name })),
      })),
    );
  }
  const masterIds: Record<string, string[]> = { ...ids.masters };
  masterIds.department = [...(masterIds.department ?? []), ...ids.departments];
  for (const [entity, list] of Object.entries(masterIds)) {
    const table = MASTER_TABLES[entity as keyof typeof MASTER_TABLES];
    if (table && list.length) lookups.push(supabase.from(table).select('id, name').in('id', list));
  }
  const results = await Promise.all(lookups);
  return Object.fromEntries(results.flatMap((r) => (r.data ?? []).map((d) => [d.id, d.name])));
}

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
  let names: NameLookup = {};

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
    // Names are a readability aid; the log still renders if a lookup fails.
    names = await resolveNames(supabase, rows).catch(() => ({}));
  } catch (e) {
    error =
      e instanceof Error && /not authorized/i.test(e.message)
        ? 'You do not have permission to view the audit trail.'
        : 'Could not load the audit trail.';
  }

  return (
    <div className="space-y-6">
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
          names={names}
          filters={{ action: sp.action, entity: sp.entity, from: sp.from, to: sp.to }}
        />
      )}
    </div>
  );
}
