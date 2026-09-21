import { jsPDF } from "jspdf";
import { IMPACT, formatCount, formatKg, formatMoney } from "@/lib/impact";
import type { AdminInsightStory, InsightRankedRow } from "@/lib/adminInsights";

const PAGE_W = 210;
const PAGE_H = 297;
const M = 10;
const INNER = PAGE_W - M * 2;
const GAP = 3;
const FOOTER = 11;
/** Title strip plus bottom padding inside every card. */
const HEAD = 12;

const CREAM: [number, number, number] = [250, 247, 240];
const BEIGE: [number, number, number] = [245, 241, 232];
const GREEN: [number, number, number] = [45, 95, 79];
const GREEN_DARK: [number, number, number] = [22, 56, 45];
const INK: [number, number, number] = [26, 26, 26];
const MUTED: [number, number, number] = [107, 107, 107];
const WHITE: [number, number, number] = [255, 255, 255];
const LINE: [number, number, number] = [232, 226, 212];
const ORANGE: [number, number, number] = [247, 147, 30];
const RED: [number, number, number] = [180, 35, 24];
const LOGO_RATIO = 500 / 175;

let cachedLogo: string | null = null;

export async function downloadAdminInsightPdf(story: AdminInsightStory) {
  const logo = await loadLogo();
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  paintPage(doc);

  let y = drawBrand(doc, M, story, logo);
  y = drawImpact(doc, y, story);
  y = drawKpis(doc, y, headlineMetrics(story), 7);

  const col = (INNER - GAP) / 2;
  const rankCount = (rows: InsightRankedRow[]) => Math.max(1, Math.min(5, rows.length));
  const pathwayRows = Math.max(1, story.overview.pathways.length);
  const topRank = Math.max(rankCount(story.foods), rankCount(story.recipients));
  const lowRank = Math.max(rankCount(story.providers), rankCount(story.sites));
  const attentionRows = measureAttentionRows(doc, story);
  const typeRows = Math.max(1, story.overview.types.length);

  const blocks: Block[] = [
    {
      want: HEAD + pathwayRows * 8.4,
      min: HEAD + pathwayRows * 6,
      flex: 1,
      draw: (top, h) => {
        drawPathways(doc, M, top, col, h, story);
        drawActivity(doc, M + col + GAP, top, col, h, story);
      },
    },
    {
      want: HEAD + topRank * 7.6,
      min: HEAD + topRank * 5.6,
      flex: 1.1,
      draw: (top, h) => {
        drawRanked(doc, M, top, col, h, "What was recovered", story.foods);
        drawRanked(doc, M + col + GAP, top, col, h, "Who received it", story.recipients);
      },
    },
    {
      want: HEAD + lowRank * 7.6,
      min: HEAD + lowRank * 5.6,
      flex: 1.1,
      draw: (top, h) => {
        drawRanked(doc, M, top, col, h, "Listing sources", story.providers);
        drawRanked(doc, M + col + GAP, top, col, h, "Sites contributing", story.sites);
      },
    },
    {
      want: HEAD + attentionRows * 7.6,
      min: HEAD + attentionRows * 6.2,
      flex: 0.25,
      draw: (top, h) => drawAttention(doc, M, top, INNER, h, story),
    },
    {
      want: HEAD + 4 + typeRows * 6.6,
      min: HEAD + 4 + typeRows * 5.2,
      flex: 0.7,
      draw: (top, h) => drawNetwork(doc, M, top, INNER, h, story),
    },
  ];

  const available = PAGE_H - M - FOOTER - y - GAP * (blocks.length - 1);
  solveHeights(blocks, available).forEach((h, index) => {
    blocks[index].draw(y, h);
    y += h + GAP;
  });

  drawFooter(doc, story);
  doc.save(`Saveful_Platform_Insights_${story.generatedAt.slice(0, 10)}.pdf`);
}

type Block = {
  want: number;
  min: number;
  flex: number;
  draw: (top: number, height: number) => void;
};

/** Fits every block into `available` so the report is always exactly one page. */
function solveHeights(blocks: Block[], available: number) {
  const wantSum = blocks.reduce((sum, block) => sum + block.want, 0);
  const minSum = blocks.reduce((sum, block) => sum + block.min, 0);

  if (wantSum <= available) {
    const extra = available - wantSum;
    const flexSum = blocks.reduce((sum, block) => sum + block.flex, 0) || 1;
    return blocks.map((block) => block.want + (extra * block.flex) / flexSum);
  }
  if (minSum <= available) {
    const slack = wantSum - minSum;
    const trim = (wantSum - available) / slack;
    return blocks.map((block) => block.want - (block.want - block.min) * trim);
  }
  const scale = available / minSum;
  return blocks.map((block) => block.min * scale);
}

function headlineMetrics(story: AdminInsightStory): [string, string][] {
  const { metrics, operations } = story.overview;
  return [
    ["Meals created", formatCount(metrics.mealsCreated)],
    ["CO2 avoided", formatKg(metrics.co2AvoidedKg)],
    ["Food value", formatMoney(metrics.foodValue)],
    ["Collections", formatCount(metrics.collections)],
    ["Listings", formatCount(operations.listingsPublished)],
    ["Claim rate", `${operations.claimRate}%`],
    ["Recovery rate", `${operations.recoveryRate}%`],
    ["Organisations", formatCount(metrics.organisations)],
    ["Sites", formatCount(metrics.sites)],
    ["Car km", formatCount(story.equivalents.carKm)],
    ["Trees / year", formatCount(story.equivalents.trees)],
    ["Households / wk", formatCount(story.equivalents.households)],
    [story.annualised ? "Food / year" : "All-time food", formatKg(story.projection.yearKg)],
    [story.annualised ? "Value / year" : "All-time value", formatMoney(story.projection.yearValue)],
  ];
}

function paintPage(doc: jsPDF) {
  doc.setFillColor(...CREAM);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");
}

function drawBrand(doc: jsPDF, y: number, story: AdminInsightStory, logo: string | null) {
  const h = 15;
  box(doc, M, y, INNER, h);
  if (logo) {
    const logoH = 9.5;
    doc.addImage(logo, "PNG", M + 4, y + (h - logoH) / 2, logoH * LOGO_RATIO, logoH, undefined, "FAST");
  } else {
    doc.setTextColor(...INK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("SAVEFUL for Business", M + 4, y + 9.5);
  }
  doc.setTextColor(...GREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.6);
  doc.text("Platform insights", M + INNER - 4, y + 6.6, { align: "right" });
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "normal");
  fit(doc, `${story.scopeLabel}  ·  ${story.periodLabel}`, INNER * 0.5, 7.2, M + INNER - 4, y + 11.2, "right");
  return y + h + GAP;
}

function drawImpact(doc: jsPDF, y: number, story: AdminInsightStory) {
  const h = 21;
  const split = INNER * 0.42;
  doc.setFillColor(...GREEN_DARK);
  doc.roundedRect(M, y, INNER, h, 2.2, 2.2, "F");
  doc.setFillColor(...GREEN);
  doc.roundedRect(M + split, y, INNER - split, h, 2.2, 2.2, "F");
  doc.setFillColor(...GREEN_DARK);
  doc.rect(M + split, y, 6, h, "F");

  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  fit(doc, formatKg(story.overview.metrics.recoveredKg), split - 10, 19, M + 5, y + 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.6);
  doc.text("food recovered", M + 5, y + 16.8);

  const copyX = M + split + 9;
  const copyW = INNER - split - 14;
  doc.setFont("helvetica", "normal");
  fit(
    doc,
    `Enough for ${formatCount(story.equivalents.meals)} meals and ${formatKg(story.equivalents.co2)} of CO2 avoided.`,
    copyW,
    9.4,
    copyX,
    y + 9,
  );
  fit(
    doc,
    `${formatCount(story.overview.metrics.collections)} collections  ·  Generated ${formatStamp(story.generatedAt)}`,
    copyW,
    7.2,
    copyX,
    y + 16,
  );
  return y + h + GAP;
}

function drawKpis(doc: jsPDF, y: number, items: [string, string][], cols: number) {
  const gap = 2;
  const w = (INNER - gap * (cols - 1)) / cols;
  const h = 12;
  items.forEach(([label, value], index) => {
    const x = M + (index % cols) * (w + gap);
    const top = y + Math.floor(index / cols) * (h + gap);
    box(doc, x, top, w, h, 1.5);
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "normal");
    fit(doc, label.toUpperCase(), w - 4.4, 5.8, x + 2.2, top + 4.2);
    doc.setTextColor(...GREEN);
    doc.setFont("helvetica", "bold");
    fit(doc, value, w - 4.4, 10, x + 2.2, top + 9.8);
  });
  const rows = Math.ceil(items.length / cols);
  return y + rows * h + (rows - 1) * gap + GAP;
}

function box(doc: jsPDF, x: number, y: number, w: number, h: number, radius = 2) {
  doc.setFillColor(...WHITE);
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.22);
  doc.roundedRect(x, y, w, h, radius, radius, "FD");
}

function card(doc: jsPDF, x: number, y: number, w: number, h: number, title: string) {
  box(doc, x, y, w, h);
  doc.setFillColor(...ORANGE);
  doc.roundedRect(x + 2.6, y + 2.6, 1.1, 3, 0.4, 0.4, "F");
  doc.setTextColor(...GREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text(title, x + 5.4, y + 5.1);
}

function drawPathways(doc: jsPDF, x: number, y: number, w: number, h: number, story: AdminInsightStory) {
  const rows = story.overview.pathways;
  card(doc, x, y, w, h, "Recovery pathways");
  const bodyTop = y + 8.6;
  const rowH = (h - 10.6) / Math.max(rows.length, 1);
  rows.forEach((item, index) => {
    const top = bodyTop + index * rowH;
    const rgb = hexRgb(item.color);
    const font = clamp(6.2, 8, rowH * 0.44);
    doc.setFillColor(...rgb);
    doc.circle(x + 5, top + rowH * 0.3, 1, "F");
    doc.setTextColor(...INK);
    doc.setFont("helvetica", "normal");
    fit(doc, item.label, w * 0.52, font, x + 7.6, top + rowH * 0.38);
    doc.setTextColor(...MUTED);
    fit(doc, `${formatKg(item.kg)}  ·  ${item.percent}%`, w * 0.33, font, x + w - 3.4, top + rowH * 0.38, "right");
    bar(doc, x + 4, top + rowH * 0.56, w - 8, rowH, item.percent, 100, rgb);
  });
}

function drawActivity(doc: jsPDF, x: number, y: number, w: number, h: number, story: AdminInsightStory) {
  const series = story.overview.series;
  card(doc, x, y, w, h, "Activity over time");
  if (!series.length) {
    doc.setTextColor(...MUTED);
    doc.setFontSize(7.4);
    doc.text("No completed collections in this period.", x + 4.5, y + h / 2);
    return;
  }
  const peak = Math.max(...series.map((row) => row.kg), 1);
  const plotX = x + 4.5;
  const plotW = w - 9;
  const plotY = y + 9.5;
  const plotH = Math.max(8, h - 16);
  const gap = 1.3;
  const barW = Math.min(7.5, (plotW - gap * (series.length - 1)) / series.length);
  series.forEach((row, index) => {
    const barH = Math.max(1.4, (row.kg / peak) * plotH);
    const bx = plotX + index * (barW + gap);
    doc.setFillColor(...GREEN);
    doc.roundedRect(bx, plotY + plotH - barH, barW, barH, 0.6, 0.6, "F");
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    doc.text(shortDate(row.label), bx + barW / 2, plotY + plotH + 3.2, { align: "center" });
  });
}

function drawRanked(doc: jsPDF, x: number, y: number, w: number, h: number, title: string, rows: InsightRankedRow[]) {
  card(doc, x, y, w, h, title);
  const bodyTop = y + 8.6;
  const bodyH = h - 10.6;
  if (!rows.length) {
    doc.setTextColor(...MUTED);
    doc.setFontSize(7.4);
    doc.text("No rows for these filters.", x + 4.5, y + h / 2);
    return;
  }
  const visible = Math.max(1, Math.min(5, rows.length, Math.floor(bodyH / 5.4)));
  const top = rows.slice(0, visible);
  const widest = top[0]?.kg || 1;
  const rowH = bodyH / visible;
  const font = clamp(6.2, 7.8, rowH * 0.42);
  top.forEach((row, index) => {
    const rowY = bodyTop + index * rowH;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...INK);
    fit(doc, row.name, w - 34, font, x + 4.2, rowY + rowH * 0.38);
    doc.setTextColor(...MUTED);
    fit(doc, `${formatKg(row.kg)}  ·  ${row.percent}%`, 29, font, x + w - 3.4, rowY + rowH * 0.38, "right");
    bar(doc, x + 4.2, rowY + rowH * 0.56, w - 8.4, rowH, row.kg, widest, GREEN);
  });
}

function bar(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  rowH: number,
  value: number,
  max: number,
  color: [number, number, number],
) {
  if (rowH < 5.6) return;
  const thickness = clamp(1.2, 2.1, rowH * 0.26);
  doc.setFillColor(...BEIGE);
  doc.roundedRect(x, y, w, thickness, thickness / 2, thickness / 2, "F");
  const filled = max > 0 ? Math.max(thickness, (w * value) / max) : thickness;
  doc.setFillColor(...color);
  doc.roundedRect(x, y, filled, thickness, thickness / 2, thickness / 2, "F");
}

function attentionPills(story: AdminInsightStory) {
  return story.overview.attention.map((item) => ({
    label: shortAttention(item.label),
    count: formatCount(item.count),
  }));
}

/** Pre-measures how many pill rows the attention card needs so it never clips. */
function measureAttentionRows(doc: jsPDF, story: AdminInsightStory) {
  doc.setFontSize(6.8);
  let rows = 1;
  let cursor = 0;
  const usable = INNER - 9;
  attentionPills(story).forEach((item) => {
    const width = pillWidth(doc, item.label, item.count);
    if (cursor > 0 && cursor + width > usable) {
      rows += 1;
      cursor = 0;
    }
    cursor += width + 2;
  });
  return rows;
}

function pillWidth(doc: jsPDF, label: string, count: string) {
  doc.setFont("helvetica", "normal");
  const labelW = doc.getTextWidth(label);
  doc.setFont("helvetica", "bold");
  return labelW + doc.getTextWidth(count) + 7;
}

function drawAttention(doc: jsPDF, x: number, y: number, w: number, h: number, story: AdminInsightStory) {
  card(doc, x, y, w, h, "Needs attention");
  const pills = attentionPills(story);
  const bodyTop = y + 8.4;
  const bodyH = h - 10.4;
  const rows = measureAttentionRows(doc, story);
  const rowH = bodyH / rows;
  const pillH = clamp(5, 7, rowH * 0.82);
  const font = clamp(5.8, 6.8, pillH * 0.7);
  doc.setFontSize(font);
  let cursorX = x + 4.5;
  let line = 0;
  pills.forEach((item) => {
    const width = pillWidth(doc, item.label, item.count);
    if (cursorX > x + 4.5 && cursorX + width > x + w - 4.5) {
      line += 1;
      cursorX = x + 4.5;
    }
    const top = bodyTop + line * rowH + (rowH - pillH) / 2;
    doc.setFillColor(...BEIGE);
    doc.roundedRect(cursorX, top, width, pillH, pillH / 2, pillH / 2, "F");
    doc.setTextColor(...INK);
    doc.setFont("helvetica", "normal");
    doc.text(item.label, cursorX + 2.6, top + pillH * 0.68);
    doc.setTextColor(...RED);
    doc.setFont("helvetica", "bold");
    doc.text(item.count, cursorX + width - 2.6, top + pillH * 0.68, { align: "right" });
    cursorX += width + 2;
  });
}

function drawNetwork(doc: jsPDF, x: number, y: number, w: number, h: number, story: AdminInsightStory) {
  const rows = story.overview.types;
  card(doc, x, y, w, h, "Network by type");
  const labels = ["Type", "Orgs", "Active", "Listings", "Collections", "Recovered"];
  const nameW = w * 0.34;
  const valueW = (w - nameW - 9) / 5;
  const at = (index: number) => (index === 0 ? x + 4.5 : x + 4.5 + nameW + valueW * index);
  const headerY = y + 10;
  const bodyTop = headerY + 2.4;
  const bodyH = h - (bodyTop - y) - 2.6;
  const rowH = bodyH / Math.max(rows.length, 1);
  const font = clamp(6, 7.8, rowH * 0.52);

  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.9);
  labels.forEach((label, index) =>
    doc.text(label.toUpperCase(), at(index), headerY, { align: index === 0 ? "left" : "right" }),
  );

  rows.forEach((row, index) => {
    const rowY = bodyTop + (index + 0.68) * rowH;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.16);
    doc.line(x + 4, bodyTop + index * rowH, x + w - 4, bodyTop + index * rowH);
    const values = [
      row.label.replace(" / Surplus Provider", "").replace(" Recovery Provider", ""),
      formatCount(row.organisations),
      formatCount(row.active),
      formatCount(row.listings),
      formatCount(row.collections),
      formatKg(row.recoveredKg),
    ];
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...INK);
    values.forEach((value, colIndex) =>
      fit(
        doc,
        value,
        colIndex === 0 ? nameW - 2 : valueW - 2,
        font,
        at(colIndex),
        rowY,
        colIndex === 0 ? "left" : "right",
      ),
    );
  });
}

function drawFooter(doc: jsPDF, story: AdminInsightStory) {
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  const text = `Saveful for Business  ·  Official factors: 1 meal = ${IMPACT.MEAL_WEIGHT_KG} kg  ·  CO2 = ${IMPACT.CO2_PER_KG} kg per kg food  ·  value = ${formatMoney(IMPACT.FOOD_VALUE_PER_KG)} / kg. Car km, trees and households are illustrated equivalents only. Generated ${formatStamp(story.generatedAt)}.`;
  doc.text(clip(doc, text, INNER), M, PAGE_H - M - 3.5);
}

/** Draws text shrunk to `maxW`, then ellipsised if it still does not fit. */
function fit(
  doc: jsPDF,
  text: string,
  maxW: number,
  size: number,
  x: number,
  y: number,
  align: "left" | "right" = "left",
) {
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

function shortDate(label: string) {
  return label.replace(" September", " Sep").replace(" August", " Aug").replace(" July", " Jul");
}

function shortAttention(label: string) {
  return label
    .replace("Unclaimed / expired listings", "Unclaimed listings")
    .replace("Overdue / unresolved collections", "Overdue collections")
    .replace("Organisations awaiting activation", "Awaiting activation")
    .replace("Sites with no recent activity", "Quiet sites")
    .replace("Data / configuration issues", "Config issues");
}

function clamp(min: number, max: number, value: number) {
  return Math.min(max, Math.max(min, value));
}

function hexRgb(value: string): [number, number, number] {
  const hex = value.replace("#", "");
  return [parseInt(hex.slice(0, 2), 16) || 45, parseInt(hex.slice(2, 4), 16) || 95, parseInt(hex.slice(4, 6), 16) || 79];
}

function formatStamp(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

async function loadLogo() {
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
