'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getFeatureFlags } from '@/lib/config/feature-flags';
import { getChallanDetail, transitionChallan, upsertChallan, type ChallanDetail } from '@/lib/data/challans';

export interface ChallanActionState {
  ok: boolean;
  error: string | null;
  id?: string;
}

function cleanError(e: unknown): string {
  const m = e instanceof Error ? e.message : 'Operation failed.';
  if (/not authorized/i.test(m)) return 'Not authorized.';
  if (/invalid transition/i.test(m)) return 'That action is not allowed from the current status.';
  return m;
}

/** Create or update a challan (draft). Admin/dept_head only; audited server-side. */
export async function saveChallanAction(
  _prev: ChallanActionState,
  formData: FormData,
): Promise<ChallanActionState> {
  const violation = String(formData.get('violation') ?? '').trim();
  if (!violation) return { ok: false, error: 'Violation is required.' };

  const payload: Record<string, unknown> = {};
  const id = String(formData.get('id') ?? '').trim();
  if (id) payload.id = id;
  for (const key of [
    'challan_type_id',
    'department_id',
    'violation',
    'rule_section',
    'reason',
    'offender_name',
    'offender_contact',
    'location_name',
    'latitude',
    'longitude',
    'amount',
  ]) {
    const v = String(formData.get(key) ?? '').trim();
    if (v !== '') payload[key] = v;
  }

  try {
    const supabase = await createClient();
    const result = (await upsertChallan(supabase, payload)) as { id: string };
    revalidatePath('/challan');
    return { ok: true, error: null, id: result.id };
  } catch (e) {
    return { ok: false, error: cleanError(e) };
  }
}

/** Issue / pay / cancel a challan. */
export async function transitionChallanAction(
  _prev: ChallanActionState,
  formData: FormData,
): Promise<ChallanActionState> {
  const id = String(formData.get('id') ?? '');
  const action = String(formData.get('action') ?? '') as 'issue' | 'pay' | 'cancel';
  if (!id || !['issue', 'pay', 'cancel'].includes(action)) {
    return { ok: false, error: 'Invalid request.' };
  }
  try {
    const supabase = await createClient();
    await transitionChallan(supabase, id, action);
    revalidatePath('/challan');
    return { ok: true, error: null };
  } catch (e) {
    return { ok: false, error: cleanError(e) };
  }
}

export type ChallanDrawerData = { ok: true; detail: ChallanDetail } | { ok: false; error: string };

/** Detail for the challan drawer; role-scoped by admin_challan_detail, gated on the flag. */
export async function loadChallanDrawer(id: string): Promise<ChallanDrawerData> {
  const flags = await getFeatureFlags();
  if (!flags.challanEnabled) return { ok: false, error: 'Challans are not enabled.' };
  try {
    const supabase = await createClient();
    return { ok: true, detail: await getChallanDetail(supabase, id) };
  } catch (e) {
    const m = cleanError(e);
    return { ok: false, error: /not found|P0002/i.test(m) ? 'Challan not found.' : m };
  }
}
