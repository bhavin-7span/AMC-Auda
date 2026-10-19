'use client';

import { useState, useTransition } from 'react';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Button, Field, Select } from '@/components/ui/Form';
import { useToast } from '@/components/ui/Toast';
import { correctAttendanceAction } from './actions';
import type { AttendanceRow } from '@/lib/data/attendance';

function fmt(ts: string): string {
  return new Date(ts).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

/**
 * Attendance log with exception highlighting and an inline correction dialog. Reads come
 * from admin_list_attendance; corrections go through correctAttendanceAction →
 * admin_correct_attendance (records history + audit). Paging via the page URL.
 */
export function AttendanceTable({
  rows,
  total,
  page,
  pageSize,
}: {
  rows: AttendanceRow[];
  total: number;
  page: number;
  pageSize: number;
}) {
  const { show } = useToast();
  const [pending, startTransition] = useTransition();
  const [correcting, setCorrecting] = useState<AttendanceRow | null>(null);

  function goToPage(next: number) {
    const url = new URL(window.location.href);
    url.searchParams.set('page', String(next));
    window.location.href = url.toString();
  }

  function submitCorrection(formData: FormData) {
    if (!correcting) return;
    formData.set('punchId', correcting.id);
    startTransition(async () => {
      const res = await correctAttendanceAction({ ok: false, error: null }, formData);
      if (res.ok) {
        show('Attendance corrected', 'success');
        setCorrecting(null);
      } else {
        show(res.error ?? 'Correction failed', 'error');
      }
    });
  }

  const columns: Column<AttendanceRow>[] = [
    { key: 'employee', header: 'Employee', cell: (r) => `${r.full_name ?? '—'} (${r.employee_id ?? '—'})` },
    { key: 'punch_type', header: 'Type', cell: (r) => r.punch_type },
    { key: 'punched_at', header: 'Time (IST)', cell: (r) => fmt(r.punched_at) },
    {
      key: 'geofence',
      header: 'Geo-fence',
      cell: (r) =>
        r.inside_geofence ? (
          <span className="text-green-700 dark:text-green-400">Inside</span>
        ) : (
          <span className="text-red-600" data-testid={`outside-${r.id}`}>
            Outside{r.distance_to_site_m != null ? ` (${Math.round(r.distance_to_site_m)}m)` : ''}
          </span>
        ),
    },
    {
      key: 'flags',
      header: 'Flags',
      cell: (r) => {
        const parts: string[] = [];
        if (r.is_mocked) parts.push('mocked');
        if (r.clock_suspect) parts.push('clock');
        if (r.captured_offline) parts.push('offline');
        if (r.flags?.length) parts.push(...r.flags);
        return parts.length ? <span className="text-amber-600">{parts.join(', ')}</span> : '—';
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      cell: (r) => (
        <Button variant="ghost" data-testid={`correct-${r.id}`} onClick={() => setCorrecting(r)}>
          Correct
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      {correcting && (
        <form
          action={submitCorrection}
          data-testid="correction-form"
          className="grid max-w-xl gap-3 rounded-lg border border-amber-500/40 bg-amber-50/50 p-4 sm:grid-cols-2 dark:bg-amber-950/20"
        >
          <p className="text-sm sm:col-span-2">
            Correcting punch for <strong>{correcting.full_name}</strong> at {fmt(correcting.punched_at)}
          </p>
          <Field label="Punch type" htmlFor="punchType">
            <Select id="punchType" name="punchType" defaultValue={correcting.punch_type}>
              {['in', 'out', 'break_start', 'break_end', 'field_duty_start', 'field_duty_end'].map(
                (t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ),
              )}
            </Select>
          </Field>
          <Field label="Geo-fence result" htmlFor="insideGeofence">
            <Select id="insideGeofence" name="insideGeofence" defaultValue={String(correcting.inside_geofence)}>
              <option value="true">Inside</option>
              <option value="false">Outside</option>
            </Select>
          </Field>
          <Field label="Reason (required)" htmlFor="reason" required>
            <input
              id="reason"
              name="reason"
              required
              minLength={3}
              data-testid="correction-reason"
              className="h-9 w-full rounded-md border border-black/15 bg-transparent px-2.5 text-sm outline-none focus:border-zinc-500 dark:border-white/20"
            />
          </Field>
          <div className="flex items-end gap-2 sm:col-span-2">
            <Button type="submit" disabled={pending} data-testid="correction-save">
              {pending ? 'Saving…' : 'Save correction'}
            </Button>
            <Button variant="secondary" onClick={() => setCorrecting(null)} disabled={pending}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={goToPage}
        emptyMessage="No attendance records found."
      />
    </div>
  );
}
