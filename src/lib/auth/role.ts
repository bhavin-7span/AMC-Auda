import { createClient } from '@/lib/supabase/server';
import { isRole, type Role } from '@/lib/nav/navigation';

export interface UserContext {
  email: string | null;
  role: Role | null;
}

/**
 * Resolves the current user's email + role for the Admin Panel shell in one pass.
 *
 * Returns null email/role when there is no authenticated session or no staff_roles
 * row yet. The role drives cosmetic nav visibility only; RLS/RPC enforce the real
 * gate (see .kiro/steering/backend.md).
 */
export async function getCurrentUserContext(): Promise<UserContext> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { email: null, role: null };

    const { data, error } = await supabase.rpc('inspection_role');
    const role = !error && isRole(data) ? data : null;

    return { email: user.email ?? null, role };
  } catch {
    return { email: null, role: null };
  }
}

/** Convenience: just the role (nav filtering, guards). */
export async function getCurrentRole(): Promise<Role | null> {
  return (await getCurrentUserContext()).role;
}
