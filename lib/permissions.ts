import type { SessionUser } from "@/lib/auth";
import type { EnterpriseRole } from "@/types/enterprise";

export const ROLE_PERMISSIONS = [
  { id: "viewDashboard", label: "View Dashboard" },
  { id: "viewSites", label: "View Sites" },
  { id: "manageSites", label: "Add & edit Sites" },
  { id: "viewActivity", label: "View Activity" },
  { id: "createListings", label: "Create Listings" },
  { id: "viewInsights", label: "View Insights & Reports" },
  { id: "createReports", label: "Create & export Reports" },
  { id: "manageUsers", label: "Manage Users & Access" },
  { id: "manageStructure", label: "Manage Organisation Structure" },
  { id: "manageSettings", label: "Manage Enterprise Settings" },
  { id: "viewAudit", label: "View Audit Log" },
] as const;

export type RolePermissionId = (typeof ROLE_PERMISSIONS)[number]["id"];

const ALL_ALLOWED = Object.fromEntries(ROLE_PERMISSIONS.map((item) => [item.id, true])) as Record<RolePermissionId, boolean>;

const ROLE_CAPS: Record<EnterpriseRole, Record<RolePermissionId, boolean>> = {
  enterprise_super_admin: { ...ALL_ALLOWED },
  enterprise_admin: { ...ALL_ALLOWED },
  group_admin: {
    viewDashboard: true,
    viewSites: true,
    manageSites: true,
    viewActivity: true,
    createListings: true,
    viewInsights: true,
    createReports: true,
    manageUsers: true,
    manageStructure: false,
    manageSettings: false,
    viewAudit: false,
  },
  reporting: {
    viewDashboard: true,
    viewSites: true,
    manageSites: false,
    viewActivity: true,
    createListings: false,
    viewInsights: true,
    createReports: true,
    manageUsers: false,
    manageStructure: false,
    manageSettings: false,
    viewAudit: false,
  },
  site_admin: {
    viewDashboard: true,
    viewSites: true,
    manageSites: true,
    viewActivity: true,
    createListings: true,
    viewInsights: true,
    createReports: false,
    manageUsers: false,
    manageStructure: false,
    manageSettings: false,
    viewAudit: false,
  },
};

export function sessionRole(user: SessionUser | null): EnterpriseRole | null {
  if (!user || user.portal === "admin") return null;
  return user.enterpriseRole ?? (user.isHeadAdmin ? "enterprise_super_admin" : "enterprise_admin");
}

export function capabilitiesForRole(role: EnterpriseRole) {
  return ROLE_CAPS[role];
}

export function roleHas(user: SessionUser | null, permission: RolePermissionId) {
  const role = sessionRole(user);
  return role ? ROLE_CAPS[role][permission] : false;
}

export function roleHasId(role: EnterpriseRole, permission: RolePermissionId) {
  return ROLE_CAPS[role][permission];
}

export function sitePermissions(user: SessionUser | null) {
  const manage = roleHas(user, "manageSites");
  const role = sessionRole(user);
  const add = manage && role !== "site_admin";
  return {
    view: roleHas(user, "viewSites"),
    edit: manage,
    manageAccess: manage,
    deactivate: add,
    addSite: add,
    bulkUpload: add && roleHas(user, "manageSettings"),
    export: roleHas(user, "viewSites"),
  };
}

export function structurePermissions(user: SessionUser | null) {
  const manage = roleHas(user, "manageStructure");
  return {
    view: manage,
    add: manage,
    edit: manage,
    deactivate: manage,
    remove: manage,
  };
}

export function userPermissions(user: SessionUser | null) {
  const manage = roleHas(user, "manageUsers");
  const enterprise = sessionRole(user) === "enterprise_super_admin" || sessionRole(user) === "enterprise_admin";
  return {
    view: manage,
    add: manage,
    edit: manage,
    deactivate: manage,
    resend: manage,
    assignAnyScope: enterprise,
  };
}

export function organisationPermissions(user: SessionUser | null) {
  return {
    view: roleHas(user, "manageSettings"),
    edit: roleHas(user, "manageSettings"),
  };
}

export function canEditOrganization(user: SessionUser | null) {
  return roleHas(user, "manageSettings");
}
