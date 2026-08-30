import type { EnterpriseRole, UserAccessScope } from "@/types/enterprise";

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
