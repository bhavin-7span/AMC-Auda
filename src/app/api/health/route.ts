import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Connectivity check against the existing Auda RFP Supabase backend.
 *
 * Reads a public master table (departments) to prove the client is configured and
 * can reach the project. Does not require an authenticated session.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('departments')
      .select('id', { count: 'exact', head: true });

    if (error) {
      return NextResponse.json(
        { ok: false, backend: 'auda-rfp', error: error.message },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, backend: 'auda-rfp' });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ ok: false, backend: 'auda-rfp', error: message }, { status: 500 });
  }
}
