'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { correctAttendanceAction } from './actions';
import type { AttendanceRow } from '@/lib/data/attendance';
import { PUNCH_TYPES, fmtDateTime, fmtTime, punchLabel } from './format';

const PUNCH_ITEMS = PUNCH_TYPES.map((t) => ({ value: t, label: punchLabel(t) }));
const GEOFENCE_ITEMS = [
  { value: 'true', label: 'Inside' },
  { value: 'false', label: 'Outside' },
];

/**
 * One day's in/out punches for an employee, with exception highlighting. "Correct" opens
 * a dialog on that row; corrections go through correctAttendanceAction → admin_correct_attendance
 * (records history + audit).
 */
export function PunchLog({ punches }: { punches: AttendanceRow[] }) {
  const [pending, startTransition] = useTransition();
  const [correcting, setCorrecting] = useState<AttendanceRow | null>(null);

  function submitCorrection(formData: FormData) {
    if (!correcting) return;
    formData.set('punchId', correcting.id);
    startTransition(async () => {
      const res = await correctAttendanceAction({ ok: false, error: null }, formData);
      if (res.ok) {
        toast.success('Attendance corrected');
        setCorrecting(null);
      } else {
        toast.error(res.error ?? 'Correction failed');
      }
    });
  }

  const correctionForm = (r: AttendanceRow) => (
    <form action={submitCorrection} data-testid="correction-form" className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Correct punch</DialogTitle>
        <DialogDescription>
          {punchLabel(r.punch_type)} at {fmtDateTime(r.punched_at)}. The change and
          reason are recorded in the audit trail.
        </DialogDescription>
      </DialogHeader>
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="punchType">Punch type</FieldLabel>
          <Select name="punchType" items={PUNCH_ITEMS} defaultValue={r.punch_type}>
            <SelectTrigger id="punchType" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {PUNCH_ITEMS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="insideGeofence">Geo-fence result</FieldLabel>
          <Select name="insideGeofence" items={GEOFENCE_ITEMS} defaultValue={String(r.inside_geofence)}>
            <SelectTrigger id="insideGeofence" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {GEOFENCE_ITEMS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="reason">
            Reason <span className="text-destructive">*</span>
          </FieldLabel>
          <Input id="reason" name="reason" required minLength={3} data-testid="correction-reason" />
        </Field>
      </FieldGroup>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => setCorrecting(null)} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending} data-testid="correction-save">
          {pending ? 'Saving…' : 'Save correction'}
        </Button>
      </div>
    </form>
  );

  return (
    <div>
      {/* Fixed column widths keep the per-day tables aligned down the page. */}
      <Table className="min-w-[720px] table-fixed" data-testid="punch-log">
        <colgroup>
          <col className="w-28" />
          <col className="w-36" />
          <col />
          <col className="w-36" />
          <col className="w-40" />
          <col className="w-28" />
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Time (IST)</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Geo-fence</TableHead>
            <TableHead>Flags</TableHead>
            <TableHead className="pr-4">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {punches.map((r) => {
            const flags: string[] = [];
            if (r.is_mocked) flags.push('mocked');
            if (r.clock_suspect) flags.push('clock');
            if (r.captured_offline) flags.push('offline');
            if (r.flags?.length) flags.push(...r.flags);
            return (
              <TableRow key={r.id} className={r.is_exception ? 'bg-destructive/5' : undefined}>
                <TableCell className="pl-4 font-medium tabular-nums">{fmtTime(r.punched_at)}</TableCell>
                <TableCell>
                  <Badge variant={r.punch_type === 'in' ? 'success' : r.punch_type === 'out' ? 'info' : 'outline'}>
                    {punchLabel(r.punch_type)}
                  </Badge>
                </TableCell>
                <TableCell className="truncate">
                  {r.work_location_name ?? '—'}
                  {/* Actual punch location is retained for exception reporting (RFP 9.2). */}
                  <a
                    href={`https://www.google.com/maps?q=${r.latitude},${r.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-xs text-muted-foreground hover:underline"
                  >
                    {r.latitude.toFixed(5)}, {r.longitude.toFixed(5)}
                  </a>
                </TableCell>
                <TableCell>
                  {r.inside_geofence ? (
                    <Badge variant="outline">Inside</Badge>
                  ) : (
                    <Badge variant="destructive" data-testid={`outside-${r.id}`}>
                      Outside{r.distance_to_site_m != null ? ` · ${Math.round(r.distance_to_site_m)}m` : ''}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="whitespace-normal">
                  {flags.length ? (
                    <div className="flex flex-wrap gap-1">
                      {flags.map((f) => (
                        <Badge key={f} variant="outline">
                          {f}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell className="pr-4 text-right">
                  <Dialog
                    open={correcting?.id === r.id}
                    onOpenChange={(open) => !pending && setCorrecting(open ? r : null)}
                  >
                    <DialogTrigger render={<Button variant="ghost" size="sm" data-testid={`correct-${r.id}`} />}>
                      Correct
                    </DialogTrigger>
                    <DialogContent
                      className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg"
                    >
                      {correctionForm(r)}
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
