'use client';

import { useRouter } from 'next/navigation';
import { startTransition, useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Ban, CheckCircle2, Download, FileWarning, MapPin, Send } from 'lucide-react';
import { MapContainer } from '@/components/ui/MapContainer';
import type { MapPoint } from '@/components/ui/map-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { loadChallanDrawer, transitionChallanAction, type ChallanDrawerData } from './actions';

type Loaded = Extract<ChallanDrawerData, { ok: true }>;
type Action = 'issue' | 'pay' | 'cancel';

export const CHALLAN_STATUS_VARIANT: Record<string, 'success' | 'info' | 'destructive' | 'outline'> = {
  draft: 'outline',
  issued: 'info',
  paid: 'success',
  cancelled: 'destructive',
};

function fmt(ts: string | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Challan detail in a right-hand drawer on the list route (`?challan=<id>`): offender,
 * violation, amount and timeline, the location map and the PDF. Workflow actions sit in
 * the footer: draft → issue/cancel, issued → mark paid/cancel, paid/cancelled → none.
 */
export function ChallanDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const router = useRouter();
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [pending, startSaving] = useTransition();

  const load = useCallback((target: string) => {
    void loadChallanDrawer(target).then((res) =>
      startTransition(() => {
        setLoadedId(target);
        if (res.ok) {
          setData(res);
          setError(null);
        } else {
          setData(null);
          setError(res.error);
        }
      }),
    );
  }, []);

  // A different challan starts with the map collapsed.
  useEffect(() => {
    if (!id) return;
    startTransition(() => setShowMap(false));
    load(id);
  }, [id, load]);

  const loading = id != null && loadedId !== id;
  const c = !loading ? data?.detail : undefined;

  const mapPoints = useMemo<MapPoint[]>(
    () =>
      c && c.latitude != null && c.longitude != null
        ? [{ id: 'challan', lat: c.latitude, lon: c.longitude, label: c.ref_no }]
        : [],
    [c],
  );

  function run(action: Action) {
    if (!id) return;
    const fd = new FormData();
    fd.set('id', id);
    fd.set('action', action);
    startSaving(async () => {
      const res = await transitionChallanAction({ ok: false, error: null }, fd);
      if (res.ok) {
        toast.success(`Challan ${action === 'pay' ? 'marked paid' : `${action}d`}`);
        load(id);
        router.refresh();
      } else toast.error(res.error ?? 'Action failed');
    });
  }

  const primary: { action: Action; label: string } | null =
    c?.status === 'draft'
      ? { action: 'issue', label: 'Issue challan' }
      : c?.status === 'issued'
        ? { action: 'pay', label: 'Mark paid' }
        : null;
  const canCancel = c?.status === 'draft' || c?.status === 'issued';

  const details: { label: string; value: string }[] = c
    ? [
        { label: 'Offender', value: c.offender_name ?? '—' },
        { label: 'Contact', value: c.offender_contact ?? '—' },
        { label: 'Amount', value: c.amount != null ? `₹${c.amount}` : '—' },
        { label: 'Rule / section', value: c.rule_section ?? '—' },
        { label: 'Challan type', value: c.challan_type ?? '—' },
        { label: 'Department', value: c.department ?? '—' },
      ]
    : [];
  const timeline: { label: string; value: string | null }[] = c
    ? [
        { label: 'Created', value: c.created_at },
        { label: `Issued${c.issuer_name ? ` by ${c.issuer_name}` : ''}`, value: c.issued_at },
        { label: 'Paid', value: c.paid_at },
        { label: 'Cancelled', value: c.cancelled_at },
      ].filter((t) => t.value)
    : [];

  return (
    <Sheet open={id != null} onOpenChange={(open) => !open && !pending && onClose()}>
      <SheetContent className="w-full gap-0 p-0 data-[side=right]:sm:max-w-xl" data-testid="challan-drawer">
        <SheetHeader className="border-b px-6 py-5">
          <p className="text-[0.6875rem] font-bold tracking-widest text-info uppercase">Challan detail</p>
          <SheetTitle className="text-xl font-normal text-primary" data-testid="challan-ref">
            {c?.ref_no ?? (error ? 'Challan' : 'Loading…')}
          </SheetTitle>
          <SheetDescription className="sr-only">Challan details, location and document.</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : error || !c ? (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error ?? 'Could not load this challan.'}
            </p>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning">
                  <FileWarning className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.violation}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.location_name ?? 'No location recorded'}</p>
                </div>
                <Badge variant={CHALLAN_STATUS_VARIANT[c.status] ?? 'outline'} className="capitalize" data-testid="challan-status">
                  {c.status_name ?? c.status}
                </Badge>
              </div>

              <section className="space-y-2">
                <h3 className="text-sm font-medium">Details</h3>
                <dl className="grid grid-cols-2 overflow-hidden rounded-lg border text-sm">
                  {details.map((d, i) => (
                    <div
                      key={d.label}
                      className={`p-3 ${i % 2 === 0 ? 'border-r' : ''} ${i < details.length - 2 ? 'border-b' : ''}`}
                    >
                      <dt className="text-xs text-muted-foreground">{d.label}</dt>
                      <dd className="font-semibold">{d.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              {c.reason && (
                <section className="space-y-2">
                  <h3 className="text-sm font-medium">Reason / remarks</h3>
                  <p className="rounded-lg bg-muted p-3 text-sm whitespace-pre-wrap">{c.reason}</p>
                </section>
              )}

              <section className="space-y-2">
                <h3 className="text-sm font-medium">Location</h3>
                <div className="rounded-lg bg-muted p-3">
                  <div className="flex items-center gap-3">
                    <MapPin className="size-4 shrink-0 text-info" />
                    <div className="min-w-0 flex-1 text-xs">
                      <p className="font-semibold">{c.location_name ?? 'Location'}</p>
                      <p className="text-muted-foreground">
                        {mapPoints.length ? `${c.latitude!.toFixed(5)}, ${c.longitude!.toFixed(5)}` : 'No coordinates'}
                      </p>
                    </div>
                    {mapPoints.length > 0 && (
                      <Button variant="ghost" size="sm" className="text-info" onClick={() => setShowMap((v) => !v)}>
                        {showMap ? 'Hide map' : 'View map'}
                      </Button>
                    )}
                  </div>
                  {showMap && (
                    <div className="mt-3">
                      <MapContainer label={`${c.ref_no} location`} height={220} points={mapPoints} />
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-medium">Timeline</h3>
                <ol className="space-y-3 border-l pl-4 text-sm">
                  {timeline.map((t) => (
                    <li key={t.label} className="relative">
                      <span className="absolute top-1.5 -left-[1.3rem] size-2 rounded-full bg-info" />
                      <p className="font-medium">{t.label}</p>
                      <p className="text-xs text-muted-foreground">{fmt(t.value)}</p>
                    </li>
                  ))}
                </ol>
              </section>

              {!primary && !canCancel && (
                <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground" data-testid="challan-terminal">
                  No further actions ({c.status}).
                </p>
              )}
            </div>
          )}
        </div>

        <SheetFooter className="flex-row items-center justify-between border-t px-6 py-4">
          {c ? (
            <Button
              variant="outline"
              size="lg"
              nativeButton={false}
              render={
                <a
                  href={`/challan/pdf?id=${encodeURIComponent(c.id)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="challan-pdf"
                />
              }
            >
              <Download /> PDF
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2" data-testid={primary || canCancel ? 'challan-actions' : undefined}>
            <Button variant="outline" size="lg" onClick={onClose} disabled={pending} data-testid="drawer-close">
              Close
            </Button>
            {canCancel && (
              <Button
                variant="destructive"
                size="lg"
                onClick={() => run('cancel')}
                disabled={pending}
                data-testid="challan-action-cancel"
              >
                <Ban /> Cancel challan
              </Button>
            )}
            {primary && (
              <Button
                size="lg"
                onClick={() => run(primary.action)}
                disabled={pending}
                data-testid={`challan-action-${primary.action}`}
              >
                {primary.action === 'issue' ? <Send /> : <CheckCircle2 />}
                {pending ? 'Saving…' : primary.label}
              </Button>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
