import { calculateImpact, percentChange } from "@/lib/impact";
import { inDateRange, periodRange, previousPeriodRange } from "@/lib/dates";
import { demoNetworkSites, recoveryTransactions } from "@/lib/network";
import { listUnits, resolveSite } from "@/lib/orgStructure";
import {
  ATTENTION_COPY,
  attentionReasons,
  hasActivityInPeriod,
  isActivated,
  matchesAttention,
} from "@/lib/networkRules";
import { EMPTY_FILTERS, siteInScope, siteMatchesFilters, visibleSites } from "@/lib/scope";
import type {
  AccessScope,
  AttentionReason,
  NetworkFilters,
  OrganizationSite,
  PeriodKey,
  RecoveryPathway,
  RecoveryTransaction,
} from "@/types/enterprise";

export type { NetworkFilters };

const PERIODS: PeriodKey[] = ["7", "30", "90", "all"];

export function parseNetworkFilters(params: URLSearchParams): NetworkFilters {
  const period = params.get("period");
  return {
    groupId: params.get("group") || "all",
    territoryId: params.get("territory") || "all",
    clusterId: params.get("cluster") || "all",
    siteId: params.get("site") || "all",
    period: PERIODS.includes(period as PeriodKey) ? (period as PeriodKey) : "30",
  };
}

export function filtersToSearchParams(filters: NetworkFilters, extra?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters.groupId !== "all") params.set("group", filters.groupId);
  if (filters.territoryId !== "all") params.set("territory", filters.territoryId);
  if (filters.clusterId !== "all") params.set("cluster", filters.clusterId);
  if (filters.siteId !== "all") params.set("site", filters.siteId);
  if (filters.period !== "30") params.set("period", filters.period);
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value) params.set(key, value);
    }
  }
  return params;
}

export function filtersToQuery(filters: NetworkFilters, extra?: Record<string, string | undefined>) {
  const params = filtersToSearchParams(filters, extra);
  const query = params.toString();
  return query ? `?${query}` : "";
}

function matchesDimension(
  site: OrganizationSite,
  filters: NetworkFilters,
  skip?: "groupId" | "territoryId" | "clusterId" | "siteId",
) {
  const current = resolveSite(site);
  if (skip !== "groupId" && filters.groupId !== "all" && current.groupId !== filters.groupId) return false;
  if (skip !== "territoryId" && filters.territoryId !== "all" && current.territoryId !== filters.territoryId) return false;
  if (skip !== "clusterId" && filters.clusterId !== "all" && current.clusterId !== filters.clusterId) return false;
  if (skip !== "siteId" && filters.siteId !== "all" && current.id !== filters.siteId) return false;
  return true;
}

export function cascadeFilters(next: NetworkFilters, sites: OrganizationSite[], scope: AccessScope): NetworkFilters {
  const scoped = sites.filter((site) => siteInScope(site, scope));
  if (next.territoryId !== "all" && !scoped.some((site) => matchesDimension(site, next, "territoryId") && site.territoryId === next.territoryId)) {
    next = { ...next, territoryId: "all" };
  }
  if (next.clusterId !== "all" && !scoped.some((site) => matchesDimension(site, next, "clusterId") && site.clusterId === next.clusterId)) {
    next = { ...next, clusterId: "all" };
  }
  if (next.groupId !== "all" && !scoped.some((site) => matchesDimension(site, next, "groupId") && site.groupId === next.groupId)) {
    next = { ...next, groupId: "all" };
  }
  if (next.siteId !== "all" && !scoped.some((site) => matchesDimension(site, next, "siteId") && site.id === next.siteId)) {
    next = { ...next, siteId: "all" };
  }
  return next;
}

export function filterOptions(sites: OrganizationSite[], scope: AccessScope, filters: NetworkFilters) {
  const scoped = sites.filter((site) => siteInScope(site, scope));
  const forGroup = scoped.filter((site) => matchesDimension(site, filters, "groupId"));
  const forTerritory = scoped.filter((site) => matchesDimension(site, filters, "territoryId"));
  const forCluster = scoped.filter((site) => matchesDimension(site, filters, "clusterId"));
  const forSite = scoped.filter((site) => matchesDimension(site, filters, "siteId"));

  return {
    groups: listUnits("group").filter((item) => forGroup.some((site) => resolveSite(site).groupId === item.id)),
    territories: listUnits("territory").filter((item) => forTerritory.some((site) => resolveSite(site).territoryId === item.id)),
    clusters: listUnits("cluster").filter((item) => forCluster.some((site) => resolveSite(site).clusterId === item.id)),
    sites: forSite.map((site) => ({ id: site.id, name: site.name })),
  };
}

export function scopedTransactions(
  filters: NetworkFilters,
  scope: AccessScope,
  range?: { startDate?: string; endDate?: string },
) {
  const allowedSites = new Set(
    visibleSites(demoNetworkSites, scope, filters).map((site) => site.id),
  );
  const { startDate, endDate } = range ?? periodRange(filters.period);

  return recoveryTransactions.filter((row) => {
    if (!allowedSites.has(row.snapshot.siteId)) return false;
    return inDateRange(row.occurredAt, startDate, endDate);
  });
}

const PATHWAY_ORDER: RecoveryPathway[] = ["people", "livestock", "circular", "bioenergy"];

export const PATHWAY_LABEL: Record<RecoveryPathway, string> = {
  people: "Food for people",
  livestock: "Livestock feed",
  circular: "Higher-value / circular recovery",
  bioenergy: "Bioenergy",
};

export function impactFromTransactions(rows: RecoveryTransaction[]) {
  const foodKg = rows.reduce((sum, row) => sum + row.kg, 0);
  const impact = calculateImpact(foodKg);
  const partners = new Set(rows.map((row) => row.recipientId)).size;
  return {
    ...impact,
    collectionsCompleted: rows.length,
    organisationsSupported: partners,
  };
}

export function recoveryPathways(rows: RecoveryTransaction[]) {
  const total = rows.reduce((sum, row) => sum + row.kg, 0);
  return PATHWAY_ORDER.map((pathway) => {
    const kg = rows.filter((row) => row.pathway === pathway).reduce((sum, row) => sum + row.kg, 0);
    return {
      pathway,
      label: PATHWAY_LABEL[pathway],
      kg,
      percent: total > 0 ? Math.round((kg / total) * 100) : 0,
    };
  });
}

export function networkHealth(sites: OrganizationSite[], filters: NetworkFilters) {
  const { startDate, endDate } = periodRange(filters.period);
  const activated = sites.filter((site) => site.status === "active" && isActivated(site));
  const withActivity = activated.filter((site) => hasActivityInPeriod(site, startDate, endDate));
  return {
    totalSites: sites.length,
    activeSites: activated.length,
    sitesWithActivity: withActivity.length,
    sitesWithoutActivity: activated.length - withActivity.length,
  };
}

export function needsAttention(sites: OrganizationSite[], filters: NetworkFilters) {
  return (Object.keys(ATTENTION_COPY) as AttentionReason[]).map((reason) => ({
    reason,
    ...ATTENTION_COPY[reason],
    count: sites.filter((site) => matchesAttention(site, reason, filters)).length,
  }));
}

export function performanceByGroup(
  rows: RecoveryTransaction[],
  sites: OrganizationSite[],
  previousRows: RecoveryTransaction[],
  period: PeriodKey,
) {
  return listUnits("group")
    .map((group) => {
      const groupSites = sites.filter((site) => resolveSite(site).groupId === group.id);
      if (groupSites.length === 0) return null;
      const current = rows.filter((row) => row.snapshot.groupId === group.id);
      const previous = previousRows.filter((row) => row.snapshot.groupId === group.id);
      const foodKg = current.reduce((sum, row) => sum + row.kg, 0);
      const prevKg = previous.reduce((sum, row) => sum + row.kg, 0);
      const { startDate, endDate } = periodRange(period);
      return {
        id: group.id,
        name: group.name,
        foodKg,
        collections: current.length,
        activeSites: groupSites.filter(isActivated).length,
        totalSites: groupSites.length,
        sitesWithActivity: groupSites.filter((site) => hasActivityInPeriod(site, startDate, endDate)).length,
        trend: percentChange(foodKg, prevKg),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
}

export function impactOverTime(rows: RecoveryTransaction[], period: PeriodKey) {
  const { endDate } = periodRange(period);
  if (!endDate) return [];

  if (period === "all") {
    const months = new Map<string, number>();
    for (const row of rows) {
      const key = row.occurredAt.slice(0, 7);
      months.set(key, (months.get(key) ?? 0) + row.kg);
    }
    return [...months.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([key, kg]) => ({
        label: new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "short" }),
        kg,
      }));
  }

  const days = Number(period);
  const bucket = days <= 7 ? 1 : days <= 30 ? 3 : 7;
  const points: { label: string; kg: number }[] = [];
  const end = new Date(`${endDate}T00:00:00Z`);

  for (let offset = days - 1; offset >= 0; offset -= bucket) {
    const bucketEnd = new Date(end);
    bucketEnd.setUTCDate(bucketEnd.getUTCDate() - (days - 1 - offset));
    const bucketStart = new Date(bucketEnd);
    bucketStart.setUTCDate(bucketStart.getUTCDate() - (bucket - 1));
    const from = toRangeDate(bucketStart);
    const to = toRangeDate(bucketEnd);
    const kg = rows
      .filter((row) => inDateRange(row.occurredAt, from, to))
      .reduce((sum, row) => sum + row.kg, 0);
    points.push({
      label: bucketEnd.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      kg,
    });
  }

  return points;
}

function toRangeDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function buildDashboardModel(filters: NetworkFilters, scope: AccessScope) {
  const sites = visibleSites(demoNetworkSites, scope, filters);
  const currentRows = scopedTransactions(filters, scope);
  const previousRows = scopedTransactions(filters, scope, previousPeriodRange(filters.period));
  const current = impactFromTransactions(currentRows);
  const previous = impactFromTransactions(previousRows);

  return {
    filters,
    sites,
    metrics: {
      foodRecovered: { value: current.foodKg, trend: percentChange(current.foodKg, previous.foodKg) },
      mealsCreated: {
        value: current.mealsCreated,
        trend: percentChange(current.mealsCreated, previous.mealsCreated),
      },
      co2Avoided: {
        value: current.co2AvoidedKg,
        trend: percentChange(current.co2AvoidedKg, previous.co2AvoidedKg),
      },
      foodValue: { value: current.foodValue, trend: percentChange(current.foodValue, previous.foodValue) },
      collections: {
        value: current.collectionsCompleted,
        trend: percentChange(current.collectionsCompleted, previous.collectionsCompleted),
      },
      organisations: {
        value: current.organisationsSupported,
        trend: percentChange(current.organisationsSupported, previous.organisationsSupported),
      },
    },
    pathways: recoveryPathways(currentRows),
    network: networkHealth(sites, filters),
    attention: needsAttention(sites, filters),
    series: impactOverTime(currentRows, filters.period),
    groups: performanceByGroup(currentRows, sites, previousRows, filters.period),
  };
}

export { EMPTY_FILTERS, demoNetworkSites };
