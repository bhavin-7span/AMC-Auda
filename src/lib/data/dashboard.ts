import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

type Client = SupabaseClient<Database>;

/**
 * Typed data-access for the dashboard (Phase 7).
 *
 * admin_dashboard_widgets aggregates KPIs server-side, role-scoped (admin/dept_head/
 * supervisor). Supports an optional department + date-range filter.
 */

export interface DashboardWidgets {
  inspections: {
    total: number;
    open: number;
    completed: number;
    by_status: Record<string, number>;
  };
  attendance_today: {
    total: number;
    exceptions: number;
  };
  generated_at: string;
}

export interface DashboardFilters {
  department?: string | null;
  from?: string | null;
  to?: string | null;
}

export async function getDashboardWidgets(
  supabase: Client,
  f: DashboardFilters = {},
): Promise<DashboardWidgets> {
  const { data, error } = await supabase.rpc('admin_dashboard_widgets', {
    p_department: f.department ?? undefined,
    p_from: f.from ?? undefined,
    p_to: f.to ?? undefined,
  });
  if (error) throw error;
  return data as unknown as DashboardWidgets;
}

export interface TrendPoint {
  /** IST date, YYYY-MM-DD. */
  date: string;
  created: number;
  completed: number;
}

const istDate = (ts: string) => new Date(ts).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

/**
 * Inspections created vs completed per IST day for the `days` days ending `today`
 * (YYYY-MM-DD). Reads the inspections table, so RLS scopes rows to the caller's role.
 */
export async function getInspectionTrend(
  supabase: Client,
  { today, days, department }: { today: string; days: number; department?: string | null },
): Promise<TrendPoint[]> {
  const start = new Date(`${today}T00:00:00+05:30`);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const since = start.toISOString();

  let query = supabase
    .from('inspections')
    .select('created_at, completed_at')
    .or(`created_at.gte.${since},completed_at.gte.${since}`)
    .limit(5000);
  if (department) query = query.eq('department_id', department);
  const { data, error } = await query;
  if (error) throw error;

  const points = new Map<string, TrendPoint>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const date = istDate(d.toISOString());
    points.set(date, { date, created: 0, completed: 0 });
  }
  for (const row of data ?? []) {
    const created = points.get(istDate(row.created_at));
    if (created) created.created += 1;
    if (row.completed_at) {
      const completed = points.get(istDate(row.completed_at));
      if (completed) completed.completed += 1;
    }
  }
  return [...points.values()];
}
