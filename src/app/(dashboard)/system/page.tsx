import { createClient } from '@/lib/supabase/server';
import { getSystemHealth, type SystemHealth } from '@/lib/data/notifications';
import { Widget } from '@/components/ui/Widget';

function fmt(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'On' : 'Off';
  if (typeof v === 'string' && /\d{4}-\d{2}-\d{2}T/.test(v)) {
    return new Date(v).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  }
  return String(v);
}

/**
 * System health & monitoring (Phase 10.3, admin-only). Surfaces integration/sync signals
 * from admin_system_health: record counts, offline/sync backlog, last activity, and
 * feature flags. Read-only; no sensitive data is exposed.
 */
export default async function SystemPage() {
  const supabase = await createClient();

  let error: string | null = null;
  let health: SystemHealth | null = null;

  try {
    health = await getSystemHealth(supabase);
  } catch (e) {
    error =
      e instanceof Error && /not authorized/i.test(e.message)
        ? 'You do not have permission to view system health.'
        : 'Could not load system health.';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">System Health</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Integration, synchronization and operational status.
        </p>
      </div>

      {error ? (
        <p className="rounded-md border border-red-500/40 bg-red-50 px-3 py-2 text-sm text-red-900 dark:bg-red-950/60 dark:text-red-100">
          {error}
        </p>
      ) : health ? (
        <>
          <p className="text-xs text-zinc-500">Checked {fmt(health.checked_at)} IST</p>

          <section className="space-y-2">
            <h2 className="text-lg font-medium">Record counts</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="health-counts">
              {Object.entries(health.counts).map(([k, v]) => (
                <Widget key={k} title={k.replace(/_/g, ' ')} value={v} />
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-medium">Synchronization</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="health-sync">
              {Object.entries(health.sync).map(([k, v]) => (
                <Widget key={k} title={k.replace(/_/g, ' ')} value={fmt(v)} />
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-medium">Feature flags</h2>
            <div className="grid gap-3 sm:grid-cols-2" data-testid="health-flags">
              {Object.entries(health.flags).map(([k, v]) => (
                <Widget key={k} title={k.replace(/_/g, ' ')} value={fmt(v)} />
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
