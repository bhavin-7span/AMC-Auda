import { createClient } from '@/lib/supabase/server';
import { getSystemHealth, type SystemHealth } from '@/lib/data/notifications';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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

  if (error) {
    return (
      <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {error}
      </p>
    );
  }
  if (!health) return null;

  const sections = [
    { title: 'Record counts', testId: 'health-counts', grid: 'sm:grid-cols-2 lg:grid-cols-4', entries: health.counts },
    { title: 'Synchronization', testId: 'health-sync', grid: 'sm:grid-cols-2 lg:grid-cols-3', entries: health.sync },
    { title: 'Feature flags', testId: 'health-flags', grid: 'sm:grid-cols-2', entries: health.flags },
  ];

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">Checked {fmt(health.checked_at)} IST</p>

      {sections.map((s) => (
        <section key={s.testId} className="space-y-2">
          <h2 className="text-lg font-medium">{s.title}</h2>
          <div className={`grid gap-3 ${s.grid}`} data-testid={s.testId}>
            {Object.entries(s.entries as Record<string, unknown>).map(([k, v]) => (
              <Card key={k} size="sm" data-testid="widget">
                <CardHeader>
                  <CardDescription className="capitalize">{k.replace(/_/g, ' ')}</CardDescription>
                  <CardTitle
                    className="text-2xl font-semibold tabular-nums group-data-[size=sm]/card:text-2xl"
                    data-testid="widget-value"
                  >
                    {typeof v === 'boolean' ? (
                      <Badge variant={v ? 'success' : 'outline'}>{fmt(v)}</Badge>
                    ) : (
                      fmt(v)
                    )}
                  </CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
