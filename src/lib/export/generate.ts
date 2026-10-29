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

/**
 * pdf-lib's standard fonts only encode WinAnsi; drawText THROWS on anything else (e.g.
 * Gujarati/Hindi names, ₹), which failed the whole export. Replace unencodable characters
 * so the PDF always renders. Full Unicode output needs an embedded font (fontkit + a
 * Noto font) — tracked in RFP-GAP-ANALYSIS.md.
 */
function pdfSafe(text: string): string {
  return text
    .replace(/₹/g, 'INR ')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[^\x20-\x7E\xA0-\xFF–—‘’“”•…€]/g, '?');
}

function toCsv(rows: ReportRow[]): Uint8Array {
  const cols = columnsOf(rows);
  const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const lines = [cols.map(esc).join(',')];
  for (const r of rows) lines.push(cols.map((c) => esc(cell(r[c]))).join(','));
  // UTF-8 BOM so Excel opens Gujarati/Hindi text correctly instead of mojibake.
  return new TextEncoder().encode(`﻿${lines.join('\n')}`);
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

  page.drawText(pdfSafe(`AUDA FieldTrack — ${title}`), { x: margin, y, size: 14, font: bold });
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
      page.drawText(pdfSafe(v).slice(0, 22), { x: margin + i * colWidth, y, size, font: f });
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

/** Fields rendered on a challan PDF (label, value). */
export interface ChallanPdfData {
  ref_no: string;
  rows: [string, string][];
}

/**
 * Generate a single-challan PDF with the unique reference number (RFP 9.3). A simple,
 * self-contained A4 document — no external template needed. The final AUDA challan
 * format/authorities are an FRS/SRS item; this is a correct, functional baseline.
 */
export async function generateChallanPdf(data: ChallanPdfData): Promise<GeneratedFile> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([595, 842]); // A4 portrait
  const margin = 48;
  let y = 790;

  page.drawText('Ahmedabad Urban Development Authority', { x: margin, y, size: 15, font: bold });
  y -= 20;
  page.drawText('AUDA FieldTrack — Challan', { x: margin, y, size: 11, font, color: rgb(0.3, 0.3, 0.3) });
  y -= 14;
  page.drawText(pdfSafe(`Reference: ${data.ref_no}`), { x: margin, y, size: 11, font: bold });
  y -= 10;
  page.drawLine({ start: { x: margin, y }, end: { x: 547, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
  y -= 24;

  for (const [label, value] of data.rows) {
    page.drawText(pdfSafe(label), { x: margin, y, size: 9, font: bold, color: rgb(0.35, 0.35, 0.35) });
    const lines = wrapText(pdfSafe(value || '—'), 70);
    lines.forEach((line, i) => {
      page.drawText(line, { x: margin + 150, y: y - i * 13, size: 10, font });
    });
    y -= Math.max(18, lines.length * 13 + 4);
    if (y < margin + 40) break;
  }

  page.drawText(
    `Generated ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`,
    { x: margin, y: margin, size: 7, font, color: rgb(0.5, 0.5, 0.5) },
  );

  return {
    body: await doc.save(),
    contentType: 'application/pdf',
    filename: `${data.ref_no}.pdf`,
  };
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    if ((current + ' ' + w).trim().length > maxChars) {
      if (current) lines.push(current);
      current = w;
    } else {
      current = (current + ' ' + w).trim();
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : ['—'];
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
