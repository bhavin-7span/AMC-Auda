import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  getInspectionDetail,
  getManagerActions,
  getAssignableStaff,
  signEvidenceUrls,
  type ManagerAction,
  type AssignableStaff,
} from '@/lib/data/inspections';
import { MapContainer } from '@/components/ui/MapContainer';
import type { MapPoint } from '@/components/ui/map-types';
import { InspectionActions } from './InspectionActions';

function fmt(ts: string | null | undefined): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

/**
 * Inspection detail (Phase 5.4/5.5/5.9): summary, evidence viewer, map, event timeline,
 * comments and manager workflow actions. All data comes from get_inspection_detail,
 * which enforces view/manage authorization server-side.
 */
export default async function InspectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  let detail;
  try {
    detail = await getInspectionDetail(supabase, id);
  } catch (e) {
    if (e instanceof Error && /not found|IN404/i.test(e.message)) notFound();
    throw e;
  }

  const insp = detail.inspection;
  let actions: ManagerAction[] = [];
  let staff: AssignableStaff[] = [];
  if (detail.can_manage) {
    [actions, staff] = await Promise.all([
      getManagerActions(supabase, insp.status),
      getAssignableStaff(supabase),
    ]);
  }

  // Signed URLs for private evidence objects (short-lived).
  const signedUrls = await signEvidenceUrls(
    supabase,
    detail.evidence.map((e) => e.storage_path),
  );

  // Map markers: the inspection location (captured GPS if present, else planned) plus
  // any geo-tagged evidence points.
  const inspLat = insp.gps_latitude ?? insp.latitude;
  const inspLon = insp.gps_longitude ?? insp.longitude;
  const mapPoints: MapPoint[] = [];
  if (Number.isFinite(inspLat) && Number.isFinite(inspLon)) {
    mapPoints.push({ id: 'inspection', lat: inspLat as number, lon: inspLon as number, label: `${insp.ref_no} — inspection location` });
  }
  for (const e of detail.evidence) {
    if (e.latitude != null && e.longitude != null) {
      mapPoints.push({ id: e.id, lat: e.latitude, lon: e.longitude, label: `Evidence (${e.media_type})` });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/inspections" className="text-sm text-zinc-500 hover:underline">
          ← Inspections
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight" data-testid="inspection-ref">
          {insp.ref_no}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">{insp.title}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="grid grid-cols-2 gap-3 rounded-lg border border-black/10 p-4 text-sm dark:border-white/15">
            <Detail label="Status" value={String(insp.status)} testid="detail-status" />
            <Detail label="Priority" value={String(insp.priority)} />
            <Detail label="Department" value={insp.department_name ?? '—'} />
            <Detail label="Type" value={insp.type_name ?? '—'} />
            <Detail label="Assignee" value={insp.assignee_name ?? 'Unassigned'} />
            <Detail label="Created by" value={insp.creator_name ?? '—'} />
            <Detail label="Location" value={insp.location_name ?? '—'} />
            <Detail label="Scheduled" value={fmt(insp.scheduled_at)} />
          </section>

          {insp.supervisor_remarks && (
            <section className="rounded-lg border border-black/10 p-4 text-sm dark:border-white/15">
              <h3 className="mb-1 font-medium">Supervisor remarks</h3>
              <p className="text-zinc-600 dark:text-zinc-400">{insp.supervisor_remarks}</p>
            </section>
          )}

          <section className="space-y-2">
            <h3 className="text-sm font-medium">Location</h3>
            <MapContainer label={`${insp.ref_no} location`} height={260} points={mapPoints} />
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-medium">Evidence ({detail.evidence.length})</h3>
            {detail.evidence.length === 0 ? (
              <p className="text-sm text-zinc-500">No evidence captured.</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="evidence-list">
                {detail.evidence.map((e) => {
                  const url = signedUrls[e.storage_path];
                  return (
                    <li
                      key={e.id}
                      data-testid={`evidence-${e.id}`}
                      className="overflow-hidden rounded-md border border-black/10 dark:border-white/15"
                    >
                      <div className="aspect-video bg-black/[.04] dark:bg-white/[.04]">
                        {url && e.media_type === 'photo' ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={url}
                            alt={`Evidence captured ${fmt(e.captured_at)}`}
                            data-testid={`evidence-img-${e.id}`}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : url && e.media_type === 'video' ? (
                          <video
                            src={url}
                            controls
                            data-testid={`evidence-video-${e.id}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                            {e.media_type} unavailable
                          </div>
                        )}
                      </div>
                      <div className="p-2 text-xs">
                        <span className="font-medium capitalize">{e.media_type}</span> ·{' '}
                        {fmt(e.captured_at)}
                        {e.is_mocked && <span className="ml-1 text-red-600">(mocked)</span>}
                        {e.clock_suspect && (
                          <span className="ml-1 text-amber-600">(clock suspect)</span>
                        )}
                        {e.latitude != null && e.longitude != null && (
                          <div className="text-zinc-500">
                            {e.latitude.toFixed(5)}, {e.longitude.toFixed(5)}
                          </div>
                        )}
                        {url && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline-offset-2 hover:underline"
                          >
                            Open full size
                          </a>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-medium">Timeline ({detail.events.length})</h3>
            <ol className="space-y-1 text-sm" data-testid="event-timeline">
              {detail.events.map((ev) => (
                <li key={ev.id} className="flex gap-2 border-l-2 border-black/10 pl-3 dark:border-white/15">
                  <span className="text-zinc-500">{fmt(ev.created_at)}</span>
                  <span>
                    <span className="font-medium">{ev.action}</span>
                    {ev.from_status && ev.to_status && ` (${ev.from_status} → ${ev.to_status})`}
                    {ev.actor_name && ` by ${ev.actor_name}`}
                    {ev.note && <span className="text-zinc-500"> — {ev.note}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-medium">Comments ({detail.comments.length})</h3>
            <ul className="space-y-2 text-sm" data-testid="comment-list">
              {detail.comments.map((c) => (
                <li key={c.id} className="rounded-md border border-black/10 p-2 dark:border-white/15">
                  <p>{c.body}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {c.author_name ?? '—'} · {fmt(c.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="rounded-lg border border-black/10 p-4 dark:border-white/15">
          <InspectionActions id={id} canManage={detail.can_manage} actions={actions} staff={staff} />
        </aside>
      </div>
    </div>
  );
}

function Detail({ label, value, testid }: { label: string; value: string; testid?: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p data-testid={testid}>{value}</p>
    </div>
  );
}
