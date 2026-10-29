import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import type { AdminListResult } from './admin';

type Client = SupabaseClient<Database>;

/**
 * Typed data-access for the M-Challan module (optional, gated by challan_enabled).
 * All writes go through admin-gated, audited RPCs; reads are RLS-guarded.
 */

export type ChallanStatus = 'draft' | 'issued' | 'paid' | 'cancelled';

export interface ChallanRow {
  id: string;
  ref_no: string;
  status: ChallanStatus;
  violation: string;
  offender_name: string | null;
  amount: number | null;
  challan_type: string | null;
  department: string | null;
  created_ist: string;
}

export interface ChallanDetail {
  id: string;
  ref_no: string;
  status: ChallanStatus;
  status_name: string | null;
  violation: string;
  rule_section: string | null;
  reason: string | null;
  offender_name: string | null;
  offender_contact: string | null;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  amount: number | null;
  evidence_path: string | null;
  challan_type: string | null;
  department: string | null;
  issuer_name: string | null;
  issued_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  created_at: string;
}

export interface ChallanFilters {
  search?: string | null;
  status?: ChallanStatus | null;
  department?: string | null;
  page?: number;
  pageSize?: number;
}

export async function listChallans(
  supabase: Client,
  f: ChallanFilters = {},
): Promise<AdminListResult<ChallanRow>> {
  const { data, error } = await supabase.rpc('admin_list_challans', {
    p_search: f.search ?? undefined,
    p_status: f.status ?? undefined,
    p_department: f.department ?? undefined,
    p_page: f.page ?? 0,
    p_page_size: f.pageSize ?? 20,
  });
  if (error) throw error;
  return data as unknown as AdminListResult<ChallanRow>;
}

export async function getChallanDetail(supabase: Client, id: string): Promise<ChallanDetail> {
  const { data, error } = await supabase.rpc('admin_challan_detail', { p_id: id });
  if (error) throw error;
  return data as unknown as ChallanDetail;
}

export async function upsertChallan(supabase: Client, payload: Record<string, unknown>) {
  const { data, error } = await supabase.rpc('admin_upsert_challan', { p_payload: payload as never });
  if (error) throw error;
  return data;
}

export async function transitionChallan(
  supabase: Client,
  id: string,
  action: 'issue' | 'pay' | 'cancel',
) {
  const { data, error } = await supabase.rpc('admin_transition_challan', {
    p_id: id,
    p_action: action,
  });
  if (error) throw error;
  return data;
}

export interface ChallanTypeOption {
  id: string;
  name: string;
  rule_section: string | null;
  department_id: string | null;
}

export async function listActiveChallanTypes(supabase: Client): Promise<ChallanTypeOption[]> {
  const { data, error } = await supabase
    .from('challan_types')
    .select('id, name, rule_section, department_id')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return (data ?? []) as ChallanTypeOption[];
}
