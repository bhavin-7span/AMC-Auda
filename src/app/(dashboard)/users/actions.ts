'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { adminSetRole, type StaffRole } from '@/lib/data/admin';

export interface ActionResult {
  ok: boolean;
  error: string | null;
}

const ROLES: StaffRole[] = ['field_officer', 'supervisor', 'dept_head', 'admin'];

/**
 * Set a user's role / department / supervisor via the admin_set_role RPC.
 * Authorization is enforced server-side by the RPC (admin only); this action is a
 * thin, audited passthrough. The audit entry is written inside the RPC.
 */
export async function setUserRoleAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const userId = String(formData.get('userId') ?? '');
  const role = String(formData.get('role') ?? '') as StaffRole;
  const departmentId = (formData.get('departmentId') as string) || null;

  if (!userId) return { ok: false, error: 'Missing user.' };
  if (!ROLES.includes(role)) return { ok: false, error: 'Invalid role.' };

  try {
    const supabase = await createClient();
    await adminSetRole(supabase, { userId, role, departmentId });
    revalidatePath('/users');
    return { ok: true, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Could not update role.';
    // Surface a clean message; RPC raises a 42501 for non-admins.
    return { ok: false, error: /not authorized/i.test(message) ? 'Not authorized.' : message };
  }
}
