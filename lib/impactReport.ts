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
import { saveReportPdf, type PdfBlock } from "@/lib/reportPdf";
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

export function downloadReportPdf(payload: ReportPayload) {
  const include = new Set(payload.sections);
  const { insights, network } = payload;
  const blocks: PdfBlock[] = [];

  if (include.has("totals")) {
    blocks.push({
      kind: "kpis",
      title: "Impact summary",
      items: [
        ["Food recovered", formatKg(insights.impact.foodKg)],
        ["Meals created", formatCount(insights.impact.mealsCreated)],
        ["CO₂ avoided", formatKg(insights.impact.co2AvoidedKg)],
        ["Estimated food value", formatMoney(insights.impact.foodValue)],
        ["Completed collections", formatCount(insights.impact.collectionsCompleted)],
        ["Organisations supported", formatCount(insights.impact.organisationsSupported)],
      ],
    });
  }
  if (include.has("pathways")) {
    blocks.push({
      kind: "table",
      title: "Recovery pathways",
      columns: [
        { label: "Pathway", width: 3 },
        { label: "Quantity", width: 1, align: "right" },
        { label: "Share", width: 1, align: "right" },
      ],
      rows: insights.pathways.map((item) => [item.label, formatKg(item.kg), `${item.percent}%`]),
    });
  }
  if (include.has("foods")) {
    blocks.push({
      kind: "table",
      title: "Food insights",
      columns: [
        { label: "Food category", width: 4 },
        { label: "Quantity", width: 1, align: "right" },
        { label: "Share", width: 0.8, align: "right" },
        { label: "Collections", width: 1, align: "right" },
      ],
      rows: insights.foods.map((item) => [item.name, formatKg(item.kg), `${item.percent}%`, formatCount(item.collections)]),
    });
  }
  if (include.has("organisations")) {
    blocks.push({
      kind: "table",
      title: "Organisations supported",
      columns: [
        { label: "Organisation", width: 3 },
        { label: "Type", width: 1.4 },
        { label: "Quantity", width: 1, align: "right" },
        { label: "Collections", width: 1, align: "right" },
      ],
      rows: insights.organisations.map((item) => [item.name, item.type, formatKg(item.kg), formatCount(item.collections)]),
    });
  }
  if (include.has("network")) {
    blocks.push({
      kind: "kpis",
      title: "Network performance",
      columns: 4,
      items: [
        ["Total sites", formatCount(network.network.totalSites)],
        ["Active sites", formatCount(network.network.activeSites)],
        ["Sites with activity", formatCount(network.network.sitesWithActivity)],
        ["Participation", `${network.network.participationRate}%`],
      ],
    });
  }
  if (include.has("sites")) {
    blocks.push({
      kind: "table",
      title: "Site-level detail",
      columns: [
        { label: "Site", width: 3 },
        { label: "Group", width: 1.6 },
        { label: "Quantity", width: 1, align: "right" },
        { label: "Collections", width: 1, align: "right" },
        { label: "Meals", width: 1, align: "right" },
      ],
      rows: payload.sites.map((item) => [
        item.siteName,
        item.group,
        formatKg(item.kg),
        formatCount(item.collections),
        formatCount(item.mealsCreated),
      ]),
    });
  }

  return saveReportPdf({
    filename: `Saveful_Impact_Report_${new Date().toISOString().slice(0, 10)}.pdf`,
    eyebrow: "Impact & ESG report",
    title: "Impact and recovery report",
    meta: [
      ["Organisation", payload.organisation],
      ["Scope", payload.scopeLabel],
      ["Period", payload.periodLabel],
    ],
    blocks,
    footer: `Impact uses centrally managed Saveful conversion factors: 1 meal = ${IMPACT.MEAL_WEIGHT_KG} kg; CO₂ avoided = ${IMPACT.CO2_PER_KG} kg per kg food; estimated value = ${formatMoney(IMPACT.FOOD_VALUE_PER_KG)} per kg. Figures reconcile with Insights for the same scope and period.`,
    logoDataUrl: payload.logoDataUrl,
  });
}

export function insightsScopeSummary(filters: InsightsFilters, enterprise: boolean) {
  return enterprise ? "Entire Enterprise" : insightsScopeLabel(filters);
}
