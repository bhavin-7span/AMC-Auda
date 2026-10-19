import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/**
 * Server-only Supabase client using the SERVICE ROLE key.
 *
 * ONLY for privileged Auth admin operations that have no user-scoped API: creating
 * accounts, resetting passwords, and enabling/disabling users (Supabase Auth admin API).
 * This key bypasses RLS, so it must never reach the browser — the `server-only` import
 * guards against accidental client bundling, and the key comes from a non-public env var.
 *
 * Returns null when SUPABASE_SERVICE_ROLE_KEY is not configured, so callers can degrade
 * gracefully instead of crashing. All business reads/writes still go through the normal
 * RLS/RPC client; this is reserved for the Auth admin API alone.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) return null;

  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** True when the Auth admin API can be used (service role key present). */
export function isAdminApiConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
