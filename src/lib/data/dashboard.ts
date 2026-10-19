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
