import type { AccessScope, NetworkFilters, OrganizationSite } from "@/types/enterprise";
import type { SessionUser } from "@/lib/auth";
import { resolveSite } from "@/lib/orgStructure";

export const EMPTY_FILTERS: NetworkFilters = {
  groupId: "all",
  territoryId: "all",
  clusterId: "all",
  siteId: "all",
  period: "30",
};

export function scopeFromUser(user: SessionUser | null): AccessScope {
  if (!user) {
    return { siteIds: [] };
  }
  if (user.enterpriseRole === "site_admin") {
    const siteIds = user.scope?.siteIds?.filter(Boolean) ?? [];
    return {
      groupIds: null,
      territoryIds: null,
      clusterIds: null,
      siteIds: siteIds.length ? siteIds : null,
    };
  }
  if (user.isHeadAdmin || !user.scope) {
    return {
      groupIds: null,
      territoryIds: null,
      clusterIds: null,
      siteIds: null,
    };
  }
  return user.scope;
}

function allows(allowed: string[] | null | undefined, value?: string | null) {
  if (allowed == null) return true;
  if (!value) return false;
  return allowed.includes(value);
}

export function siteInScope(site: OrganizationSite, scope: AccessScope) {
  const current = resolveSite(site);
  if (scope.siteIds != null) {
    return scope.siteIds.includes(current.id);
  }
  return (
    allows(scope.groupIds, current.groupId) &&
    allows(scope.territoryIds, current.territoryId) &&
    allows(scope.clusterIds, current.clusterId)
  );
}

export function siteMatchesFilters(site: OrganizationSite, filters: NetworkFilters) {
  const current = resolveSite(site);
  if (filters.groupId !== "all" && current.groupId !== filters.groupId) return false;
  if (filters.territoryId !== "all" && current.territoryId !== filters.territoryId) return false;
  if (filters.clusterId !== "all" && current.clusterId !== filters.clusterId) return false;
  if (filters.siteId !== "all" && current.id !== filters.siteId) return false;
  return true;
}

export function visibleSites(
  sites: OrganizationSite[],
  scope: AccessScope,
  filters: Pick<NetworkFilters, "groupId" | "territoryId" | "clusterId" | "siteId"> = EMPTY_FILTERS,
) {
  return sites.filter((site) => siteInScope(site, scope) && siteMatchesFilters(site, filters as NetworkFilters));
}
