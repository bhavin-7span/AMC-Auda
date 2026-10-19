'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { adminBulkUploadUsers, type BulkUploadResult } from '@/lib/data/admin';
import { parseCsv } from './csv';

export interface BulkActionState {
  result: BulkUploadResult | null;
  error: string | null;
}

/** Bulk upload users from pasted CSV. Admin-gated + audited by the RPC. */
export async function bulkUploadUsersAction(
  _prev: BulkActionState,
  formData: FormData,
): Promise<BulkActionState> {
  const csv = String(formData.get('csv') ?? '');
  const rows = parseCsv(csv);
  if (rows.length === 0) {
    return { result: null, error: 'No data rows found. Include a header row and at least one record.' };
  }

  try {
    const supabase = await createClient();
    const result = await adminBulkUploadUsers(supabase, rows);
    revalidatePath('/users');
    return { result, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Bulk upload failed.';
    return { result: null, error: /not authorized/i.test(message) ? 'Not authorized.' : message };
  }
}
