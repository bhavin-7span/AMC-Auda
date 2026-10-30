import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getAssignableStaff, getTravelReport, type AssignableStaff, type TravelReport } from '@/lib/data/inspections';
import { MapContainer } from '@/components/ui/MapContainer';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TravelForm } from './TravelForm';

/**
 * Travel / activity report (Phase 5.8). Shows a staff member's route + distance for a
 * day. Gated server-side on route_tracking_enabled (admin_travel_report returns
 * enabled:false when off, so we explain rather than show empty data). Privacy-respecting:
 * only authorized roles, only when AUDA has enabled route tracking (RFP 9.1).
 */
export default async function TravelPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string; date?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  let error: string | null = null;
  let staff: AssignableStaff[] = [];
  let report: TravelReport | null = null;

  try {
    staff = await getAssignableStaff(supabase);
    if (sp.user && sp.date) {
      report = await getTravelReport(supabase, sp.user, sp.date);
    }
  } catch (e) {
    error =
      e instanceof Error && /not authorized/i.test(e.message)
        ? 'You do not have permission to view travel reports.'
        : 'Could not load travel data.';
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2" nativeButton={false} render={<Link href="/inspections" />}>
        <ArrowLeft /> Inspections
      </Button>

      {error ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : (
        <>
          <TravelForm staff={staff} current={{ user: sp.user, date: sp.date }} />

          {report && !report.enabled && (
            <p
              className="rounded-md border border-amber-500/40 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
              data-testid="travel-disabled"
            >
              Route tracking is disabled. Enable it in configuration (and obtain the
              required privacy/administrative approvals) to view travel reports.
            </p>
          )}

          {report && report.enabled && (
            <div className="space-y-4" data-testid="travel-result">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { title: 'Distance travelled', value: `${(report.distance_m / 1000).toFixed(2)} km` },
                  // { title: 'Location points', value: report.count },
                ].map((s) => (
                  <Card key={s.title} size="sm" data-testid="widget">
                    <CardHeader>
                      <CardDescription>{s.title}</CardDescription>
                      <CardTitle
                        className="text-2xl font-semibold tabular-nums group-data-[size=sm]/card:text-2xl"
                        data-testid="widget-value"
                      >
                        {s.value}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                ))}
              </div>
              <MapContainer
                label={`Route — ${report.count} points`}
                height={360}
                route
                points={report.points.map((p, i) => ({
                  id: String(i),
                  lat: p.lat,
                  lon: p.lon,
                  // Only the first and last points are pinned on a route map.
                  label: `${i === 0 ? 'Check in' : 'Check out'} — ${new Date(p.at).toLocaleString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                  })}`,
                }))}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
