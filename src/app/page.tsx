import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// This route reads the per-request Supabase session and only redirects (renders nothing),
// so it must render at request time, not be prerendered (Next 16 cacheComponents).
export const instant = false;

/**
 * Root route: send users straight to where they belong.
 *  - authenticated  → /dashboard
 *  - unauthenticated → /login
 *
 * The old backend-connection landing page is retained for diagnostics at /api/health.
 */
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? '/dashboard' : '/login');
}
