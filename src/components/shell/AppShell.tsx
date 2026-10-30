'use client';

import { Suspense, startTransition, useEffect, useState, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { PageHeader, RoutedPageHeader, Topbar } from './Topbar';
import { createClient } from '@/lib/supabase/client';
import { isRole, navForRole, type Role } from '@/lib/nav/navigation';
import type { FeatureFlags } from '@/lib/config/feature-flags';

const CLOSED_FLAGS: FeatureFlags = {
  challanEnabled: false,
  routeTrackingEnabled: false,
};

/**
 * Application shell. Role and feature flags are resolved in the browser after
 * hydration so the prerendered chrome does not read the clock during auth.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [flags, setFlags] = useState<FeatureFlags>(CLOSED_FLAGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    void (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        let nextRole: Role | null = null;
        if (user) {
          const { data, error } = await supabase.rpc('inspection_role');
          nextRole = !error && isRole(data) ? data : null;
        }
        const { data: settings } = await supabase
          .from('app_settings')
          .select('challan_enabled, route_tracking_enabled')
          .eq('id', 1)
          .maybeSingle();
        if (!active) return;
        startTransition(() => {
          setEmail(user?.email ?? null);
          setRole(nextRole);
          setFlags({
            challanEnabled: Boolean(settings?.challan_enabled),
            routeTrackingEnabled: Boolean(settings?.route_tracking_enabled),
          });
          setLoaded(true);
        });
      } catch {
        if (!active) return;
        startTransition(() => {
          setEmail(null);
          setRole(null);
          setFlags(CLOSED_FLAGS);
          setLoaded(true);
        });
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const sections = navForRole(role, flags);
  const roleLabel = role ?? 'guest';

  return (
    <div className="flex h-screen flex-col overflow-hidden md:flex-row">
      <Sidebar sections={sections} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
        <Topbar email={email} roleLabel={roleLabel} />
        {/* relative: absolutely positioned descendants (sr-only text, chart tooltips) must
            resolve against the scroller, or they stretch the document and add a window scrollbar. */}
        <main className="relative flex flex-1 flex-col overflow-y-auto">
          <div className="flex-1 px-5 pt-6 pb-6 md:px-7">
            <Suspense fallback={<PageHeader pathname={null} sections={sections} loaded={loaded} />}>
              <RoutedPageHeader sections={sections} loaded={loaded} />
            </Suspense>
            {children}
          </div>
          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-4 text-xs text-muted-foreground md:px-7">
            <span>AUDA FieldTrack · Ahmedabad Urban Development Authority</span>
            <span>Web Administration, Dashboard &amp; MIS</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
