import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  getInspectionDetail,
  getManagerActions,
  getAssignableStaff,
  type ManagerAction,
  type AssignableStaff,
} from '@/lib/data/inspections';
import { MapContainer } from '@/components/ui/MapContainer';
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
            <MapContainer
              label={`Inspection at ${insp.gps_latitude ?? insp.latitude}, ${insp.gps_longitude ?? insp.longitude}`}
              height={240}
            />
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-medium">Evidence ({detail.evidence.length})</h3>
            {detail.evidence.length === 0 ? (
              <p className="text-sm text-zinc-500">No evidence captured.</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2" data-testid="evidence-list">
                {detail.evidence.map((e) => (
                  <li key={e.id} className="rounded-md border border-black/10 p-2 text-xs dark:border-white/15">
                    <span className="font-medium">{e.media_type}</span> · {fmt(e.captured_at)}
                    {e.is_mocked && <span className="ml-1 text-red-600">(mocked)</span>}
                    {e.clock_suspect && <span className="ml-1 text-amber-600">(clock suspect)</span>}
                    <div className="truncate text-zinc-500">{e.storage_path}</div>
                  </li>
                ))}
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
