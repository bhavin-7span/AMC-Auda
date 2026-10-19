import { createClient } from '@/lib/supabase/server';
import { adminListInspections, type AdminInspectionRow } from '@/lib/data/admin';
import { InspectionsList } from './InspectionsList';

const PAGE_SIZE = 20;

/**
 * Field inspection administration & monitoring — list (Phase 5.1). Server-side paging
 * and filters via admin_list_inspections (admin/dept_head/supervisor-gated in the RPC).
 */
export default async function InspectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(0, Number.parseInt(sp.page ?? '0', 10) || 0);

  const supabase = await createClient();

  let error: string | null = null;
  let rows: AdminInspectionRow[] = [];
  let total = 0;

  try {
    const result = await adminListInspections(supabase, {
      page,
      pageSize: PAGE_SIZE,
      status: sp.status ?? null,
      search: sp.q ?? null,
    });
    rows = result.rows;
    total = result.total;
  } catch (e) {
    error =
      e instanceof Error && /not authorized/i.test(e.message)
        ? 'You do not have permission to view inspections.'
        : 'Could not load inspections.';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inspections</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Monitor, assign and review field inspections.
        </p>
      </div>

      {error ? (
        <p className="rounded-md border border-red-500/40 bg-red-50 px-3 py-2 text-sm text-red-900 dark:bg-red-950/60 dark:text-red-100">
          {error}
        </p>
      ) : (
        <InspectionsList rows={rows} total={total} page={page} pageSize={PAGE_SIZE} />
      )}
    </div>
  );
}
