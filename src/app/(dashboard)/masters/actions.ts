'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { upsertMaster, setMasterActive, bulkUploadMaster, type MasterType, type MasterBulkResult } from '@/lib/data/masters';

export interface MasterActionState {
  ok: boolean;
  error: string | null;
}

export interface MasterBulkState {
  result: MasterBulkResult | null;
  error: string | null;
}

const TYPES: MasterType[] = [
  'department',
  'inspection_type',
  'shift',
  'work_location',
  'challan_type',
];

/** Parse CSV (header + rows) into an array of record objects for bulk master upload. */
function parseMasterCsv(text: string): Record<string, unknown>[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  const rows: Record<string, unknown>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map((c) => c.trim());
    const row: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      if (h) row[h] = cells[idx] ?? '';
    });
    rows.push(row);
  }
  return rows;
}

/** Bulk upload master records from pasted CSV (admin only, per-row results, audited). */
export async function bulkUploadMasterAction(
  _prev: MasterBulkState,
  formData: FormData,
): Promise<MasterBulkState> {
  const type = String(formData.get('type') ?? '') as MasterType;
  if (!TYPES.includes(type)) return { result: null, error: 'Unknown master type.' };
  const rows = parseMasterCsv(String(formData.get('csv') ?? ''));
  if (rows.length === 0) {
    return { result: null, error: 'No data rows found. Include a header row and at least one record.' };
  }
  try {
    const supabase = await createClient();
    const result = await bulkUploadMaster(supabase, type, rows);
    revalidatePath('/masters');
    return { result, error: null };
  } catch (e) {
    const m = e instanceof Error ? e.message : 'Bulk upload failed.';
    return { result: null, error: /not authorized/i.test(m) ? 'Not authorized.' : m };
  }
}

function cleanError(e: unknown): string {
  const m = e instanceof Error ? e.message : 'Operation failed.';
  return /not authorized/i.test(m) ? 'Not authorized.' : m;
}

/** Upsert a master record from a form. Admin-gated + audited by the RPC. */
export async function upsertMasterAction(
  _prev: MasterActionState,
  formData: FormData,
): Promise<MasterActionState> {
  const type = String(formData.get('type') ?? '') as MasterType;
  if (!TYPES.includes(type)) return { ok: false, error: 'Unknown master type.' };

  // Build a payload from known fields per type; empty id => create.
  const payload: Record<string, unknown> = {};
  const id = String(formData.get('id') ?? '').trim();
  if (id) payload.id = id;

  for (const [key, value] of formData.entries()) {
    if (key === 'type' || key === 'id') continue;
    payload[key] = typeof value === 'string' ? value : String(value);
  }
  // Checkbox: is_active present only when checked.
  payload.is_active = formData.get('is_active') === 'on' || formData.get('is_active') === 'true';

  try {
    const supabase = await createClient();
    await upsertMaster(supabase, type, payload);
    revalidatePath('/masters');
    return { ok: true, error: null };
  } catch (e) {
    return { ok: false, error: cleanError(e) };
  }
}

/** Toggle a master record's active state (soft-delete / reactivate). */
export async function setMasterActiveAction(
  _prev: MasterActionState,
  formData: FormData,
): Promise<MasterActionState> {
  const type = String(formData.get('type') ?? '') as MasterType;
  const id = String(formData.get('id') ?? '');
  const active = String(formData.get('active') ?? '') === 'true';
  if (!TYPES.includes(type) || !id) return { ok: false, error: 'Invalid request.' };

  try {
    const supabase = await createClient();
    await setMasterActive(supabase, type, id, active);
    revalidatePath('/masters');
    return { ok: true, error: null };
  } catch (e) {
    return { ok: false, error: cleanError(e) };
  }
}
