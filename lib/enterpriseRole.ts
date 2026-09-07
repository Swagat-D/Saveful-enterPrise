import type { AccessScope, EnterpriseRole, UserAccessScope } from "@/types/enterprise";

export function mapEnterpriseRole(role?: string | null, orgRole?: string | null): EnterpriseRole {
  const value = (role || "").toUpperCase();
  if (value === "SUPER_ADMIN" || value === "ENTERPRISE_SUPER_ADMIN") return "enterprise_super_admin";
  if (value === "ENTERPRISE_ADMIN") return "enterprise_admin";
  if (value === "GROUP_ADMIN" || value === "CLUSTER_ADMIN") return "group_admin";
  if (value === "REPORTING_USER" || value === "REPORTING") return "reporting";
  if (value === "SITE_ADMIN" || value === "SITE_USER") return "site_admin";
  if ((orgRole || "").toUpperCase() === "SUPER_ADMIN") return "enterprise_super_admin";
  return "site_admin";
}

export function scopeFromApi(
  role: EnterpriseRole,
  scopes?: Array<{ scopeType: string; scopeId: number | null }>,
): UserAccessScope {
  if (role === "enterprise_super_admin" || role === "enterprise_admin") {
    return { enterprise: true };
  }
  const next: UserAccessScope = {};
  for (const scope of scopes ?? []) {
    const id = scope.scopeId == null ? null : String(scope.scopeId);
    const type = (scope.scopeType ?? "").toUpperCase();
    if (type === "ENTERPRISE") {
      next.enterprise = true;
    } else if (type === "GROUP" && id) {
      next.groupIds = [...(next.groupIds ?? []), id];
    } else if (type === "TERRITORY" && id) {
      next.territoryIds = [...(next.territoryIds ?? []), id];
    } else if (type === "CLUSTER" && id) {
      next.clusterIds = [...(next.clusterIds ?? []), id];
    } else if (type === "SITE" && id) {
      next.siteIds = [...(next.siteIds ?? []), id];
    }
  }
  return next;
}

export function isSiteAdminRole(role?: string | null) {
  const value = (role || "").toUpperCase().replace(/[\s-]+/g, "_");
  return value === "SITE_ADMIN" || value === "SITE_USER" || value.includes("SITE_ADMIN");
}

export function accessScopeFromUserScope(scope: UserAccessScope): AccessScope {
  if (scope.enterprise) {
    return { groupIds: null, territoryIds: null, clusterIds: null, siteIds: null };
  }
  return {
    groupIds: scope.groupIds ?? [],
    territoryIds: scope.territoryIds ?? [],
    clusterIds: scope.clusterIds ?? [],
    siteIds: scope.siteIds ?? [],
  };
}

export function toApiRole(role: EnterpriseRole): string {
  if (role === "enterprise_super_admin") return "SUPER_ADMIN";
  if (role === "enterprise_admin") return "ENTERPRISE_ADMIN";
  if (role === "group_admin") return "GROUP_ADMIN";
  if (role === "reporting") return "REPORTING_USER";
  return "SITE_ADMIN";
}

export function scopesToApi(scope: UserAccessScope): Array<{ scopeType: string; scopeId?: number }> {
  if (scope.enterprise) return [{ scopeType: "ENTERPRISE" }];
  const grants: Array<{ scopeType: string; scopeId?: number }> = [];
  for (const id of scope.groupIds ?? []) {
    const scopeId = Number(id);
    if (Number.isFinite(scopeId)) grants.push({ scopeType: "GROUP", scopeId });
  }
  for (const id of scope.territoryIds ?? []) {
    const scopeId = Number(id);
    if (Number.isFinite(scopeId)) grants.push({ scopeType: "TERRITORY", scopeId });
  }
  for (const id of scope.clusterIds ?? []) {
    const scopeId = Number(id);
    if (Number.isFinite(scopeId)) grants.push({ scopeType: "CLUSTER", scopeId });
  }
  for (const id of scope.siteIds ?? []) {
    const scopeId = Number(id);
    if (Number.isFinite(scopeId)) grants.push({ scopeType: "SITE", scopeId });
  }
  return grants;
}

/** Site Admin invites for a single site also attach that site on acceptance. */
export function siteAdminForSiteId(role: EnterpriseRole, scope: UserAccessScope): number | undefined {
  if (role !== "site_admin") return undefined;
  const ids = (scope.siteIds ?? []).map(Number).filter((id) => Number.isFinite(id));
  return ids.length === 1 ? ids[0] : undefined;
}
