import { Suspense } from 'react';
import { PageLoader } from '@/components/ui/page-loader';
import { DashboardView } from './dashboard-view';

/**
 * Role-scoped dashboard. The view reads the URL and loads widgets in the
 * browser, inside Suspense, so prerender does not touch the session clock.
 */
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<PageLoader />}>
        <DashboardView />
      </Suspense>
    </div>
  );
}
