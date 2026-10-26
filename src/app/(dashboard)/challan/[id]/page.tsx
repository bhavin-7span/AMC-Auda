import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getFeatureFlags } from '@/lib/config/feature-flags';
import { getChallanDetail, type ChallanDetail } from '@/lib/data/challans';
import { MapContainer } from '@/components/ui/MapContainer';
import { Button } from '@/components/ui/Form';
import { ChallanActions } from './ChallanActions';

function fmt(ts: string | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

/**
 * Challan detail: full fields, map, workflow actions (issue/pay/cancel) and PDF download.
 * Gated behind challan_enabled. Delivery (SMS/link) and payment integration are deferred
 * until an AUDA-approved gateway exists — the status + notified_at seams are present.
 */
export default async function ChallanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const flags = await getFeatureFlags();
  if (!flags.challanEnabled) notFound();

  const { id } = await params;
  const supabase = await createClient();

  let detail: ChallanDetail;
  try {
    detail = await getChallanDetail(supabase, id);
  } catch (e) {
    if (e instanceof Error && /not found|P0002/i.test(e.message)) notFound();
    throw e;
  }

  const mapPoints =
    detail.latitude != null && detail.longitude != null
      ? [{ id: 'challan', lat: detail.latitude, lon: detail.longitude, label: detail.ref_no }]
      : [];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/challan" className="text-sm text-zinc-500 hover:underline">← Challans</Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight" data-testid="challan-ref">{detail.ref_no}</h1>
        <p className="text-zinc-600 dark:text-zinc-400">{detail.violation}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="grid grid-cols-2 gap-3 rounded-lg border border-black/10 p-4 text-sm dark:border-white/15">
            <Detail label="Status" value={detail.status_name ?? detail.status} testid="challan-status" />
            <Detail label="Type" value={detail.challan_type ?? '—'} />
            <Detail label="Department" value={detail.department ?? '—'} />
            <Detail label="Rule / section" value={detail.rule_section ?? '—'} />
            <Detail label="Offender" value={detail.offender_name ?? '—'} />
            <Detail label="Contact" value={detail.offender_contact ?? '—'} />
            <Detail label="Amount" value={detail.amount != null ? `₹${detail.amount}` : '—'} />
            <Detail label="Location" value={detail.location_name ?? '—'} />
            <Detail label="Issued by" value={detail.issuer_name ?? '—'} />
            <Detail label="Issued at" value={fmt(detail.issued_at)} />
            <Detail label="Paid at" value={fmt(detail.paid_at)} />
            <Detail label="Created" value={fmt(detail.created_at)} />
          </section>

          {detail.reason && (
            <section className="rounded-lg border border-black/10 p-4 text-sm dark:border-white/15">
              <h3 className="mb-1 font-medium">Reason / remarks</h3>
              <p className="text-zinc-600 dark:text-zinc-400">{detail.reason}</p>
            </section>
          )}

          {mapPoints.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-medium">Location</h3>
              <MapContainer label={`${detail.ref_no} location`} height={240} points={mapPoints} />
            </section>
          )}
        </div>

        <aside className="space-y-4 rounded-lg border border-black/10 p-4 dark:border-white/15">
          <div>
            <h3 className="mb-2 text-sm font-medium">Actions</h3>
            <ChallanActions id={detail.id} status={detail.status} />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium">Document</h3>
            <a href={`/challan/${detail.id}/pdf`} target="_blank" rel="noopener noreferrer" data-testid="challan-pdf">
              <Button variant="secondary">Download PDF</Button>
            </a>
          </div>
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
