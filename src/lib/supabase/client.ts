import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

/**
 * Browser-side Supabase client for the AUDA FieldTrack Admin Panel.
 *
 * Connects to the existing shared "Auda RFP" project. Only the public
 * publishable/anon key is used here; Row-Level Security on the backend is the
 * real authorization guard (see .kiro/steering/backend.md).
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Copy .env.example to .env.local and fill in the Auda RFP project values.',
    );
  }

  return createBrowserClient<Database>(url, key);
}
