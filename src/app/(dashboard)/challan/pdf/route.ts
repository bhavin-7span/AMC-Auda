import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFeatureFlags } from '@/lib/config/feature-flags';
import { getChallanDetail } from '@/lib/data/challans';
import { generateChallanPdf } from '@/lib/export/generate';

function fmt(ts: string | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

/**
 * Challan PDF (RFP 9.3: challan PDF with a unique reference number). Gated behind
 * challan_enabled; data is role-scoped via admin_challan_detail. Streams a download.
 * The challan is chosen with ?id= (details open in a drawer on /challan, not a page).
 */
export async function GET(req: Request) {
  const flags = await getFeatureFlags();
  if (!flags.challanEnabled) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  try {
    const supabase = await createClient();
    const c = await getChallanDetail(supabase, id);

    const file = await generateChallanPdf({
      ref_no: c.ref_no,
      rows: [
        ['Status', c.status_name ?? c.status],
        ['Violation', c.violation],
        ['Rule / section', c.rule_section ?? '—'],
        ['Challan type', c.challan_type ?? '—'],
        ['Department', c.department ?? '—'],
        ['Offender', c.offender_name ?? '—'],
        ['Contact', c.offender_contact ?? '—'],
        ['Amount', c.amount != null ? `INR ${c.amount}` : '—'],
        ['Location', c.location_name ?? '—'],
        ['Coordinates', c.latitude != null && c.longitude != null ? `${c.latitude}, ${c.longitude}` : '—'],
        ['Reason / remarks', c.reason ?? '—'],
        ['Issued by', c.issuer_name ?? '—'],
        ['Issued at', fmt(c.issued_at)],
        ['Paid at', fmt(c.paid_at)],
      ],
    });

    return new NextResponse(Buffer.from(file.body), {
      status: 200,
      headers: {
        'Content-Type': file.contentType,
        'Content-Disposition': `attachment; filename="${file.filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'PDF generation failed.';
    const status = /not authorized/i.test(message) ? 403 : /not found|P0002/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: status === 403 ? 'Not authorized' : 'Not found' }, { status });
  }
}
