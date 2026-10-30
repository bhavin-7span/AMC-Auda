import Link from 'next/link';
import { Route } from 'lucide-react';
import { PageActions } from '@/components/shell/Topbar';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { adminListInspections, type AdminInspectionRow } from '@/lib/data/admin';
import { getDashboardWidgets } from '@/lib/data/dashboard';
import { getAssignableStaff } from '@/lib/data/inspections';
import { CreateInspectionDialog } from './CreateInspectionDialog';
import { InspectionsList } from './InspectionsList';
import { type FilterOption, type InspectionFilterValues } from './InspectionFilters';

const PAGE_SIZE = 20;

/**
 * Field inspection administration & monitoring — list (Phase 5.1). Server-side paging
 * and filters via admin_list_inspections (admin/dept_head/supervisor-gated in the RPC).
 * `?inspection=<id>` opens that inspection in the detail drawer.
 */
export default async function InspectionsPage({
  searchParams,
}: {
  searchParams: Promise<InspectionFilterValues & { page?: string; inspection?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(0, Number.parseInt(sp.page ?? '0', 10) || 0);

  const supabase = await createClient();

  let error: string | null = null;
  let rows: AdminInspectionRow[] = [];
  let total = 0;
  let departments: FilterOption[] = [];
  let types: FilterOption[] = [];
  let staff: FilterOption[] = [];
  let assigneeNames: Record<string, string> = {};
  let pendingCount = 0;

  try {
    const [result, depts, typeRows, staffRows, widgets] = await Promise.all([
      adminListInspections(supabase, {
        page,
        pageSize: PAGE_SIZE,
        status: sp.status || null,
        search: sp.q || null,
        department: sp.department || null,
        type: sp.type || null,
        assignedTo: sp.assignee || null,
        from: sp.from ? `${sp.from}T00:00:00+05:30` : null,
        to: sp.to ? `${sp.to}T23:59:59+05:30` : null,
      }),
      supabase.from('departments').select('id, name').eq('is_active', true).order('sort_order'),
      supabase.from('inspection_types').select('id, name').eq('is_active', true).order('sort_order'),
      // The assignee filter is a convenience; never fail the list if it can't load.
      getAssignableStaff(supabase).catch(() => []),
      // Tab badge only; the list still renders if the counts cannot load.
      getDashboardWidgets(supabase, { department: sp.department || null }).catch(() => null),
    ]);
    rows = result.rows;
    total = result.total;
    departments = (depts.data ?? []) as FilterOption[];
    types = (typeRows.data ?? []) as FilterOption[];
    staff = staffRows.map((s) => ({ id: s.user_id, name: `${s.full_name} (${s.employee_id})` }));
    assigneeNames = Object.fromEntries(staffRows.map((s) => [s.user_id, s.full_name]));
    pendingCount = widgets?.inspections.by_status.submitted ?? 0;
  } catch (e) {
    error =
      e instanceof Error && /not authorized/i.test(e.message)
        ? 'You do not have permission to view inspections.'
        : 'Could not load inspections.';
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : (
        <>
          <PageActions>
            <Button
              variant="outline"
              size="lg"
              nativeButton={false}
              render={<Link href="/inspections/travel" data-testid="travel-link" />}
            >
              <Route /> Travel report
            </Button>
            <CreateInspectionDialog triggerLabel="Create inspection" />
          </PageActions>
          <InspectionsList
            rows={rows}
            total={total}
            page={page}
            pageSize={PAGE_SIZE}
            current={sp}
            pendingCount={pendingCount}
            departments={departments}
            types={types}
            staff={staff}
            assigneeNames={assigneeNames}
          />
        </>
      )}
    </div>
  );
}
