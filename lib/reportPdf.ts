import { jsPDF } from "jspdf";

export type PdfColumn = { label: string; width: number; align?: "left" | "right" };

export type PdfBlock =
  | { kind: "kpis"; title: string; note?: string; items: [string, string][]; columns?: number }
  | { kind: "table"; title: string; note?: string; columns: PdfColumn[]; rows: string[][]; empty?: string };

export type PdfReport = {
  filename: string;
  eyebrow: string;
  title: string;
  lede?: string;
  meta: [string, string][];
  blocks: PdfBlock[];
  footer: string;
  logoDataUrl?: string | null;
};

const PAGE_W = 210;
const PAGE_H = 297;
const M = 12;
const INNER = PAGE_W - M * 2;
const BOTTOM = PAGE_H - M - 10;
const PAD = 2;
const LINE_H = 3.3;
const MAX_CELL_LINES = 8;
const PT = 0.3528;

const CREAM: [number, number, number] = [250, 247, 240];
const ZEBRA: [number, number, number] = [252, 250, 245];
const GREEN: [number, number, number] = [45, 95, 79];
const GREEN_DARK: [number, number, number] = [22, 56, 45];
const INK: [number, number, number] = [26, 26, 26];
const MUTED: [number, number, number] = [107, 107, 107];
const WHITE: [number, number, number] = [255, 255, 255];
const LINE: [number, number, number] = [232, 226, 212];
const ORANGE: [number, number, number] = [247, 147, 30];

type Cursor = { doc: jsPDF; y: number };
type CellLine = { text: string; muted: boolean };

let cachedLogo: string | null = null;

/** Builds the report as a real PDF file and saves it — no pop-up window or print dialog. */
export async function saveReportPdf(report: PdfReport) {
  const logo = usableImage(report.logoDataUrl) ?? (await loadSavefulLogo());
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const cursor: Cursor = { doc, y: M };
  paintPage(doc);
  drawHeader(cursor, report, logo);
  report.blocks.forEach((block) => (block.kind === "kpis" ? drawKpis(cursor, block) : drawTable(cursor, block)));
  drawFooters(doc, report.footer);
  doc.save(report.filename);
}

export async function loadSavefulLogo() {
  if (cachedLogo) return cachedLogo;
  try {
    const response = await fetch(`${window.location.origin}/logo.png`);
    const blob = await response.blob();
    cachedLogo = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    return cachedLogo;
  } catch {
    return null;
  }
}

function paintPage(doc: jsPDF) {
  doc.setFillColor(...CREAM);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");
}

function ensure(cursor: Cursor, height: number) {
  if (cursor.y + height <= BOTTOM) return false;
  cursor.doc.addPage();
  paintPage(cursor.doc);
  cursor.y = M;
  return true;
}

function drawHeader(cursor: Cursor, report: PdfReport, logo: string | null) {
  const { doc } = cursor;
  const top = cursor.y;
  const logoH = 11;
  let drewLogo = false;
  if (logo) {
    try {
      const props = doc.getImageProperties(logo);
      const width = Math.min(48, (logoH * props.width) / Math.max(props.height, 1));
      doc.addImage(logo, imageFormat(logo), M, top, width, logoH, undefined, "FAST");
      drewLogo = true;
    } catch {
      drewLogo = false;
    }
  }
  if (!drewLogo) {
    doc.setTextColor(...GREEN_DARK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Saveful for Business", M, top + 7);
  }

  doc.setTextColor(...GREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(clean(report.eyebrow.toUpperCase()), M + INNER, top + 4.5, { align: "right" });
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(clean(`Generated ${stamp()}`), M + INNER, top + 9, { align: "right" });
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.5);
  doc.line(M, top + 14, M + INNER, top + 14);

  let y = top + 23;
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  fit(doc, report.title, INNER, 18, M, y);
  y += 3;

  if (report.lede) {
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const lines = wrap(doc, report.lede, INNER);
    doc.text(lines, M, y + 3.5, { lineHeightFactor: 1.35 });
    y += lines.length * 8.5 * PT * 1.35 + 2;
  }

  y += 3;
  if (report.meta.length) {
    const cols = Math.min(4, report.meta.length);
    const colW = INNER / cols;
    const rowH = 12;
    const rows = Math.ceil(report.meta.length / cols);
    const height = rows * rowH + 1;
    box(doc, M, y, INNER, height);
    report.meta.forEach(([label, value], index) => {
      const x = M + (index % cols) * colW + 4;
      const rowTop = y + Math.floor(index / cols) * rowH;
      doc.setTextColor(...MUTED);
      doc.setFont("helvetica", "normal");
      fit(doc, label.toUpperCase(), colW - 8, 6.3, x, rowTop + 5);
      doc.setTextColor(...INK);
      doc.setFont("helvetica", "bold");
      fit(doc, value, colW - 8, 9, x, rowTop + 9.8);
    });
    y += height;
  }
  cursor.y = y + 7;
}

function sectionHeading(cursor: Cursor, title: string, note: string | undefined, reserve: number) {
  const { doc } = cursor;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const noteLines = note ? wrap(doc, note, INNER) : [];
  const height = 6.5 + (noteLines.length ? noteLines.length * 7.5 * PT * 1.3 + 1.5 : 0);
  ensure(cursor, height + reserve);
  const y = cursor.y;
  doc.setFillColor(...ORANGE);
  doc.roundedRect(M, y, 1.2, 4.4, 0.4, 0.4, "F");
  doc.setTextColor(...GREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text(clean(title), M + 3.4, y + 3.7);
  if (noteLines.length) {
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(noteLines, M, y + 9, { lineHeightFactor: 1.3 });
  }
  cursor.y += height + 1;
}

function drawKpis(cursor: Cursor, block: Extract<PdfBlock, { kind: "kpis" }>) {
  const { doc } = cursor;
  const cols = block.columns ?? 3;
  const gap = 3;
  const width = (INNER - gap * (cols - 1)) / cols;
  const height = 15;
  sectionHeading(cursor, block.title, block.note, height);
  for (let start = 0; start < block.items.length; start += cols) {
    ensure(cursor, height);
    block.items.slice(start, start + cols).forEach(([label, value], index) => {
      const x = M + index * (width + gap);
      box(doc, x, cursor.y, width, height, 1.8);
      doc.setTextColor(...MUTED);
      doc.setFont("helvetica", "normal");
      fit(doc, label.toUpperCase(), width - 6, 6.3, x + 3, cursor.y + 5.2);
      doc.setTextColor(...GREEN);
      doc.setFont("helvetica", "bold");
      fit(doc, value, width - 6, 12, x + 3, cursor.y + 11.6);
    });
    cursor.y += height + gap;
  }
  cursor.y += 4;
}

function drawTable(cursor: Cursor, block: Extract<PdfBlock, { kind: "table" }>) {
  const { doc } = cursor;
  const totalWeight = block.columns.reduce((sum, column) => sum + column.width, 0) || 1;
  const widths = block.columns.map((column) => (column.width / totalWeight) * INNER);
  const starts = widths.map((_, index) => M + widths.slice(0, index).reduce((sum, value) => sum + value, 0));
  const headerH = 7;

  sectionHeading(cursor, block.title, block.note, headerH + 8);

  if (!block.rows.length) {
    ensure(cursor, 9);
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.text(clean(block.empty ?? "No records for this period."), M, cursor.y + 4);
    cursor.y += 11;
    return;
  }

  const drawHeaderRow = () => {
    doc.setFillColor(...GREEN);
    doc.rect(M, cursor.y, INNER, headerH, "F");
    doc.setTextColor(...WHITE);
    doc.setFont("helvetica", "bold");
    block.columns.forEach((column, index) => {
      const right = column.align === "right";
      fit(
        doc,
        column.label.toUpperCase(),
        widths[index] - PAD * 2,
        6.4,
        right ? starts[index] + widths[index] - PAD : starts[index] + PAD,
        cursor.y + 4.6,
        right ? "right" : "left",
      );
    });
    cursor.y += headerH;
  };

  drawHeaderRow();
  block.rows.forEach((row, rowIndex) => {
    doc.setFontSize(7.4);
    const cells = block.columns.map((column, index) =>
      cellLines(doc, row[index] ?? "", widths[index] - PAD * 2, column.align === "right"),
    );
    const lines = Math.max(1, ...cells.map((cell) => cell.length));
    const height = lines * LINE_H + 3;
    if (ensure(cursor, height)) drawHeaderRow();

    if (rowIndex % 2 === 1) {
      doc.setFillColor(...ZEBRA);
      doc.rect(M, cursor.y, INNER, height, "F");
    }
    cells.forEach((cell, index) => {
      const right = block.columns[index].align === "right";
      const x = right ? starts[index] + widths[index] - PAD : starts[index] + PAD;
      cell.forEach((line, lineIndex) => {
        doc.setFont("helvetica", right ? "bold" : "normal");
        doc.setFontSize(line.muted ? 6.8 : 7.4);
        doc.setTextColor(...(right ? GREEN_DARK : line.muted ? MUTED : INK));
        doc.text(line.text, x, cursor.y + 1.5 + LINE_H * (lineIndex + 1) - 0.6, { align: right ? "right" : "left" });
      });
    });
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.16);
    doc.line(M, cursor.y + height, M + INNER, cursor.y + height);
    cursor.y += height;
  });
  cursor.y += 7;
}

function cellLines(doc: jsPDF, value: string, maxWidth: number, bold: boolean): CellLine[] {
  doc.setFont("helvetica", bold ? "bold" : "normal");
  const out: CellLine[] = [];
  clean(value)
    .split("\n")
    .forEach((paragraph, index) => {
      doc.setFontSize(index > 0 ? 6.8 : 7.4);
      const lines = doc.splitTextToSize(paragraph || " ", maxWidth) as string[];
      lines.forEach((text) => out.push({ text, muted: index > 0 }));
    });
  if (out.length <= MAX_CELL_LINES) return out;
  const kept = out.slice(0, MAX_CELL_LINES);
  const last = kept[MAX_CELL_LINES - 1];
  kept[MAX_CELL_LINES - 1] = { ...last, text: clip(doc, `${last.text}...`, maxWidth) };
  return kept;
}

function drawFooters(doc: jsPDF, footer: string) {
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);
    const top = PAGE_H - M - 5;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.line(M, top - 3.5, M + INNER, top - 3.5);
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.2);
    doc.text(wrap(doc, footer, INNER - 24).slice(0, 2), M, top, { lineHeightFactor: 1.3 });
    doc.text(`Page ${page} of ${total}`, M + INNER, top, { align: "right" });
  }
}

function box(doc: jsPDF, x: number, y: number, w: number, h: number, radius = 2) {
  doc.setFillColor(...WHITE);
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.22);
  doc.roundedRect(x, y, w, h, radius, radius, "FD");
}

function wrap(doc: jsPDF, text: string, maxWidth: number) {
  return doc.splitTextToSize(clean(text), maxWidth) as string[];
}

/** Draws text shrunk to `maxW`, then ellipsised if it still does not fit. */
function fit(
  doc: jsPDF,
  value: string,
  maxW: number,
  size: number,
  x: number,
  y: number,
  align: "left" | "right" = "left",
) {
  const text = clean(value);
  let next = size;
  doc.setFontSize(next);
  while (next > 5.2 && doc.getTextWidth(text) > maxW) {
    next -= 0.25;
    doc.setFontSize(next);
  }
  doc.text(clip(doc, text, maxW), x, y, { align });
}

function clip(doc: jsPDF, value: string, maxWidth: number) {
  if (doc.getTextWidth(value) <= maxWidth) return value;
  let text = value;
  while (text.length > 1 && doc.getTextWidth(`${text}...`) > maxWidth) text = text.slice(0, -1);
  return `${text}...`;
}

/** The built-in PDF fonts only cover Latin-1, so swap characters they cannot draw. */
function clean(value: string) {
  return value
    .replace(/₂/g, "2")
    .replace(/[—–]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/[\u00a0\u2009\u202f]/g, " ")
    .replace(/[^\n\x20-\x7e\u00a0-\u00ff]/g, "");
}

function usableImage(value?: string | null) {
  return value && /^data:image\/(png|jpe?g)/i.test(value) ? value : null;
}

function imageFormat(dataUrl: string) {
  return /^data:image\/png/i.test(dataUrl) ? "PNG" : "JPEG";
}

function stamp() {
  return new Date().toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}
