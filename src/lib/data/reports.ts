import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import type { AdminListResult } from './admin';

type Client = SupabaseClient<Database>;

/**
 * Typed data-access for MIS reports (Phase 8).
 *
 * admin_report runs role-scoped, server-side report queries; admin_log_export records an
 * audit entry whenever an export is generated (RFP 8.4). Report row shapes are open
 * records because columns vary per report type; the export layer renders generically.
 */

export type ReportName = 'inspections' | 'attendance';

export type ReportRow = Record<string, string | number | boolean | null>;

export interface ReportFilters {
  department?: string | null;
  status?: string | null;
  from?: string | null;
  to?: string | null;
}

export async function runReport(
  supabase: Client,
  report: ReportName,
  filters: ReportFilters = {},
  page = 0,
  pageSize = 50,
): Promise<AdminListResult<ReportRow>> {
  const { data, error } = await supabase.rpc('admin_report', {
    p_report: report,
    p_filters: filters as never,
    p_page: page,
    p_page_size: pageSize,
  });
  if (error) throw error;
  return data as unknown as AdminListResult<ReportRow>;
}

/** Record an export in the audit trail. Returns the audit row id. */
export async function logExport(
  supabase: Client,
  report: ReportName,
  format: string,
  filters: ReportFilters,
): Promise<string> {
  const { data, error } = await supabase.rpc('admin_log_export', {
    p_report: report,
    p_format: format,
    p_filters: filters as never,
  });
  if (error) throw error;
  return data as unknown as string;
}
