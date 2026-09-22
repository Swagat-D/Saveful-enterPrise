import {
  ORG_TYPES,
  PARTICIPATION_ROLES,
  buildAdminOverview,
  collectionKg,
  countryLabel,
  filteredCollections,
  getOrganisation,
  isCompletedCollection,
  type AdminCollection,
  type AdminFilters,
} from "@/lib/admin";
import { downloadAdminInsightPdf } from "@/lib/adminInsightPdf";
import { liveToday, periodLabel, rangeForFilters } from "@/lib/dates";
import { IMPACT, calculateImpact, formatCount, formatKg, formatMoney } from "@/lib/impact";

export type InsightRankedRow = {
  id: string;
  name: string;
  detail?: string;
  kg: number;
  collections: number;
  percent: number;
};

export type AdminInsightStory = {
  periodLabel: string;
  scopeLabel: string;
  generatedAt: string;
  days: number;
  annualised: boolean;
  overview: ReturnType<typeof buildAdminOverview>;
  foods: InsightRankedRow[];
  recipients: InsightRankedRow[];
  providers: InsightRankedRow[];
  sites: InsightRankedRow[];
  equivalents: {
    meals: number;
    value: number;
    co2: number;
    organisationsSupported: number;
    edibleKg: number;
    nonEdibleKg: number;
  };
  projection: {
    yearKg: number;
    yearMeals: number;
    yearCo2: number;
    yearValue: number;
  };
};

export function buildAdminInsightStory(filters: AdminFilters): AdminInsightStory {
  const overview = buildAdminOverview(filters);
  const collections = filteredCollections(filters).filter(isCompletedCollection);
  const range = rangeForFilters(filters, liveToday());
  const days =
    range.startDate && range.endDate
      ? daysInRange(range.startDate, range.endDate)
      : Math.max(daysFromCollections(collections, range.endDate), 1);
  const foodKg = overview.metrics.recoveredKg;
  const impact = calculateImpact(foodKg);
  const annualised = filters.period !== "all";
  const yearKg = annualised ? (foodKg / days) * 365 : foodKg;
  const yearImpact = calculateImpact(yearKg);
  const edibleKg = overview.pathways.find((item) => item.pathway === "people")?.kg ?? 0;
  const nonEdibleKg = overview.pathways
    .filter((item) => item.pathway !== "people")
    .reduce((sum, item) => sum + item.kg, 0);
  const organisationsSupported = new Set(
    collections.flatMap((row) => [row.orgId, row.recipientOrgId].filter(Boolean)),
  ).size;

  return {
    periodLabel: periodLabel(filters.period, { from: filters.from, to: filters.to }),
    scopeLabel: adminScopeLabel(filters),
    generatedAt: new Date().toISOString(),
    days,
    annualised,
    overview,
    foods: rankRows(foodRows(collections)),
    recipients: rankRows(groupRows(collections, (row) => [row.orgId, row.recipientName || "Unknown recipient"])),
    providers: rankRows(
      groupRows(collections, (row) => [row.providerName || row.siteId, row.providerName || row.siteName || "Unknown source"]),
    ),
    sites: rankRows(groupRows(collections, (row) => [row.siteId, row.siteName || row.providerName || `Site ${row.siteId}`])),
    equivalents: {
      meals: impact.mealsCreated,
      value: impact.foodValue,
      co2: impact.co2AvoidedKg,
      organisationsSupported: organisationsSupported || overview.metrics.organisations,
      edibleKg,
      nonEdibleKg,
    },
    projection: {
      yearKg,
      yearMeals: yearImpact.mealsCreated,
      yearCo2: yearImpact.co2AvoidedKg,
      yearValue: yearImpact.foodValue,
    },
  };
}

export function adminInsightSummary(story: AdminInsightStory) {
  const { overview, periodLabel, equivalents } = story;
  return `Saveful recovered ${formatKg(overview.metrics.recoveredKg)} of food in ${periodLabel.toLowerCase()} - enough for ${formatCount(equivalents.meals)} meals, ${formatKg(equivalents.co2)} of CO₂ emissions avoided, and about ${formatMoney(equivalents.value)} of food value.`;
}

export function downloadAdminInsightExcel(story: AdminInsightStory) {
  const { overview } = story;
  const sheets = [
    {
      name: "cover",
      headers: ["field", "value"],
      rows: [
        ["title", "Saveful platform insights report"],
        ["scope", story.scopeLabel],
        ["period", story.periodLabel],
        ["generated_at", story.generatedAt],
        ["summary", adminInsightSummary(story)],
        ["meal_weight_kg", IMPACT.MEAL_WEIGHT_KG],
        ["co2_per_kg", IMPACT.CO2_PER_KG],
        ["food_value_per_kg", IMPACT.FOOD_VALUE_PER_KG],
      ],
    },
    {
      name: "impact_summary",
      headers: ["metric", "value"],
      rows: [
        ["food_kg", round(overview.metrics.recoveredKg)],
        ["meals_created", round(overview.metrics.mealsCreated, 2)],
        ["co2_avoided_kg", round(overview.metrics.co2AvoidedKg)],
        ["food_value", round(overview.metrics.foodValue, 2)],
        ["collections", overview.metrics.collections],
        ["listings_published", overview.operations.listingsPublished],
        ["claim_rate_percent", overview.operations.claimRate],
        ["recovery_rate_percent", overview.operations.recoveryRate],
        ["organisations", overview.metrics.organisations],
        ["sites", overview.metrics.sites],
        ["projected_year_kg", round(story.projection.yearKg)],
        ["organisations_supported", story.equivalents.organisationsSupported],
        ["surplus_food_edible_kg", round(story.equivalents.edibleKg)],
        ["surplus_food_non_edible_kg", round(story.equivalents.nonEdibleKg)],
      ],
    },
    {
      name: "recovery_pathways",
      headers: ["pathway", "kg", "share_percent"],
      rows: overview.pathways.map((item) => [item.label, round(item.kg), item.percent]),
    },
    {
      name: "foods",
      headers: ["food", "kg", "collections", "share_percent"],
      rows: story.foods.map((item) => [item.name, round(item.kg), item.collections, item.percent]),
    },
    {
      name: "recipients",
      headers: ["organisation", "kg", "collections", "share_percent"],
      rows: story.recipients.map((item) => [item.name, round(item.kg), item.collections, item.percent]),
    },
    {
      name: "providers",
      headers: ["source", "kg", "collections", "share_percent"],
      rows: story.providers.map((item) => [item.name, round(item.kg), item.collections, item.percent]),
    },
    {
      name: "sites",
      headers: ["site", "kg", "collections", "share_percent"],
      rows: story.sites.map((item) => [item.name, round(item.kg), item.collections, item.percent]),
    },
    {
      name: "network_by_type",
      headers: ["type", "organisations", "active", "listings", "claims", "collections", "recovered_kg"],
      rows: overview.types.map((row) => [
        row.label,
        row.organisations,
        row.active,
        row.listings,
        row.claims,
        row.collections,
        round(row.recoveredKg),
      ]),
    },
    {
      name: "activity_over_time",
      headers: ["period", "food_kg", "collections"],
      rows: overview.series.map((row) => [row.label, round(row.kg), row.collections]),
    },
    {
      name: "needs_attention",
      headers: ["item", "count"],
      rows: overview.attention.map((item) => [item.label, item.count]),
    },
  ];

  downloadFile(
    `Saveful_Platform_Insights_${story.generatedAt.slice(0, 10)}.xls`,
    workbookXml(sheets),
    "application/vnd.ms-excel",
  );
}

export function downloadAdminInsightReport(story: AdminInsightStory) {
  downloadAdminInsightPdf(story);
}

function adminScopeLabel(filters: AdminFilters) {
  const parts = [
    filters.country !== "all" ? countryLabel(filters.country) : null,
    filters.state !== "all" ? filters.state : null,
    filters.orgType !== "all" ? ORG_TYPES.find((item) => item.id === filters.orgType)?.label : null,
    filters.role !== "all" && filters.role !== "both"
      ? PARTICIPATION_ROLES.find((item) => item.id === filters.role)?.label
      : filters.role === "both"
        ? "Providers and receivers"
        : null,
    filters.organisationId !== "all" ? getOrganisation(filters.organisationId)?.name : null,
    filters.pathway !== "all" ? filters.pathway : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Entire platform";
}

function foodRows(collections: AdminCollection[]) {
  const grouped = new Map<string, { id: string; name: string; kg: number; collections: number }>();
  for (const row of collections) {
    const items = row.items?.length
      ? row.items
      : [{ name: row.food || "Mixed surplus", totalQtyKg: collectionKg(row) }];
    const rowKg = collectionKg(row);
    const itemTotal = items.reduce((sum, item) => sum + (item.totalQtyKg || 0), 0) || rowKg || items.length;
    for (const item of items) {
      const share = itemTotal > 0 ? (item.totalQtyKg || 0) / itemTotal : 1 / items.length;
      const kg = rowKg > 0 ? rowKg * share : item.totalQtyKg || 0;
      const name = item.name || "Mixed surplus";
      const current = grouped.get(name) ?? { id: name, name, kg: 0, collections: 0 };
      current.kg += kg;
      current.collections += 1;
      grouped.set(name, current);
    }
  }
  return [...grouped.values()];
}

function groupRows(collections: AdminCollection[], key: (row: AdminCollection) => [string, string]) {
  const grouped = new Map<string, { id: string; name: string; kg: number; collections: number }>();
  for (const row of collections) {
    const [id, name] = key(row);
    const current = grouped.get(id) ?? { id, name: name || id || "—", kg: 0, collections: 0 };
    current.kg += collectionKg(row);
    current.collections += 1;
    grouped.set(id, current);
  }
  return [...grouped.values()];
}

function rankRows(rows: Array<{ id: string; name: string; kg: number; collections: number }>): InsightRankedRow[] {
  const total = rows.reduce((sum, row) => sum + row.kg, 0);
  return rows
    .sort((a, b) => b.kg - a.kg)
    .map((row) => ({
      ...row,
      percent: total > 0 ? Math.round((row.kg / total) * 100) : 0,
    }));
}

function daysInRange(start?: string, end?: string) {
  if (!start || !end) return 30;
  const from = new Date(`${start.slice(0, 10)}T12:00:00`);
  const to = new Date(`${end.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 30;
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1);
}

function daysFromCollections(collections: AdminCollection[], end?: string) {
  const first = collections.map((row) => row.occurredAt).filter(Boolean).sort()[0];
  if (!first) return 365;
  return daysInRange(first.slice(0, 10), end || first.slice(0, 10));
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
