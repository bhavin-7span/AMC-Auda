import { Suspense, type ReactNode } from 'react';
import { AppShell } from '@/components/shell/AppShell';
import { PageLoader } from '@/components/ui/page-loader';

export const metadata = { title: 'AUDA FieldTrack — Admin' };

/**
 * Layout for all authenticated Admin Panel sections. Wraps pages in the responsive
 * shell with role-aware navigation. Route protection (redirect to /login) is added
 * in Phase 2; for now the shell renders with a guest nav when unauthenticated.
 *
 * The shell paints immediately. Page data streams inside the main area.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </AppShell>
  );
}
