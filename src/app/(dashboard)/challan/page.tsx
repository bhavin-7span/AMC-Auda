import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getFeatureFlags } from '@/lib/config/feature-flags';
import { listChallans, listActiveChallanTypes, type ChallanRow, type ChallanStatus, type ChallanTypeOption } from '@/lib/data/challans';

const VALID_STATUSES: ChallanStatus[] = ['draft', 'issued', 'paid', 'cancelled'];
import { ChallanList } from './ChallanList';
import { CreateChallan, type DeptOption } from './CreateChallan';

const PAGE_SIZE = 20;

/**
 * M-Challan module (full). Gated behind app_settings.challan_enabled — 404 when off, so
 * no challan surface is reachable while the optional module is disabled. When enabled:
 * list + create challans; detail/issue/pay/cancel/PDF on the [id] page.
 */
export default async function ChallanPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; q?: string }>;
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
      listChallans(supabase, { page, pageSize: PAGE_SIZE, status, search: sp.q ?? null }),
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">M-Challan</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Create, issue and track challans. Generate a challan PDF with a unique reference number.
        </p>
      </div>

      {error ? (
        <p className="rounded-md border border-red-500/40 bg-red-50 px-3 py-2 text-sm text-red-900 dark:bg-red-950/60 dark:text-red-100">
          {error}
        </p>
      ) : (
        <>
          <CreateChallan challanTypes={challanTypes} departments={departments} />
          <ChallanList rows={rows} total={total} page={page} pageSize={PAGE_SIZE} />
        </>
      )}
    </div>
  );
}
