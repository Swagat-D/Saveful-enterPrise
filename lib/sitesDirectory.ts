import { periodRange } from "@/lib/dates";
import { formatKg } from "@/lib/impact";
import { demoNetworkSites, recoveryTransactions } from "@/lib/network";
import { getUnit, resolveSite, type OrgStructureKind } from "@/lib/orgStructure";
import {
  activityStatus,
  attentionReasons,
  formatLastActivity,
  isActiveSite,
  isDeactivated,
} from "@/lib/networkRules";
import { EMPTY_FILTERS } from "@/lib/scope";
import { filterOptions, type NetworkFilters } from "@/lib/networkQuery";
import { inDateRange } from "@/lib/dates";
import { siteInScope } from "@/lib/scope";
import type {
  AccessScope,
  ActivityStatus,
  OrganizationSite,
  PeriodKey,
  SiteLifecycleStatus,
  SiteSummaryKey,
} from "@/types/enterprise";

export type SitesTableFilters = {
  q: string;
  groupId: string;
  territoryId: string;
  clusterId: string;
  siteStatus: "all" | SiteLifecycleStatus;
  activity: "all" | ActivityStatus;
  summary: "all" | SiteSummaryKey;
  attention: string | null;
  period: PeriodKey;
  page: number;
  pageSize: 25 | 50 | 100;
};

export const EMPTY_SITES_FILTERS: SitesTableFilters = {
  q: "",
  groupId: "all",
  territoryId: "all",
  clusterId: "all",
  siteStatus: "all",
  activity: "all",
  summary: "all",
  attention: null,
  period: "30",
  page: 1,
  pageSize: 25,
};

const PAGE_SIZES = [25, 50, 100] as const;

export function parseSitesFilters(params: URLSearchParams): SitesTableFilters {
  const attention = params.get("attention");
  const summaryFromAttention =
    attention === "never_activated"
      ? "never_activated"
      : attention === "no_activity_30d" || attention === "no_listings_in_period"
        ? "no_recent"
        : null;

  const pageSize = Number(params.get("pageSize"));
  const page = Number(params.get("page"));

  return {
    q: params.get("q") ?? "",
    groupId: params.get("group") || "all",
    territoryId: params.get("territory") || "all",
    clusterId: params.get("cluster") || "all",
    siteStatus: (params.get("status") as SitesTableFilters["siteStatus"]) || "all",
    activity: (params.get("activity") as SitesTableFilters["activity"]) || "all",
    summary: (params.get("summary") as SitesTableFilters["summary"]) || summaryFromAttention || "all",
    attention: attention === "all" ? "all" : null,
    period: (params.get("period") as PeriodKey) || "30",
    page: page > 0 ? page : 1,
    pageSize: PAGE_SIZES.includes(pageSize as 25) ? (pageSize as 25 | 50 | 100) : 25,
  };
}

export function sitesFiltersToQuery(filters: SitesTableFilters) {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.groupId !== "all") params.set("group", filters.groupId);
  if (filters.territoryId !== "all") params.set("territory", filters.territoryId);
  if (filters.clusterId !== "all") params.set("cluster", filters.clusterId);
  if (filters.siteStatus !== "all") params.set("status", filters.siteStatus);
  if (filters.activity !== "all") params.set("activity", filters.activity);
  if (filters.summary !== "all") params.set("summary", filters.summary);
  if (filters.period !== "30") params.set("period", filters.period);
  if (filters.attention === "all") params.set("attention", "all");
  if (filters.page > 1) params.set("page", String(filters.page));
  if (filters.pageSize !== 25) params.set("pageSize", String(filters.pageSize));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function hasActiveSitesFilters(filters: SitesTableFilters) {
  return (
    Boolean(filters.q.trim()) ||
    filters.groupId !== "all" ||
    filters.territoryId !== "all" ||
    filters.clusterId !== "all" ||
    filters.siteStatus !== "all" ||
    filters.activity !== "all" ||
    filters.summary !== "all"
  );
}

export function foodRecoveredKg(siteId: string, period: PeriodKey) {
  const { startDate, endDate } = periodRange(period);
  return recoveryTransactions
    .filter((row) => row.snapshot.siteId === siteId && inDateRange(row.occurredAt, startDate, endDate))
    .reduce((sum, row) => sum + row.kg, 0);
}

export function matchesSummary(site: OrganizationSite, summary: SitesTableFilters["summary"], period: PeriodKey) {
  if (summary === "all" || summary === "total") return true;
  if (summary === "active") return isActiveSite(site);
  if (summary === "deactivated") return isDeactivated(site);
  if (summary === "never_activated") return activityStatus(site, period) === "never_activated";
  if (summary === "no_recent") return activityStatus(site, period) === "none_in_period";
  return true;
}

export function filterDirectorySites(scope: AccessScope, filters: SitesTableFilters) {
  const query = filters.q.trim().toLowerCase();
  return demoNetworkSites.map(resolveSite).filter((site) => {
    if (!siteInScope(site, scope)) return false;
    if (filters.groupId !== "all" && site.groupId !== filters.groupId) return false;
    if (filters.territoryId !== "all" && site.territoryId !== filters.territoryId) return false;
    if (filters.clusterId !== "all" && site.clusterId !== filters.clusterId) return false;
    if (filters.siteStatus !== "all" && site.status !== filters.siteStatus) return false;
    if (filters.activity !== "all" && activityStatus(site, filters.period) !== filters.activity) return false;
    if (!matchesSummary(site, filters.summary, filters.period)) return false;
    if (filters.attention === "all" && attentionReasons(site, { ...EMPTY_FILTERS, period: filters.period }).length === 0) {
      return false;
    }
    if (query) {
      const haystack = `${site.name} ${site.siteCode}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

export function summaryCounts(scope: AccessScope, filters: SitesTableFilters) {
  const base: SitesTableFilters = { ...filters, summary: "all", siteStatus: "all", activity: "all" };
  const sites = filterDirectorySites(scope, base);
  return {
    total: sites.length,
    active: sites.filter(isActiveSite).length,
    noRecent: sites.filter((site) => activityStatus(site, filters.period) === "none_in_period").length,
    neverActivated: sites.filter((site) => activityStatus(site, filters.period) === "never_activated").length,
    deactivated: sites.filter(isDeactivated).length,
  };
}

export function sitesFilterOptions(scope: AccessScope, filters: SitesTableFilters) {
  const asNetwork: NetworkFilters = {
    groupId: filters.groupId,
    territoryId: filters.territoryId,
    clusterId: filters.clusterId,
    siteId: "all",
    period: filters.period,
  };
  return filterOptions(demoNetworkSites.filter((site) => siteInScope(site, scope)), scope, asNetwork);
}

export function lookupLabel(kind: OrgStructureKind, id?: string | null) {
  if (!id) return "—";
  return getUnit(kind, id)?.name ?? "—";
}

export function exportSitesCsv(sites: OrganizationSite[], period: PeriodKey) {
  const rows = [
    ["Site", "Site ID", "Address", "Group", "Territory", "Cluster", "Site status", "Last activity", "Food recovered", "Activity status"],
    ...sites.map((site) => {
      const kg = foodRecoveredKg(site.id, period);
      return [
        site.name,
        site.siteCode,
        [site.address, site.postCode].filter(Boolean).join(" "),
        lookupLabel("group", site.groupId),
        lookupLabel("territory", site.territoryId),
        lookupLabel("cluster", site.clusterId),
        site.status === "deactivated" ? "Deactivated" : "Active",
        formatLastActivity(site.lastActivityAt),
        kg > 0 ? formatKg(kg) : "—",
        activityStatus(site, period),
      ];
    }),
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "saveful-sites.csv";
  link.click();
  URL.revokeObjectURL(url);
}
