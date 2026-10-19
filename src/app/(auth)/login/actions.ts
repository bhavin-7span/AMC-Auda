'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export interface LoginState {
  error: string | null;
}

/**
 * Server action: sign in with email + password against Supabase Auth.
 *
 * Returns a GENERIC error on failure (req 1.2 — never reveal whether the email or the
 * password was wrong). On success, redirects to the dashboard. Supabase Auth enforces
 * password policy, lockout and (if enabled) leaked-password protection server-side.
 */
export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { error: 'Enter your email and password.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Generic message regardless of the underlying reason (req 1.2).
    // NOTE: failed-login auditing is sourced from Supabase Auth's own server-side logs,
    // not written here — there is no authenticated session to attribute the write to, and
    // an anon-writable audit path would be an abuse vector.
    return { error: 'Invalid email or password.' };
  }

  // Record the successful login in the append-only audit trail (req 9.1). We now have a
  // session, so write_audit_log can attribute it to the user.
  try {
    await supabase.rpc('write_audit_log', {
      p_action: 'login',
      p_entity: 'auth.users',
      p_entity_id: undefined,
      p_before: undefined,
      p_after: undefined,
      p_client: 'web',
    });
  } catch {
    // Non-fatal: never block sign-in on an audit write.
  }

  redirect('/dashboard');
}
