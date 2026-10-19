import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from './database.types';

/** Paths that never require authentication. (`/kit` is a dev-only showcase, 404 in prod.) */
const PUBLIC_PATHS = ['/login', '/logout', '/api/health', '/kit'];

/** Paths treated as the public landing/root that should not force a redirect. */
const ROOT_PATHS = ['/'];

function isPublic(pathname: string): boolean {
  if (ROOT_PATHS.includes(pathname)) return true;
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Refreshes the Supabase auth session on each request, keeps cookies in sync, AND
 * enforces route protection:
 *  - unauthenticated users hitting a protected route are redirected to /login
 *  - authenticated users hitting /login are redirected to /dashboard
 *
 * The redirect here is a convenience/first line of defense; the real authorization
 * gate is backend RLS + SECURITY DEFINER RPCs (see .kiro/steering/backend.md).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return supabaseResponse;

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // Touch the user to trigger a token refresh when needed and learn auth state.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Unauthenticated → protected route: send to login, remembering where they wanted.
  if (!user && !isPublic(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated → login page: send to the dashboard.
  if (user && pathname === '/login') {
    const dashUrl = request.nextUrl.clone();
    dashUrl.pathname = '/dashboard';
    dashUrl.search = '';
    return NextResponse.redirect(dashUrl);
  }

  return supabaseResponse;
}
