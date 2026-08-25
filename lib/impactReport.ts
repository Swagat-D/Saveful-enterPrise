import { getOrganization } from "@/lib/organization";
import { calculateImpact, formatCount, formatKg, formatMoney, IMPACT } from "@/lib/impact";
import {
  buildInsightsModel,
  EMPTY_INSIGHTS_FILTERS,
  insightsScopeLabel,
  type InsightsFilters,
  type InsightsModel,
  type InsightsRange,
} from "@/lib/insights";
import { demoNetworkSites } from "@/lib/network";
import { buildNetworkPerformanceModel, type NetworkPerformanceModel } from "@/lib/networkPerformance";
import { lookupLabel } from "@/lib/sitesDirectory";
import type { AccessScope } from "@/types/enterprise";

export type ReportSection = "totals" | "pathways" | "foods" | "organisations" | "network" | "sites";
export type ReportFormat = "pdf" | "excel";

export const REPORT_SECTIONS: { id: ReportSection; label: string; hint: string; defaultOn: boolean }[] = [
  { id: "totals", label: "Impact summary", hint: "Food recovered, meals created, CO₂ avoided, value and collections.", defaultOn: true },
  { id: "pathways", label: "Recovery pathways", hint: "Where recovered food and organic resources went.", defaultOn: true },
  { id: "foods", label: "Food insights", hint: "Food categories and quantities recovered.", defaultOn: true },
  { id: "organisations", label: "Organisations supported", hint: "Recipient and recovery organisations supported.", defaultOn: true },
  { id: "network", label: "Network performance", hint: "Site participation and activity.", defaultOn: true },
  { id: "sites", label: "Site-level detail", hint: "Detailed results by individual site.", defaultOn: false },
];

export const DEFAULT_REPORT_SECTIONS = REPORT_SECTIONS.filter((item) => item.defaultOn).map((item) => item.id);

export type ReportPayload = {
  title: string;
  organisation: string;
  logoDataUrl?: string | null;
  scopeLabel: string;
  periodLabel: string;
  format: ReportFormat;
  sections: ReportSection[];
  insights: InsightsModel;
  network: NetworkPerformanceModel;
  sites: {
    siteId: string;
    siteName: string;
    group: string;
    territory: string;
    cluster: string;
    kg: number;
    collections: number;
    mealsCreated: number;
    co2AvoidedKg: number;
  }[];
};

export function reportFiltersFromScope(input: {
  groupId: string;
  territoryId: string;
  clusterId: string;
  siteId: string;
  period: InsightsFilters["period"];
  pathway?: InsightsFilters["pathway"];
}): InsightsFilters {
  return {
    ...EMPTY_INSIGHTS_FILTERS,
    groupId: input.groupId,
    territoryId: input.territoryId,
    clusterId: input.clusterId,
    siteId: input.siteId,
    period: input.period,
    pathway: input.pathway ?? "all",
  };
}

export function buildReportPayload(input: {
  filters: InsightsFilters;
  scope: AccessScope;
  range?: InsightsRange;
  sections: ReportSection[];
  format: ReportFormat;
  organisation: string;
}): ReportPayload {
  const insights = buildInsightsModel(input.filters, input.scope, input.range);
  const network = buildNetworkPerformanceModel(input.filters, input.scope, input.range);
  const sites = siteRows(insights);
  const organization = getOrganization();

  return {
    title: `Impact and recovery report · ${insights.periodLabel}`,
    organisation: input.organisation || organization.name,
    logoDataUrl: organization.logoDataUrl,
    scopeLabel: insights.scopeLabel,
    periodLabel: insights.periodLabel,
    format: input.format,
    sections: input.sections,
    insights,
    network,
    sites,
  };
}

export function hasReportableData(payload: ReportPayload) {
  return payload.insights.rows.length > 0 && payload.insights.impact.foodKg > 0;
}

function siteRows(insights: InsightsModel) {
  const grouped = new Map<string, { siteId: string; siteName: string; kg: number; collections: number }>();
  for (const row of insights.rows) {
    const current = grouped.get(row.snapshot.siteId) ?? {
      siteId: row.snapshot.siteId,
      siteName: row.snapshot.siteName,
      kg: 0,
      collections: 0,
    };
    current.kg += row.kg;
    current.collections += 1;
    grouped.set(row.snapshot.siteId, current);
  }
  return [...grouped.values()]
    .sort((a, b) => b.kg - a.kg)
    .map((item) => {
      const site = demoNetworkSites.find((entry) => entry.id === item.siteId);
      const impact = calculateImpact(item.kg);
      return {
        siteId: item.siteId,
        siteName: item.siteName,
        group: lookupLabel("group", site?.groupId),
        territory: lookupLabel("territory", site?.territoryId),
        cluster: lookupLabel("cluster", site?.clusterId),
        kg: item.kg,
        collections: item.collections,
        mealsCreated: impact.mealsCreated,
        co2AvoidedKg: impact.co2AvoidedKg,
      };
    });
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function downloadReportExcel(payload: ReportPayload) {
  const include = new Set(payload.sections);
  const sheets: { name: string; headers: string[]; rows: (string | number)[][] }[] = [
    {
      name: "meta",
      headers: ["field", "value"],
      rows: [
        ["organisation", payload.organisation],
        ["scope", payload.scopeLabel],
        ["period", payload.periodLabel],
        ["meal_weight_kg", IMPACT.MEAL_WEIGHT_KG],
        ["co2_per_kg", IMPACT.CO2_PER_KG],
        ["food_value_per_kg", IMPACT.FOOD_VALUE_PER_KG],
      ],
    },
  ];

  if (include.has("totals")) {
    sheets.push({
      name: "impact_summary",
      headers: ["metric", "value"],
      rows: [
        ["food_kg", round(payload.insights.impact.foodKg)],
        ["meals_created", round(payload.insights.impact.mealsCreated, 2)],
        ["co2_avoided_kg", round(payload.insights.impact.co2AvoidedKg)],
        ["food_value", round(payload.insights.impact.foodValue, 2)],
        ["collections", payload.insights.impact.collectionsCompleted],
        ["organisations", payload.insights.impact.organisationsSupported],
      ],
    });
  }
  if (include.has("pathways")) {
    sheets.push({
      name: "recovery_pathways",
      headers: ["pathway", "kg", "share_percent"],
      rows: payload.insights.pathways.map((item) => [item.label, round(item.kg), item.percent]),
    });
  }
  if (include.has("foods")) {
    sheets.push({
      name: "food_insights",
      headers: ["food_category", "kg", "share_percent", "collections", "meals_created", "co2_avoided_kg"],
      rows: payload.insights.foods.map((item) => [
        item.name,
        round(item.kg),
        item.percent,
        item.collections,
        round(item.impact.mealsCreated, 2),
        round(item.impact.co2AvoidedKg),
      ]),
    });
  }
  if (include.has("organisations")) {
    sheets.push({
      name: "organisations",
      headers: ["organisation", "type", "kg", "collections", "share_percent"],
      rows: payload.insights.organisations.map((item) => [
        item.name,
        item.type,
        round(item.kg),
        item.collections,
        item.percent,
      ]),
    });
  }
  if (include.has("network")) {
    const { network } = payload.network;
    sheets.push({
      name: "network_performance",
      headers: ["metric", "value"],
      rows: [
        ["total_sites", network.totalSites],
        ["active_sites", network.activeSites],
        ["sites_with_activity", network.sitesWithActivity],
        ["no_activity", network.noActivity],
        ["never_activated", network.neverActivated],
        ["participation_percent", network.participationRate],
      ],
    });
  }
  if (include.has("sites")) {
    sheets.push({
      name: "site_detail",
      headers: ["site_id", "site_name", "group", "territory", "cluster", "food_kg", "collections", "meals_created", "co2_avoided_kg"],
      rows: payload.sites.map((item) => [
        item.siteId,
        item.siteName,
        item.group,
        item.territory,
        item.cluster,
        round(item.kg),
        item.collections,
        round(item.mealsCreated, 2),
        round(item.co2AvoidedKg),
      ]),
    });
  }

  downloadFile(
    `Saveful_Impact_Report_${new Date().toISOString().slice(0, 10)}.xls`,
    workbookXml(sheets),
    "application/vnd.ms-excel",
  );
}

function workbookXml(sheets: { name: string; headers: string[]; rows: (string | number)[][] }[]) {
  const worksheets = sheets
    .map((sheet) => {
      const header = `<Row>${sheet.headers.map((cell) => xmlCell(cell)).join("")}</Row>`;
      const body = sheet.rows.map((row) => `<Row>${row.map((cell) => xmlCell(cell)).join("")}</Row>`).join("");
      return `<Worksheet ss:Name="${escapeXml(sheet.name.slice(0, 31))}"><Table>${header}${body}</Table></Worksheet>`;
    })
    .join("");
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
${worksheets}
</Workbook>`;
}

function xmlCell(value: string | number) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<Cell><Data ss:Type="Number">${value}</Data></Cell>`;
  }
  return `<Cell><Data ss:Type="String">${escapeXml(String(value))}</Data></Cell>`;
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function printReportPdf(payload: ReportPayload) {
  const include = new Set(payload.sections);
  const insights = payload.insights;

  const totalsHtml = include.has("totals")
    ? `<h2>Impact summary</h2>
       <div class="kpis">
         <div><span>Food recovered</span><strong>${escapeHtml(formatKg(insights.impact.foodKg))}</strong></div>
         <div><span>Meals created</span><strong>${escapeHtml(formatCount(insights.impact.mealsCreated))}</strong></div>
         <div><span>CO₂ avoided</span><strong>${escapeHtml(formatKg(insights.impact.co2AvoidedKg))}</strong></div>
         <div><span>Estimated food value</span><strong>${escapeHtml(formatMoney(insights.impact.foodValue))}</strong></div>
         <div><span>Completed collections</span><strong>${escapeHtml(formatCount(insights.impact.collectionsCompleted))}</strong></div>
         <div><span>Organisations supported</span><strong>${escapeHtml(formatCount(insights.impact.organisationsSupported))}</strong></div>
       </div>`
    : "";

  const pathwaysHtml = include.has("pathways")
    ? `<h2>Recovery pathways</h2>
       <table><thead><tr><th>Pathway</th><th class="num">Quantity</th><th class="num">Share</th></tr></thead>
       <tbody>${insights.pathways
         .map(
           (item) =>
             `<tr><td>${escapeHtml(item.label)}</td><td class="num">${escapeHtml(formatKg(item.kg))}</td><td class="num">${item.percent}%</td></tr>`,
         )
         .join("")}</tbody></table>`
    : "";

  const foodsHtml = include.has("foods")
    ? `<h2>Food insights</h2>
       <table><thead><tr><th>Food category</th><th class="num">Quantity</th><th class="num">Share</th><th class="num">Collections</th></tr></thead>
       <tbody>${insights.foods
         .map(
           (item) =>
             `<tr><td>${escapeHtml(item.name)}</td><td class="num">${escapeHtml(formatKg(item.kg))}</td><td class="num">${item.percent}%</td><td class="num">${item.collections}</td></tr>`,
         )
         .join("")}</tbody></table>`
    : "";

  const orgsHtml = include.has("organisations")
    ? `<h2>Organisations supported</h2>
       <table><thead><tr><th>Organisation</th><th>Type</th><th class="num">Quantity</th><th class="num">Collections</th></tr></thead>
       <tbody>${insights.organisations
         .map(
           (item) =>
             `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.type)}</td><td class="num">${escapeHtml(formatKg(item.kg))}</td><td class="num">${item.collections}</td></tr>`,
         )
         .join("")}</tbody></table>`
    : "";

  const networkHtml = include.has("network")
    ? `<h2>Network performance</h2>
       <div class="kpis">
         <div><span>Total sites</span><strong>${payload.network.network.totalSites}</strong></div>
         <div><span>Active sites</span><strong>${payload.network.network.activeSites}</strong></div>
         <div><span>Sites with activity</span><strong>${payload.network.network.sitesWithActivity}</strong></div>
         <div><span>Participation</span><strong>${payload.network.network.participationRate}%</strong></div>
       </div>`
    : "";

  const sitesHtml = include.has("sites")
    ? `<h2>Site-level detail</h2>
       <table><thead><tr><th>Site</th><th>Group</th><th class="num">Quantity</th><th class="num">Collections</th></tr></thead>
       <tbody>${payload.sites
         .map(
           (item) =>
             `<tr><td>${escapeHtml(item.siteName)}</td><td>${escapeHtml(item.group)}</td><td class="num">${escapeHtml(formatKg(item.kg))}</td><td class="num">${item.collections}</td></tr>`,
         )
         .join("")}</tbody></table>`
    : "";

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(payload.title)}</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; color: #1a1a1a; background: #fffaf3; margin: 0; }
    .page { padding: 36px; }
    .logo { height: 56px; margin-bottom: 16px; }
    h1 { color: #2d5f4f; margin: 0 0 6px; font-size: 26px; }
    .meta { color: #6b6b6b; font-size: 13px; margin-bottom: 24px; }
    h2 { color: #2d5f4f; font-size: 16px; margin: 28px 0 10px; }
    table { width: 100%; border-collapse: collapse; background: white; }
    th, td { border-bottom: 1px solid #eee; padding: 8px 10px; text-align: left; font-size: 13px; }
    th { color: #6b6b6b; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
    .num { text-align: right; }
    .kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
    .kpis div { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #eee; }
    .method { margin-top: 32px; color: #6b6b6b; font-size: 12px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="page">
    ${payload.logoDataUrl ? `<img class="logo" src="${payload.logoDataUrl}" alt="" />` : ""}
    <h1>Impact and recovery report</h1>
    <div class="meta">${escapeHtml(payload.organisation)} · ${escapeHtml(payload.scopeLabel)} · ${escapeHtml(payload.periodLabel)}</div>
    ${totalsHtml}
    ${pathwaysHtml}
    ${foodsHtml}
    ${orgsHtml}
    ${networkHtml}
    ${sitesHtml}
    <p class="method">Impact uses centrally managed Saveful conversion factors: 1 meal = ${IMPACT.MEAL_WEIGHT_KG} kg; CO₂ avoided = ${IMPACT.CO2_PER_KG} kg per kg food; estimated value = ${formatMoney(IMPACT.FOOD_VALUE_PER_KG)} per kg. Figures reconcile with Insights for the same scope and period.</p>
  </div>
</body>
</html>`;

  const report = window.open("", "_blank", "noopener,noreferrer,width=920,height=720");
  if (!report) return false;
  report.document.write(html);
  report.document.close();
  report.focus();
  report.print();
  return true;
}

export function insightsScopeSummary(filters: InsightsFilters, enterprise: boolean) {
  return enterprise ? "Entire Enterprise" : insightsScopeLabel(filters);
}
