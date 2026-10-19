import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getAssignableStaff, getTravelReport, type AssignableStaff, type TravelReport } from '@/lib/data/inspections';
import { MapContainer } from '@/components/ui/MapContainer';
import { Widget } from '@/components/ui/Widget';
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
      <div>
        <Link href="/inspections" className="text-sm text-zinc-500 hover:underline">
          ← Inspections
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Travel &amp; Activity</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Route and distance travelled by field staff for a day.
        </p>
      </div>

      {error ? (
        <p className="rounded-md border border-red-500/40 bg-red-50 px-3 py-2 text-sm text-red-900 dark:bg-red-950/60 dark:text-red-100">
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
                <Widget title="Distance travelled" value={`${(report.distance_m / 1000).toFixed(2)} km`} />
                <Widget title="Location points" value={report.count} />
              </div>
              <MapContainer label={`Route — ${report.count} points`} height={320} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
