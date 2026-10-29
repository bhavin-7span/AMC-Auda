import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getFeatureFlags } from '@/lib/config/feature-flags';
import { listChallans, listActiveChallanTypes, type ChallanRow, type ChallanStatus, type ChallanTypeOption } from '@/lib/data/challans';

import { ChallanList } from './ChallanList';
import { ChallanFilters } from './ChallanFilters';
import { CreateChallan, type DeptOption } from './CreateChallan';

const VALID_STATUSES: ChallanStatus[] = ['draft', 'issued', 'paid', 'cancelled'];

const PAGE_SIZE = 20;

/**
 * M-Challan module (full). Gated behind app_settings.challan_enabled — 404 when off, so
 * no challan surface is reachable while the optional module is disabled. When enabled:
 * list + create challans; detail/issue/pay/cancel/PDF on the [id] page.
 */
export default async function ChallanPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; q?: string; department?: string }>;
}) {
  const flags = await getFeatureFlags();
  if (!flags.challanEnabled) notFound();

  const sp = await searchParams;
  const page = Math.max(0, Number.parseInt(sp.page ?? '0', 10) || 0);
  const status = VALID_STATUSES.includes(sp.status as ChallanStatus) ? (sp.status as ChallanStatus) : null;
  const supabase = await createClient();

  let error: string | null = null;
  let rows: ChallanRow[] = [];
  let total = 0;
  let challanTypes: ChallanTypeOption[] = [];
  let departments: DeptOption[] = [];

  try {
    const [list, types, depts] = await Promise.all([
      listChallans(supabase, {
        page,
        pageSize: PAGE_SIZE,
        status,
        search: sp.q || null,
        department: sp.department || null,
      }),
      listActiveChallanTypes(supabase),
      supabase.from('departments').select('id, name').eq('is_active', true).order('sort_order'),
    ]);
    rows = list.rows;
    total = list.total;
    challanTypes = types;
    departments = (depts.data ?? []) as DeptOption[];
  } catch (e) {
    error =
      e instanceof Error && /not authorized/i.test(e.message)
        ? 'You do not have permission to manage challans.'
        : 'Could not load challans.';
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : (
        <>
          <ChallanFilters
            departments={departments}
            current={sp}
            left={<CreateChallan challanTypes={challanTypes} departments={departments} />}
          />
          <ChallanList rows={rows} total={total} page={page} pageSize={PAGE_SIZE} />
        </>
      )}
    </div>
  );
}
