import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { getCurrentUserContext } from '@/lib/auth/role';
import { navForRole } from '@/lib/nav/navigation';
import { getFeatureFlags } from '@/lib/config/feature-flags';

/**
 * Server-side application shell: resolves the caller's email + role + feature flags,
 * filters navigation to what that role may see (optional modules gated by flags), and
 * lays out a responsive sidebar + top bar. Nav filtering is cosmetic; backend RLS/RPC is
 * the real gate.
 */
export async function AppShell({ children }: { children: ReactNode }) {
  const [{ email, role }, flags] = await Promise.all([
    getCurrentUserContext(),
    getFeatureFlags(),
  ]);
  const sections = navForRole(role, flags);
  const roleLabel = role ?? 'guest';

  return (
    // Lock the shell to the viewport height; only the content <main> scrolls.
    <div className="flex h-screen flex-col overflow-hidden md:flex-row">
      <Sidebar sections={sections} roleLabel={roleLabel} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Topbar email={email} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
