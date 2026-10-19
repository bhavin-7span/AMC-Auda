import 'server-only';
import * as XLSX from 'xlsx';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { ReportRow } from '@/lib/data/reports';

/**
 * Server-side export generators for report rows (Phase 8). Produce a Buffer + content
 * type + filename for CSV, Excel (.xlsx) and PDF. Kept generic so any report feeds in.
 * `server-only` prevents accidental client bundling of xlsx/pdf-lib.
 */

export type ExportFormat = 'csv' | 'xlsx' | 'pdf';

export interface GeneratedFile {
  body: Uint8Array;
  contentType: string;
  filename: string;
}

function columnsOf(rows: ReportRow[]): string[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return [...keys];
}

function cell(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

function toCsv(rows: ReportRow[]): Uint8Array {
  const cols = columnsOf(rows);
  const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const lines = [cols.map(esc).join(',')];
  for (const r of rows) lines.push(cols.map((c) => esc(cell(r[c]))).join(','));
  return new TextEncoder().encode(lines.join('\n'));
}

function toXlsx(rows: ReportRow[]): Uint8Array {
  const cols = columnsOf(rows);
  const ws = XLSX.utils.json_to_sheet(rows, { header: cols });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Uint8Array(out as ArrayBuffer);
}

async function toPdf(rows: ReportRow[], title: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const cols = columnsOf(rows);

  let page = doc.addPage([842, 595]); // A4 landscape
  const margin = 30;
  let y = 560;

  page.drawText(`AUDA FieldTrack — ${title}`, { x: margin, y, size: 14, font: bold });
  y -= 10;
  page.drawText(`Generated ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`, {
    x: margin,
    y: y - 8,
    size: 8,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
  y -= 30;

  const colWidth = (842 - margin * 2) / Math.max(cols.length, 1);
  const drawRow = (vals: string[], f = font, size = 7) => {
    vals.forEach((v, i) => {
      page.drawText(v.slice(0, 22), { x: margin + i * colWidth, y, size, font: f });
    });
    y -= 14;
  };

  drawRow(cols, bold, 8);
  y -= 2;
  for (const r of rows) {
    if (y < margin + 20) {
      page = doc.addPage([842, 595]);
      y = 560;
      drawRow(cols, bold, 8);
    }
    drawRow(cols.map((c) => cell(r[c])));
  }

  return doc.save();
}

export async function generateExport(
  rows: ReportRow[],
  format: ExportFormat,
  reportName: string,
): Promise<GeneratedFile> {
  const stamp = new Date().toISOString().slice(0, 10);
  const base = `auda-${reportName}-${stamp}`;

  if (format === 'csv') {
    return { body: toCsv(rows), contentType: 'text/csv; charset=utf-8', filename: `${base}.csv` };
  }
  if (format === 'xlsx') {
    return {
      body: toXlsx(rows),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `${base}.xlsx`,
    };
  }
  return {
    body: await toPdf(rows, reportName),
    contentType: 'application/pdf',
    filename: `${base}.pdf`,
  };
}
