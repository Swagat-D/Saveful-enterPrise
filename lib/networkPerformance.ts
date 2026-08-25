import { periodRange, previousPeriodRange } from "@/lib/dates";
import { percentChange } from "@/lib/impact";
import { demoNetworkSites, recoveryTransactions } from "@/lib/network";
import {
  attentionCopy,
  attentionReasons,
  formatLastActivity,
  hasActivityInPeriod,
  hasListingInPeriod,
  isActivated,
  isActiveSite,
} from "@/lib/networkRules";
import { listUnits, resolveSite, type OrgStructureKind } from "@/lib/orgStructure";
import { siteInScope } from "@/lib/scope";
import { foodRecoveredKg, sitesFiltersToQuery, type SitesTableFilters } from "@/lib/sitesDirectory";
import type { InsightsFilters, InsightsRange, PerformanceView } from "@/lib/insights";
import type {
  AccessScope,
  ActivityStatus,
  AttentionReason,
  OrganizationSite,
  PeriodKey,
  SiteSummaryKey,
} from "@/types/enterprise";

export type NetworkTrend = number | null;

function comparableChange(current: number, previous: number, comparable: boolean): NetworkTrend {
  if (!comparable || previous <= 0) return null;
  return percentChange(current, previous);
}

function hadQualifyingActivity(site: OrganizationSite, startDate?: string, endDate?: string) {
  if (!startDate && !endDate) {
    return Boolean(site.lastActivityAt || site.lastListingAt);
  }
  if (hasActivityInPeriod(site, startDate, endDate)) return true;
  if (hasListingInPeriod(site, startDate, endDate)) return true;
  return recoveryTransactions.some(
    (row) => row.snapshot.siteId === site.id && inRange(row.occurredAt, startDate, endDate),
  );
}

function inRange(iso: string | null, startDate?: string, endDate?: string) {
  if (!iso) return false;
  const day = iso.slice(0, 10);
  if (startDate && day < startDate) return false;
  if (endDate && day > endDate) return false;
  return true;
}

function scopedSites(filters: InsightsFilters, scope: AccessScope) {
  return demoNetworkSites.map(resolveSite).filter((site) => {
    if (!siteInScope(site, scope)) return false;
    if (filters.groupId !== "all" && site.groupId !== filters.groupId) return false;
    if (filters.territoryId !== "all" && site.territoryId !== filters.territoryId) return false;
    if (filters.clusterId !== "all" && site.clusterId !== filters.clusterId) return false;
    if (filters.siteId !== "all" && site.id !== filters.siteId) return false;
    return true;
  });
}

function participation(active: OrganizationSite[], startDate?: string, endDate?: string) {
  const withActivity = active.filter((site) => hadQualifyingActivity(site, startDate, endDate));
  return {
    withActivity: withActivity.length,
    rate: active.length > 0 ? Math.round((withActivity.length / active.length) * 100) : 0,
  };
}

function unitId(site: OrganizationSite, viewBy: PerformanceView) {
  if (viewBy === "site") return site.id;
  if (viewBy === "group") return site.groupId || "unassigned";
  if (viewBy === "territory") return site.territoryId || "unassigned";
  return site.clusterId || "unassigned";
}

function unitName(id: string, viewBy: PerformanceView, site?: OrganizationSite) {
  if (id === "unassigned") return "Unassigned";
  if (viewBy === "site") return site?.name ?? id;
  const kind: OrgStructureKind = viewBy;
  return listUnits(kind).find((unit) => unit.id === id)?.name ?? id;
}

function foodKgForSites(sites: OrganizationSite[], period: PeriodKey) {
  return sites.reduce((sum, site) => sum + foodRecoveredKg(site.id, period), 0);
}

function previousFoodKg(sites: OrganizationSite[], period: PeriodKey) {
  if (period === "all") return 0;
  const { startDate, endDate } = previousPeriodRange(period);
  const ids = new Set(sites.map((site) => site.id));
  return recoveryTransactions
    .filter((row) => ids.has(row.snapshot.siteId) && inRange(row.occurredAt, startDate, endDate))
    .reduce((sum, row) => sum + row.kg, 0);
}

const ATTENTION_ORDER: AttentionReason[] = [
  "never_activated",
  "no_activity_30d",
  "no_listings_in_period",
  "setup_required",
];

function primaryAttention(reasons: AttentionReason[]) {
  return ATTENTION_ORDER.find((reason) => reasons.includes(reason)) ?? reasons[0] ?? null;
}

export function sitesDirectoryHref(
  filters: InsightsFilters,
  extra: Partial<{
    groupId: string;
    territoryId: string;
    clusterId: string;
    summary: SiteSummaryKey;
    activity: ActivityStatus;
    siteStatus: "active" | "deactivated";
    attention: "all" | AttentionReason;
  }> = {},
) {
  const next: SitesTableFilters = {
    q: "",
    groupId: extra.groupId ?? filters.groupId,
    territoryId: extra.territoryId ?? filters.territoryId,
    clusterId: extra.clusterId ?? filters.clusterId,
    siteStatus: extra.siteStatus ?? "all",
    activity: extra.activity ?? "all",
    summary: extra.summary ?? "all",
    attention: extra.attention === "all" ? "all" : null,
    period: filters.period,
    page: 1,
    pageSize: 25,
  };
  const query = sitesFiltersToQuery(next);
  if (extra.attention && extra.attention !== "all") {
    const params = new URLSearchParams(query.startsWith("?") ? query.slice(1) : query);
    params.set("attention", extra.attention);
    const text = params.toString();
    return text ? `/sites?${text}` : "/sites";
  }
  return `/sites${query}`;
}

export function buildNetworkPerformanceModel(
  filters: InsightsFilters,
  scope: AccessScope,
  range?: InsightsRange,
) {
  const sites = scopedSites(filters, scope);
  const currentRange = range ?? periodRange(filters.period);
  const previousRange = previousPeriodRange(filters.period);
  const comparable = !range && filters.period !== "all" && Boolean(previousRange.startDate && previousRange.endDate);

  const active = sites.filter(isActiveSite);
  const neverActivated = sites.filter((site) => !isActivated(site));
  const current = participation(active, currentRange.startDate, currentRange.endDate);
  const previousActive = comparable
    ? sites.filter((site) => site.status === "active" && Boolean(site.activatedAt))
    : [];
  const previous = comparable
    ? participation(previousActive, previousRange.startDate, previousRange.endDate)
    : { withActivity: 0, rate: 0 };

  const noActivity = active.length - current.withActivity;
  const network = {
    period: filters.period,
    totalSites: sites.length,
    activeSites: active.length,
    sitesWithActivity: current.withActivity,
    noActivity,
    neverActivated: neverActivated.length,
    participationRate: current.rate,
    participationTrend: comparableChange(current.rate, previous.rate, comparable && previousActive.length > 0),
  };

  const groups = new Map<string, OrganizationSite[]>();
  for (const site of sites) {
    const id = unitId(site, filters.viewBy);
    const list = groups.get(id) ?? [];
    list.push(site);
    groups.set(id, list);
  }

  const rows = [...groups.entries()]
    .map(([id, unitSites]) => {
      const unitActive = unitSites.filter(isActiveSite);
      const unitCurrent = participation(unitActive, currentRange.startDate, currentRange.endDate);
      const foodKg = foodKgForSites(unitSites, filters.period);
      const prevKg = previousFoodKg(unitSites, filters.period);
      return {
        id,
        name: unitName(id, filters.viewBy, unitSites[0]),
        href:
          filters.viewBy === "site"
            ? `/sites/${id}`
            : sitesDirectoryHref(filters, {
                groupId: filters.viewBy === "group" && id !== "unassigned" ? id : filters.groupId,
                territoryId: filters.viewBy === "territory" && id !== "unassigned" ? id : filters.territoryId,
                clusterId: filters.viewBy === "cluster" && id !== "unassigned" ? id : filters.clusterId,
              }),
        sites: unitSites.length,
        sitesWithActivity: unitCurrent.withActivity,
        participation: unitActive.length > 0 ? unitCurrent.rate : 0,
        foodKg,
        trend: comparableChange(foodKg, prevKg, comparable),
      };
    })
    .sort((a, b) => b.sitesWithActivity - a.sitesWithActivity || a.name.localeCompare(b.name));

  const attention = sites
    .map((site) => {
      const reasons = attentionReasons(site, {
        groupId: filters.groupId,
        territoryId: filters.territoryId,
        clusterId: filters.clusterId,
        siteId: filters.siteId,
        period: filters.period,
      });
      const reason = primaryAttention(reasons);
      if (!reason) return null;
      return {
        id: site.id,
        name: site.name,
        href: `/sites/${site.id}`,
        group: listUnits("group").find((unit) => unit.id === site.groupId)?.name ?? "—",
        territory: listUnits("territory").find((unit) => unit.id === site.territoryId)?.name ?? "—",
        lastActivity: formatLastActivity(site.lastActivityAt),
        reason,
        status: attentionCopy()[reason].label,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) => ATTENTION_ORDER.indexOf(a.reason) - ATTENTION_ORDER.indexOf(b.reason) || a.name.localeCompare(b.name));

  return { network, rows, attention, comparable };
}

export type NetworkPerformanceModel = ReturnType<typeof buildNetworkPerformanceModel>;
