'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, isAdminApiConfigured } from '@/lib/supabase/admin';
import { getCurrentRole } from '@/lib/auth/role';
import type { StaffRole } from '@/lib/data/admin';

export interface AccountActionResult {
  ok: boolean;
  error: string | null;
  /** Present on successful create. */
  userId?: string;
}

const NOT_CONFIGURED =
  'Account administration is not configured. Set SUPABASE_SERVICE_ROLE_KEY on the server to enable creating users, resetting passwords and activating/deactivating accounts.';

/**
 * Guards every account-lifecycle action: the caller must be an admin (checked via the
 * user-scoped RLS client / inspection_role), AND the Auth admin API must be configured.
 * Returns a typed failure instead of throwing so the UI can show a clean message.
 */
async function requireAdminAndAdminApi(): Promise<
  { ok: true; admin: NonNullable<ReturnType<typeof createAdminClient>>; actorId: string | null } | { ok: false; error: string }
> {
  const role = await getCurrentRole();
  if (role !== 'admin') return { ok: false, error: 'Not authorized.' };

  if (!isAdminApiConfigured()) return { ok: false, error: NOT_CONFIGURED };
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: NOT_CONFIGURED };

  // Capture the acting admin for the audit entry.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { ok: true, admin, actorId: user?.id ?? null };
}

async function writeAudit(action: string, entityId: string, after: Record<string, unknown>) {
  const supabase = await createClient();
  await supabase.rpc('write_audit_log', {
    p_action: action,
    p_entity: 'auth.users',
    p_entity_id: entityId,
    p_before: undefined,
    p_after: after as never,
    p_client: 'web',
  });
}

/**
 * Create a new auth user, their employee profile and role. (3.3 / 3.1 create path.)
 * The password is set now; a production flow may instead send an invite. All privileged
 * steps run under the service role; the profile/role go through the audited admin RPCs.
 */
export async function createUserAction(
  _prev: AccountActionResult,
  formData: FormData,
): Promise<AccountActionResult> {
  const guard = await requireAdminAndAdminApi();
  if (!guard.ok) return { ok: false, error: guard.error };

  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const employeeId = String(formData.get('employeeId') ?? '').trim();
  const fullName = String(formData.get('fullName') ?? '').trim();
  const role = String(formData.get('role') ?? 'field_officer') as StaffRole;

  if (!email || !password || !employeeId) {
    return { ok: false, error: 'Email, password and employee ID are required.' };
  }

  const { data, error } = await guard.admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    return { ok: false, error: error?.message ?? 'Could not create user.' };
  }

  const userId = data.user.id;

  // Profile + role via the audited admin RPCs (user-scoped client, admin-gated).
  const supabase = await createClient();
  const { error: profileError } = await supabase.rpc('admin_upsert_employee_profile', {
    p_user_id: userId,
    p_employee_id: employeeId,
    p_full_name: fullName,
    p_email: email,
  });
  if (profileError) return { ok: false, error: profileError.message };

  const { error: roleError } = await supabase.rpc('admin_set_role', {
    p_user_id: userId,
    p_role: role,
  });
  if (roleError) return { ok: false, error: roleError.message };

  await writeAudit('create_user', userId, { email, employee_id: employeeId, role });
  revalidatePath('/users');
  return { ok: true, error: null, userId };
}

/** Reset a user's password via the Auth admin API. (3.3) */
export async function resetPasswordAction(
  _prev: AccountActionResult,
  formData: FormData,
): Promise<AccountActionResult> {
  const guard = await requireAdminAndAdminApi();
  if (!guard.ok) return { ok: false, error: guard.error };

  const userId = String(formData.get('userId') ?? '');
  const password = String(formData.get('password') ?? '');
  if (!userId || !password) return { ok: false, error: 'User and new password are required.' };

  const { error } = await guard.admin.auth.admin.updateUserById(userId, { password });
  if (error) return { ok: false, error: error.message };

  await writeAudit('reset_password', userId, { reset: true });
  return { ok: true, error: null };
}

/**
 * Enable/disable an account. Supabase disables login by banning the user; we use a long
 * ban duration to deactivate and 'none' to reactivate. (3.3 / 3.1 activate-deactivate.)
 */
export async function setUserActiveAction(
  _prev: AccountActionResult,
  formData: FormData,
): Promise<AccountActionResult> {
  const guard = await requireAdminAndAdminApi();
  if (!guard.ok) return { ok: false, error: guard.error };

  const userId = String(formData.get('userId') ?? '');
  const active = String(formData.get('active') ?? '') === 'true';
  if (!userId) return { ok: false, error: 'Missing user.' };

  // ban_duration: 'none' re-enables; a long duration disables login.
  const { error } = await guard.admin.auth.admin.updateUserById(userId, {
    ban_duration: active ? 'none' : '876000h',
  });
  if (error) return { ok: false, error: error.message };

  await writeAudit(active ? 'activate_user' : 'deactivate_user', userId, { active });
  revalidatePath('/users');
  return { ok: true, error: null };
}
