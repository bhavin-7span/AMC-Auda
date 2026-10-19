import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { adminListAttendance, getAttendanceRules, type AttendanceRow, type AttendanceRules } from '@/lib/data/attendance';
import { AttendanceTable } from './AttendanceTable';
import { RulesForm } from './RulesForm';

const PAGE_SIZE = 20;

/**
 * GPS attendance administration & monitoring (Phase 6). Attendance log with exception
 * highlighting (6.1, 6.2), inline correction (6.4), and rules config (6.3). All reads/
 * writes go through admin-gated RPCs (admin_list_attendance, admin_correct_attendance,
 * admin_update_attendance_rules). Reports (6.5) build on this list; reminders (6.6) are
 * gateway-dependent and handled with notifications/escalations.
 */
export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; exceptions?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(0, Number.parseInt(sp.page ?? '0', 10) || 0);
  const exceptionsOnly = sp.exceptions === '1';

  const supabase = await createClient();

  let error: string | null = null;
  let rows: AttendanceRow[] = [];
  let total = 0;
  let rules: AttendanceRules | null = null;

  try {
    const [list, rulesRow] = await Promise.all([
      adminListAttendance(supabase, { page, pageSize: PAGE_SIZE, exceptionsOnly }),
      getAttendanceRules(supabase),
    ]);
    rows = list.rows;
    total = list.total;
    rules = rulesRow;
  } catch (e) {
    error =
      e instanceof Error && /not authorized/i.test(e.message)
        ? 'You do not have permission to view attendance.'
        : 'Could not load attendance.';
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Monitor punches, flag exceptions and apply corrections.
        </p>
      </div>

      {error ? (
        <p className="rounded-md border border-red-500/40 bg-red-50 px-3 py-2 text-sm text-red-900 dark:bg-red-950/60 dark:text-red-100">
          {error}
        </p>
      ) : (
        <>
          <div className="flex items-center gap-3 text-sm">
            <Link
              href="/attendance"
              className={!exceptionsOnly ? 'font-medium underline' : 'text-zinc-500 hover:underline'}
            >
              All punches
            </Link>
            <Link
              href="/attendance?exceptions=1"
              data-testid="filter-exceptions"
              className={exceptionsOnly ? 'font-medium underline' : 'text-zinc-500 hover:underline'}
            >
              Exceptions only
            </Link>
          </div>

          <AttendanceTable rows={rows} total={total} page={page} pageSize={PAGE_SIZE} />

          <section className="space-y-2">
            <h2 className="text-lg font-medium">Attendance rules</h2>
            {rules ? (
              <RulesForm rules={rules} />
            ) : (
              <p className="text-sm text-zinc-500">Rules not configured.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
