import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Sign out: invalidates the Supabase session server-side (req 1.6) and redirects to
 * the login page. Accepts POST (from a form) to avoid CSRF via simple GET navigation.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
}
