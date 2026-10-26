import { Suspense, type ReactNode } from 'react';
import { AppShell } from '@/components/shell/AppShell';

export const metadata = { title: 'AUDA FieldTrack — Admin' };

/**
 * Layout for all authenticated Admin Panel sections. Wraps pages in the responsive
 * shell with role-aware navigation. Route protection (redirect to /login) is added
 * in Phase 2; for now the shell renders with a guest nav when unauthenticated.
 *
 * The shell reads per-request session cookies (to resolve the role), so it streams
 * via <Suspense> under Next 16 cacheComponents.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}

/**
 * Fallback shown while the shell resolves the role. Deliberately renders ONLY the
 * chrome (no `children`): rendering children in both the fallback and the resolved
 * tree causes a transient duplicate of the page content in the DOM during streaming.
 */
function ShellFallback() {
  return (
    <div className="flex h-screen flex-col overflow-hidden md:flex-row">
      <div className="md:h-screen md:w-64 md:shrink-0 border-black/10 md:border-r dark:border-white/15" />
      <main className="flex-1 overflow-y-auto p-6" />
    </div>
  );
}
