import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runReport, logExport, type ReportName, type ReportRow, type ReportFilters } from '@/lib/data/reports';
import { generateExport, type ExportFormat } from '@/lib/export/generate';

const REPORTS: ReportName[] = ['inspections', 'attendance'];
const FORMATS: ExportFormat[] = ['csv', 'xlsx', 'pdf'];
const MAX_ROWS = 5000; // guardrail for synchronous export

/**
 * Report export (Phase 8.2/8.4). Streams CSV / Excel / PDF for a report + filters.
 * Data is role-scoped by admin_report; the export is recorded in audit_log before the
 * file is returned. Larger-than-MAX_ROWS exports would move to an async job; here we cap
 * and page through up to the guardrail.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const report = searchParams.get('report') as ReportName;
  const format = (searchParams.get('format') ?? 'csv') as ExportFormat;

  if (!REPORTS.includes(report)) {
    return NextResponse.json({ error: 'Unknown report' }, { status: 400 });
  }
  if (!FORMATS.includes(format)) {
    return NextResponse.json({ error: 'Unknown format' }, { status: 400 });
  }

  const filters: ReportFilters = {
    department: searchParams.get('department'),
    status: searchParams.get('status'),
    from: searchParams.get('from'),
    to: searchParams.get('to'),
  };

  try {
    const supabase = await createClient();

    // Page through the report up to the guardrail.
    const rows: ReportRow[] = [];
    const pageSize = 1000;
    for (let page = 0; rows.length < MAX_ROWS; page++) {
      const res = await runReport(supabase, report, filters, page, pageSize);
      rows.push(...res.rows);
      if (res.rows.length < pageSize || rows.length >= res.total) break;
    }

    // Record the export (report + filters + format) before returning the file.
    await logExport(supabase, report, format, filters);

    const file = await generateExport(rows.slice(0, MAX_ROWS), format, report);

    return new NextResponse(Buffer.from(file.body), {
      status: 200,
      headers: {
        'Content-Type': file.contentType,
        'Content-Disposition': `attachment; filename="${file.filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Export failed.';
    const status = /not authorized/i.test(message) ? 403 : 500;
    return NextResponse.json({ error: status === 403 ? 'Not authorized' : 'Export failed' }, { status });
  }
}
