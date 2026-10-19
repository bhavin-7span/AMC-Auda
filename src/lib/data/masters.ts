import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

type Client = SupabaseClient<Database>;

/**
 * Typed data-access for master data (Phase 4).
 *
 * Reads use the existing authenticated-read RLS on each master table. Writes and
 * soft-delete go through the admin-gated, audited RPCs admin_upsert_master /
 * admin_set_master_active (see .kiro/steering/backend.md). This module is the single
 * entry point for master data; prefer it over ad-hoc table/RPC calls.
 */

export type MasterType =
  | 'department'
  | 'inspection_type'
  | 'shift'
  | 'work_location'
  | 'challan_type';

/** Returns the signed-in user's role from staff_roles, or null if unauthenticated. */
export async function getInspectionRole(supabase: Client): Promise<string | null> {
  const { data, error } = await supabase.rpc('inspection_role');
  if (error) throw error;
  return data ?? null;
}

export interface DepartmentRow {
  id: string;
  code: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

export async function listDepartments(supabase: Client): Promise<DepartmentRow[]> {
  const { data, error } = await supabase
    .from('departments')
    .select('id, code, name, sort_order, is_active')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as DepartmentRow[];
}

export interface WorkLocationRow {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_m: number;
  is_active: boolean;
}

export async function listWorkLocations(supabase: Client): Promise<WorkLocationRow[]> {
  const { data, error } = await supabase
    .from('work_locations')
    .select('id, name, latitude, longitude, radius_m, is_active')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as WorkLocationRow[];
}

export interface InspectionTypeRow {
  id: string;
  code: string;
  name: string;
  min_evidence: number;
  sort_order: number;
  is_active: boolean;
}

export async function listInspectionTypes(supabase: Client): Promise<InspectionTypeRow[]> {
  const { data, error } = await supabase
    .from('inspection_types')
    .select('id, code, name, min_evidence, sort_order, is_active')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as InspectionTypeRow[];
}

export interface ShiftRow {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  min_work_minutes: number;
  is_active: boolean;
}

export async function listShifts(supabase: Client): Promise<ShiftRow[]> {
  const { data, error } = await supabase
    .from('shifts')
    .select('id, name, start_time, end_time, min_work_minutes, is_active')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ShiftRow[];
}

export interface ChallanTypeRow {
  id: string;
  code: string;
  name: string;
  rule_section: string | null;
  sort_order: number;
  is_active: boolean;
}

export async function listChallanTypes(supabase: Client): Promise<ChallanTypeRow[]> {
  const { data, error } = await supabase
    .from('challan_types')
    .select('id, code, name, rule_section, sort_order, is_active')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ChallanTypeRow[];
}

/** Create/update a master record (admin only, audited). */
export async function upsertMaster(
  supabase: Client,
  type: MasterType,
  payload: Record<string, unknown>,
) {
  const { data, error } = await supabase.rpc('admin_upsert_master', {
    p_type: type,
    p_payload: payload as never,
  });
  if (error) throw error;
  return data;
}

/** Soft-delete / reactivate a master record via is_active (admin only, audited). */
export async function setMasterActive(
  supabase: Client,
  type: MasterType,
  id: string,
  active: boolean,
) {
  const { error } = await supabase.rpc('admin_set_master_active', {
    p_type: type,
    p_id: id,
    p_active: active,
  });
  if (error) throw error;
}

export interface MasterBulkResult {
  total: number;
  ok: number;
  failed: number;
  results: { row: number; ok: boolean; error?: string }[];
}

/** Bulk upsert master records from parsed rows (admin only, per-row results, audited). */
export async function bulkUploadMaster(
  supabase: Client,
  type: MasterType,
  rows: Record<string, unknown>[],
): Promise<MasterBulkResult> {
  const { data, error } = await supabase.rpc('admin_bulk_upload_master', {
    p_type: type,
    p_rows: rows as never,
  });
  if (error) throw error;
  return data as unknown as MasterBulkResult;
}
