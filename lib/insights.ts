import { periodLabel, rangeLabel } from "@/lib/dates";
import { calculateImpact, IMPACT } from "@/lib/impact";
import {
  EMPTY_FILTERS,
  foodCategoryFor,
  foodCategoryId,
  impactFromTransactions,
  impactOverTime,
  PATHWAY_LABEL,
  RECIPIENT_TYPE,
  recoveryPathways,
  scopedTransactions,
} from "@/lib/networkQuery";
import { listUnits } from "@/lib/orgStructure";
import { demoNetworkSites } from "@/lib/network";
import type {
  AccessScope,
  NetworkFilters,
  PeriodKey,
  RecoveryPathway,
  RecoveryTransaction,
} from "@/types/enterprise";

export type InsightsMetric = "food" | "meals" | "co2" | "value" | "collections";
export type InsightsTab = "impact" | "network";
export type PerformanceView = "group" | "territory" | "cluster" | "site";

export type InsightsFilters = NetworkFilters & {
  tab: InsightsTab;
  pathway: "all" | RecoveryPathway;
  foodId: string;
  recipientId: string;
  metric: InsightsMetric;
  viewBy: PerformanceView;
};

export const EMPTY_INSIGHTS_FILTERS: InsightsFilters = {
  ...EMPTY_FILTERS,
  tab: "impact",
  pathway: "all",
  foodId: "all",
  recipientId: "all",
  metric: "food",
  viewBy: "group",
};

export const INSIGHTS_METRICS: { id: InsightsMetric; label: string }[] = [
  { id: "food", label: "Food recovered" },
  { id: "meals", label: "Meals created" },
  { id: "co2", label: "CO₂ avoided" },
  { id: "value", label: "Estimated food value" },
  { id: "collections", label: "Completed collections" },
];

export const INSIGHTS_PATHWAYS: { id: RecoveryPathway; label: string }[] = (
  Object.keys(PATHWAY_LABEL) as RecoveryPathway[]
).map((id) => ({ id, label: PATHWAY_LABEL[id] }));

const PATHWAYS: RecoveryPathway[] = ["people", "livestock", "circular", "bioenergy"];
const METRICS: InsightsMetric[] = ["food", "meals", "co2", "value", "collections"];
const VIEWS: PerformanceView[] = ["group", "territory", "cluster", "site"];

export function parseInsightsFilters(params: URLSearchParams): InsightsFilters {
  const pathway = params.get("pathway");
  const metric = params.get("metric");
  const viewBy = params.get("viewBy");
  return {
    tab: params.get("tab") === "network" ? "network" : "impact",
    groupId: params.get("group") || "all",
    territoryId: params.get("territory") || "all",
    clusterId: params.get("cluster") || "all",
    siteId: params.get("site") || "all",
    period: (["7", "30", "90", "all"].includes(params.get("period") ?? "")
      ? params.get("period")
      : "30") as PeriodKey,
    pathway: PATHWAYS.includes(pathway as RecoveryPathway) ? (pathway as RecoveryPathway) : "all",
    foodId: params.get("food") || "all",
    recipientId: params.get("org") || "all",
    metric: METRICS.includes(metric as InsightsMetric) ? (metric as InsightsMetric) : "food",
    viewBy: VIEWS.includes(viewBy as PerformanceView) ? (viewBy as PerformanceView) : "group",
  };
}

export function insightsFiltersToQuery(filters: InsightsFilters) {
  const params = new URLSearchParams();
  if (filters.tab !== "impact") params.set("tab", filters.tab);
  if (filters.groupId !== "all") params.set("group", filters.groupId);
  if (filters.territoryId !== "all") params.set("territory", filters.territoryId);
  if (filters.clusterId !== "all") params.set("cluster", filters.clusterId);
  if (filters.siteId !== "all") params.set("site", filters.siteId);
  if (filters.period !== "30") params.set("period", filters.period);
  if (filters.tab === "impact" && filters.pathway !== "all") params.set("pathway", filters.pathway);
  if (filters.tab === "impact" && filters.foodId !== "all") params.set("food", filters.foodId);
  if (filters.tab === "impact" && filters.recipientId !== "all") params.set("org", filters.recipientId);
  if (filters.tab === "impact" && filters.metric !== "food") params.set("metric", filters.metric);
  if (filters.tab === "network" && filters.viewBy !== "group") params.set("viewBy", filters.viewBy);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function hasActiveInsightsFilters(filters: InsightsFilters) {
  const network =
    filters.period !== "30" ||
    filters.groupId !== "all" ||
    filters.territoryId !== "all" ||
    filters.clusterId !== "all" ||
    filters.siteId !== "all";
  if (filters.tab === "network") return network;
  return network || filters.pathway !== "all" || filters.foodId !== "all" || filters.recipientId !== "all";
}

export function networkFiltersFrom(filters: InsightsFilters): NetworkFilters {
  return {
    groupId: filters.groupId,
    territoryId: filters.territoryId,
    clusterId: filters.clusterId,
    siteId: filters.siteId,
    period: filters.period,
  };
}

export type InsightsRange = { startDate?: string; endDate?: string };

export function reportingRows(filters: InsightsFilters, scope: AccessScope, range?: InsightsRange) {
  return scopedTransactions(networkFiltersFrom(filters), scope, range).filter((row) => {
    if (filters.pathway !== "all" && row.pathway !== filters.pathway) return false;
    if (filters.foodId !== "all" && foodCategoryId(foodCategoryFor(row)) !== filters.foodId) return false;
    if (filters.recipientId !== "all" && row.recipientId !== filters.recipientId) return false;
    return true;
  });
}

function seriesValue(kg: number, collections: number, metric: InsightsMetric) {
  const impact = calculateImpact(kg);
  if (metric === "meals") return impact.mealsCreated;
  if (metric === "co2") return impact.co2AvoidedKg;
  if (metric === "value") return impact.foodValue;
  if (metric === "collections") return collections;
  return kg;
}

export function foodInsights(rows: RecoveryTransaction[]) {
  const total = rows.reduce((sum, row) => sum + row.kg, 0);
  const grouped = new Map<string, { name: string; kg: number; collections: number }>();
  for (const row of rows) {
    const name = foodCategoryFor(row);
    const current = grouped.get(name) ?? { name, kg: 0, collections: 0 };
    current.kg += row.kg;
    current.collections += 1;
    grouped.set(name, current);
  }
  return [...grouped.values()]
    .sort((a, b) => b.kg - a.kg)
    .map((item, index) => ({
      id: foodCategoryId(item.name),
      rank: index + 1,
      name: item.name,
      kg: item.kg,
      collections: item.collections,
      percent: total > 0 ? Math.round((item.kg / total) * 100) : 0,
      impact: calculateImpact(item.kg),
    }));
}

export function organisationInsights(rows: RecoveryTransaction[]) {
  const total = rows.reduce((sum, row) => sum + row.kg, 0);
  const grouped = new Map<
    string,
    { id: string; name: string; kg: number; collections: number; pathways: RecoveryPathway[] }
  >();
  for (const row of rows) {
    const current = grouped.get(row.recipientId) ?? {
      id: row.recipientId,
      name: row.recipientName,
      kg: 0,
      collections: 0,
      pathways: [],
    };
    current.kg += row.kg;
    current.collections += 1;
    if (!current.pathways.includes(row.pathway)) current.pathways.push(row.pathway);
    grouped.set(row.recipientId, current);
  }
  return [...grouped.values()]
    .sort((a, b) => b.kg - a.kg)
    .map((item, index) => {
      const dominant = item.pathways
        .map((pathway) => ({
          pathway,
          kg: rows
            .filter((row) => row.recipientId === item.id && row.pathway === pathway)
            .reduce((sum, row) => sum + row.kg, 0),
        }))
        .sort((a, b) => b.kg - a.kg)[0]?.pathway ?? "people";
      return {
        id: item.id,
        rank: index + 1,
        name: item.name,
        type: RECIPIENT_TYPE[dominant],
        pathway: dominant,
        kg: item.kg,
        collections: item.collections,
        percent: total > 0 ? Math.round((item.kg / total) * 100) : 0,
        impact: calculateImpact(item.kg),
      };
    });
}

export function insightsScopeLabel(filters: InsightsFilters) {
  const parts = [
    filters.groupId === "all" ? null : listUnits("group").find((item) => item.id === filters.groupId)?.name,
    filters.territoryId === "all" ? null : listUnits("territory").find((item) => item.id === filters.territoryId)?.name,
    filters.clusterId === "all" ? null : listUnits("cluster").find((item) => item.id === filters.clusterId)?.name,
    filters.siteId === "all" ? null : demoNetworkSites.find((item) => item.id === filters.siteId)?.name,
    filters.pathway === "all" ? null : PATHWAY_LABEL[filters.pathway],
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "All authorised locations";
}

export function buildInsightsModel(
  filters: InsightsFilters,
  scope: AccessScope,
  range?: InsightsRange,
) {
  const rows = reportingRows(filters, scope, range);
  const pathwayRows = reportingRows({ ...filters, pathway: "all" }, scope, range);
  const impact = impactFromTransactions(rows);
  const metric = INSIGHTS_METRICS.find((item) => item.id === filters.metric) ?? INSIGHTS_METRICS[0];
  const foods = foodInsights(rows);
  const organisations = organisationInsights(rows);
  const selectedFood = foods.find((item) => item.id === filters.foodId) ?? null;
  const selectedOrg = organisations.find((item) => item.id === filters.recipientId) ?? null;

  return {
    filters,
    rows,
    impact,
    pathways: recoveryPathways(rows),
    allPathways: recoveryPathways(pathwayRows),
    foods,
    organisations,
    selectedFood,
    selectedOrg,
    series: impactOverTime(rows, filters.period).map((point) => ({
      ...point,
      value: seriesValue(point.kg, point.collections, filters.metric),
    })),
    metric,
    periodLabel: range ? rangeLabel(range.startDate, range.endDate) : periodLabel(filters.period),
    scopeLabel: insightsScopeLabel(filters),
    methodology: IMPACT,
  };
}

export type InsightsModel = ReturnType<typeof buildInsightsModel>;
export type InsightsFood = InsightsModel["foods"][number];
export type InsightsOrganisation = InsightsModel["organisations"][number];
