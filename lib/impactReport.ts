import {
  formatCollectionDate,
  formatKg,
  formatMoney,
  formatNumber,
  type ImpactStats,
  type Recipient,
  type TopFood,
} from "@/lib/impactDemo";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadImpactExcel(input: {
  organisation: string;
  site: string;
  period: string;
  stats: ImpactStats;
  foods: TopFood[];
  recipients: Recipient[];
}) {
  const lines = [
    ["Saveful Impact Report"],
    ["Organisation", input.organisation],
    ["Site", input.site],
    ["Period", input.period],
    [],
    ["Metric", "Value"],
    ["Food redistributed", formatKg(input.stats.redistributedKg)],
    ["Meals created", formatNumber(input.stats.mealsCreated)],
    ["CO2 avoided", formatKg(input.stats.co2AvoidedKg)],
    ["Food saved value", formatMoney(input.stats.foodSavedMoney)],
    ["Collections completed", formatNumber(input.stats.collectionsCompleted)],
    ["Partners supported", formatNumber(input.stats.partnersSupported)],
    ["Food for people", `${formatKg(input.stats.peopleKg)} (${input.stats.peoplePercent}%)`],
    ["Food for animals", `${formatKg(input.stats.animalKg)} (${input.stats.animalPercent}%)`],
    [],
    ["Food item", "Category", "Total kg", "People kg", "Animals kg", "Meals", "CO2 kg"],
    ...input.foods.map((food) => [
      food.name,
      food.category,
      food.totalKg,
      food.peopleKg,
      food.animalKg,
      food.mealsCreated,
      food.co2AvoidedKg,
    ]),
    [],
    ["Recipient", "Type", "Collections", "Total kg", "Share %", "Last collection"],
    ...input.recipients.map((row) => [
      row.name,
      row.kind,
      row.collections,
      row.totalKg,
      row.sharePercent,
      formatCollectionDate(row.lastCollectionAt),
    ]),
  ];

  const csv = lines
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");

  downloadFile(
    `Saveful_Impact_Report_${new Date().toISOString().slice(0, 10)}.csv`,
    `\uFEFF${csv}`,
    "text/csv;charset=utf-8",
  );
}

export function printImpactPdf(input: {
  organisation: string;
  site: string;
  period: string;
  stats: ImpactStats;
  foods: TopFood[];
  recipients: Recipient[];
}) {
  const foodRows = input.foods
    .map(
      (food) => `
      <tr>
        <td>${food.rank}</td>
        <td><strong>${escapeHtml(food.name)}</strong><div class="muted">${escapeHtml(food.category)}</div></td>
        <td class="num">${escapeHtml(formatKg(food.totalKg))}</td>
        <td class="num">${escapeHtml(formatKg(food.peopleKg))}</td>
        <td class="num">${escapeHtml(formatKg(food.animalKg))}</td>
        <td class="num">${escapeHtml(formatNumber(food.mealsCreated))}</td>
        <td class="num">${escapeHtml(formatKg(food.co2AvoidedKg))}</td>
      </tr>`,
    )
    .join("");

  const recipientRows = input.recipients
    .map(
      (row) => `
      <tr>
        <td>${row.rank}</td>
        <td><strong>${escapeHtml(row.name)}</strong><div class="muted">${row.kind === "animals" ? "Animals" : "People"}</div></td>
        <td class="num">${row.collections}</td>
        <td class="num">${escapeHtml(formatKg(row.totalKg))}</td>
        <td class="num">${row.sharePercent}%</td>
        <td class="num">${escapeHtml(formatCollectionDate(row.lastCollectionAt))}</td>
      </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Saveful Impact Report</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; color: #1a1a1a; background: #fffaf3; margin: 0; }
    .page { padding: 32px; }
    h1 { color: #2d5f4f; margin: 0 0 4px; }
    .meta { color: #6b6b6b; font-size: 13px; margin-bottom: 24px; }
    h2 { color: #2d5f4f; font-size: 16px; margin: 28px 0 10px; }
    table { width: 100%; border-collapse: collapse; background: white; }
    th, td { border-bottom: 1px solid #eee; padding: 8px 10px; text-align: left; font-size: 13px; }
    th { color: #6b6b6b; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
    .num { text-align: right; }
    .muted { color: #888; font-size: 12px; }
    .kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
    .kpis div { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="page">
    <h1>Impact Report</h1>
    <div class="meta">${escapeHtml(input.organisation)} · ${escapeHtml(input.site)} · ${escapeHtml(input.period)}</div>
    <h2>Impact totals</h2>
    <div class="kpis">
      <div><span>Food redistributed</span><strong>${escapeHtml(formatKg(input.stats.redistributedKg))}</strong></div>
      <div><span>Meals created</span><strong>${escapeHtml(formatNumber(input.stats.mealsCreated))}</strong></div>
      <div><span>CO₂ avoided</span><strong>${escapeHtml(formatKg(input.stats.co2AvoidedKg))}</strong></div>
      <div><span>Food saved value</span><strong>${escapeHtml(formatMoney(input.stats.foodSavedMoney))}</strong></div>
      <div><span>Collections</span><strong>${escapeHtml(formatNumber(input.stats.collectionsCompleted))}</strong></div>
      <div><span>Partners</span><strong>${escapeHtml(formatNumber(input.stats.partnersSupported))}</strong></div>
      <div><span>For people</span><strong>${escapeHtml(formatKg(input.stats.peopleKg))} (${input.stats.peoplePercent}%)</strong></div>
      <div><span>For animals</span><strong>${escapeHtml(formatKg(input.stats.animalKg))} (${input.stats.animalPercent}%)</strong></div>
    </div>
    <h2>Food redistribution by category</h2>
    <table>
      <thead><tr><th>#</th><th>Food item</th><th class="num">Total</th><th class="num">People</th><th class="num">Animals</th><th class="num">Meals</th><th class="num">CO₂</th></tr></thead>
      <tbody>${foodRows}</tbody>
    </table>
    <h2>Recipient organisations</h2>
    <table>
      <thead><tr><th>#</th><th>Organisation</th><th class="num">Collections</th><th class="num">Total</th><th class="num">Share</th><th class="num">Last</th></tr></thead>
      <tbody>${recipientRows}</tbody>
    </table>
  </div>
</body>
</html>`;

  const report = window.open("", "_blank", "noopener,noreferrer,width=920,height=720");
  if (!report) return;
  report.document.write(html);
  report.document.close();
  report.focus();
  report.print();
}
