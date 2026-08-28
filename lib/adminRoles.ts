"use client";

import { useSyncExternalStore } from "react";
import { appendAdminAudit, listAdminAudit } from "@/lib/adminAudit";
import { DEMO_TODAY, addDays, formatDisplayDate } from "@/lib/dates";
import type { SessionUser } from "@/lib/auth";

export const ADMIN_PERMISSIONS = [
  { id: "viewDashboard", label: "View Dashboard", group: "operations" },
  { id: "viewOrganisations", label: "View Organisations", group: "operations" },
  { id: "manageOrganisations", label: "Edit Organisations", group: "operations" },
  { id: "provisionOrganisations", label: "Provision Organisations", group: "operations" },
  { id: "viewSites", label: "View Sites", group: "operations" },
  { id: "manageSites", label: "Edit Sites", group: "operations" },
  { id: "viewUsers", label: "View Users", group: "operations" },
  { id: "manageUsers", label: "Manage Users", group: "operations" },
  { id: "viewActivity", label: "View Activity", group: "operations" },
  { id: "viewInsights", label: "View Insights & Reports", group: "insights" },
  { id: "createReports", label: "Create & export Reports", group: "insights" },
  { id: "viewNetwork", label: "View Network Health", group: "insights" },
  { id: "viewGaps", label: "View Supply & Recovery Gaps", group: "operations" },
  { id: "viewSupport", label: "Support & Troubleshooting", group: "support" },
  { id: "viewExceptions", label: "Exceptions & Data Quality", group: "support" },
  { id: "viewPlans", label: "View Plans & Accounts", group: "commercial", restricted: true },
  { id: "managePlans", label: "Manage Plans & Accounts", group: "commercial", restricted: true },
  { id: "viewMethodology", label: "View Impact Methodology", group: "methodology", restricted: true },
  { id: "manageMethodology", label: "Edit Impact Methodology", group: "methodology", restricted: true },
  { id: "manageRoles", label: "Manage Admin Roles", group: "admin" },
  { id: "viewNotifications", label: "View Platform Notifications", group: "admin" },
  { id: "manageNotifications", label: "Edit Platform Notifications", group: "admin" },
  { id: "viewAudit", label: "View Platform Audit Log", group: "admin" },
] as const;

export type AdminPermissionId = (typeof ADMIN_PERMISSIONS)[number]["id"];
export type AdminRoleScope = "global" | "organisation";
export type AdminRoleStatus = "active" | "inactive";
export type AdminAccessLevel = "full" | "view" | "limited" | "none";

export type AdminInternalRole = {
  id: string;
  label: string;
  description: string;
  scope: AdminRoleScope;
  status: AdminRoleStatus;
  system: boolean;
  permissions: Record<AdminPermissionId, boolean>;
  updatedAt: string;
  lastReviewAt: string | null;
};

export const ADMIN_PERMISSION_GROUPS = [
  { id: "dashboards", label: "Dashboards & Insights", permissions: ["viewDashboard", "viewInsights", "viewNetwork", "createReports"] },
  { id: "organisations", label: "Organisations", permissions: ["viewOrganisations", "manageOrganisations", "provisionOrganisations"] },
  { id: "sites_users", label: "Sites & Users", permissions: ["viewSites", "manageSites", "viewUsers", "manageUsers"] },
  { id: "operations", label: "Activity & Operations", permissions: ["viewActivity", "viewGaps"] },
  { id: "support", label: "Support", permissions: ["viewSupport", "viewExceptions"] },
  { id: "commercial", label: "Plans & Accounts", permissions: ["viewPlans", "managePlans"], restricted: true },
  { id: "methodology", label: "Impact Methodology", permissions: ["viewMethodology", "manageMethodology"], restricted: true },
  { id: "admin", label: "Admin & Settings", permissions: ["manageRoles", "viewNotifications", "manageNotifications", "viewAudit"] },
] as const;

const ALL_ON = Object.fromEntries(ADMIN_PERMISSIONS.map((item) => [item.id, true])) as Record<AdminPermissionId, boolean>;
const ALL_OFF = Object.fromEntries(ADMIN_PERMISSIONS.map((item) => [item.id, false])) as Record<AdminPermissionId, boolean>;

function stamp(daysBack: number) {
  return addDays(DEMO_TODAY, -daysBack).toISOString();
}

function caps(allowed: AdminPermissionId[]): Record<AdminPermissionId, boolean> {
  const next = { ...ALL_OFF };
  for (const id of allowed) next[id] = true;
  return next;
}

const SYSTEM_ROLES: AdminInternalRole[] = [
  {
    id: "super_admin",
    label: "Saveful Super Admin",
    description: "Full platform access. Permissions, not the role name, determine what this person can do.",
    scope: "global",
    status: "active",
    system: true,
    permissions: { ...ALL_ON },
    updatedAt: stamp(4),
    lastReviewAt: stamp(4),
  },
  {
    id: "operations_admin",
    label: "Operations Admin",
    description: "Run day-to-day network operations: organisations, sites, activity, gaps, and exceptions.",
    scope: "global",
    status: "active",
    system: true,
    permissions: caps([
      "viewDashboard",
      "viewOrganisations",
      "manageOrganisations",
      "viewSites",
      "manageSites",
      "viewUsers",
      "viewActivity",
      "viewInsights",
      "viewNetwork",
      "viewGaps",
      "viewSupport",
      "viewExceptions",
      "viewNotifications",
      "viewAudit",
    ]),
    updatedAt: stamp(11),
    lastReviewAt: stamp(11),
  },
  {
    id: "customer_support",
    label: "Customer Support",
    description: "Investigate customer issues, access, and data quality. Cannot change plans or methodology.",
    scope: "organisation",
    status: "active",
    system: true,
    permissions: caps([
      "viewDashboard",
      "viewOrganisations",
      "viewSites",
      "viewUsers",
      "viewActivity",
      "viewSupport",
      "viewExceptions",
      "viewNotifications",
      "viewAudit",
    ]),
    updatedAt: stamp(3),
    lastReviewAt: stamp(18),
  },
  {
    id: "insights_reporting",
    label: "Insights & Reporting",
    description: "View impact and create reports. Commercial and methodology edits stay separately restricted.",
    scope: "global",
    status: "active",
    system: true,
    permissions: caps(["viewDashboard", "viewOrganisations", "viewSites", "viewActivity", "viewInsights", "createReports", "viewNetwork"]),
    updatedAt: stamp(12),
    lastReviewAt: stamp(12),
  },
  {
    id: "commercial_admin",
    label: "Commercial Admin",
    description: "Plans, accounts, and commercial fields only. Impact methodology is not included.",
    scope: "global",
    status: "active",
    system: true,
    permissions: caps(["viewDashboard", "viewOrganisations", "viewSites", "viewPlans", "managePlans", "viewAudit"]),
    updatedAt: stamp(9),
    lastReviewAt: stamp(40),
  },
];

export const ADMIN_STAFF: { id: string; name: string; email: string; roleId: string; joinedAt: string }[] = [];

type Store = {
  extras: AdminInternalRole[];
  overlay: Record<string, Partial<Pick<AdminInternalRole, "permissions" | "status" | "label" | "description" | "scope" | "updatedAt" | "lastReviewAt">>>;
};

const STORAGE_KEY = "saveful_admin_roles";
const listeners = new Set<() => void>();
let version = 0;
let store: Store = { extras: [], overlay: {} };
let loaded = false;

function emit() {
  version += 1;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAdminRolesVersion() {
  return useSyncExternalStore(subscribe, () => version, () => 0);
}

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    store = raw ? (JSON.parse(raw) as Store) : { extras: [], overlay: {} };
  } catch {
    store = { extras: [], overlay: {} };
  }
}

function persist() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function applyRole(base: AdminInternalRole): AdminInternalRole {
  const patch = store.overlay[base.id];
  if (!patch) return base;
  return {
    ...base,
    ...patch,
    permissions: { ...base.permissions, ...patch.permissions },
  };
}

export function listAdminRoles(): AdminInternalRole[] {
  ensureLoaded();
  return [...SYSTEM_ROLES.map(applyRole), ...store.extras.map(applyRole)];
}

export function getAdminRole(id: string) {
  return listAdminRoles().find((role) => role.id === id) ?? null;
}

export function staffForRole(roleId: string) {
  return ADMIN_STAFF.filter((row) => row.roleId === roleId);
}

export function permissionLabel(id: AdminPermissionId) {
  return ADMIN_PERMISSIONS.find((item) => item.id === id)?.label ?? id;
}

export function isRestrictedPermission(id: AdminPermissionId) {
  const item = ADMIN_PERMISSIONS.find((permission) => permission.id === id);
  return Boolean(item && "restricted" in item && item.restricted);
}

export function roleAccessLevel(role: AdminInternalRole, groupId: (typeof ADMIN_PERMISSION_GROUPS)[number]["id"]): AdminAccessLevel {
  const group = ADMIN_PERMISSION_GROUPS.find((item) => item.id === groupId);
  if (!group) return "none";
  const allowed = group.permissions.filter((id) => role.permissions[id]);
  if (allowed.length === 0) return "none";
  const write = group.permissions.filter((id) => !id.startsWith("view"));
  const hasWrite = write.some((id) => role.permissions[id]);
  if (allowed.length === group.permissions.length) return hasWrite || write.length === 0 ? "full" : "view";
  if (!hasWrite) return "view";
  return "limited";
}

export function sessionAdminRoleId(user: SessionUser | null) {
  if (!user || user.portal !== "admin") return null;
  return "super_admin";
}

export function adminHas(user: SessionUser | null, permission: AdminPermissionId) {
  const roleId = sessionAdminRoleId(user);
  const role = roleId ? getAdminRole(roleId) : null;
  return Boolean(role?.permissions[permission]);
}

function actorOf(user: SessionUser | null) {
  return { name: user?.name ?? "Saveful Admin", email: user?.email ?? "admin@saveful.com" };
}

function writeAudit(
  actor: { name: string; email: string },
  action: string,
  role: AdminInternalRole,
  detail: string,
  changes: { field: string; previous: string; next: string }[],
) {
  appendAdminAudit({
    actor: actor.name,
    actorEmail: actor.email,
    action,
    organisationId: "saveful",
    organisationName: "Saveful",
    entityType: "role",
    entity: role.label,
    detail,
    changes,
  });
}

export function updateAdminRolePermission(
  roleId: string,
  permission: AdminPermissionId,
  allowed: boolean,
  user: SessionUser | null,
) {
  ensureLoaded();
  const current = getAdminRole(roleId);
  if (!current) return null;
  if (current.id === "super_admin" && (permission === "manageRoles" || permission === "managePlans" || permission === "manageMethodology") && !allowed) {
    return current;
  }
  const previous = current.permissions[permission];
  if (previous === allowed) return current;
  store.overlay[roleId] = {
    ...store.overlay[roleId],
    permissions: { ...current.permissions, [permission]: allowed },
    updatedAt: new Date().toISOString(),
  };
  persist();
  emit();
  const next = getAdminRole(roleId);
  if (next) {
    writeAudit(
      actorOf(user),
      isRestrictedPermission(permission) ? "Updated restricted permission" : "Updated role permissions",
      next,
      `Saveful Admin changed what ${next.label} can do.`,
      [{ field: permissionLabel(permission), previous: previous ? "Allowed" : "Not allowed", next: allowed ? "Allowed" : "Not allowed" }],
    );
  }
  return next;
}

export function updateAdminRoleStatus(roleId: string, status: AdminRoleStatus, user: SessionUser | null) {
  ensureLoaded();
  const current = getAdminRole(roleId);
  if (!current || current.id === "super_admin") return current;
  store.overlay[roleId] = { ...store.overlay[roleId], status, updatedAt: new Date().toISOString() };
  persist();
  emit();
  const next = getAdminRole(roleId);
  if (next) {
    writeAudit(actorOf(user), status === "inactive" ? "Deactivated admin role" : "Reactivated admin role", next, `Saveful Admin set ${next.label} to ${status}.`, [
      { field: "Status", previous: current.status === "active" ? "Active" : "Inactive", next: status === "active" ? "Active" : "Inactive" },
    ]);
  }
  return next;
}

export function createAdminRole(
  input: { label: string; description: string; scope: AdminRoleScope },
  user: SessionUser | null,
) {
  ensureLoaded();
  const id = `custom-${input.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || Date.now()}`;
  const role: AdminInternalRole = {
    id: store.extras.some((item) => item.id === id) ? `${id}-${Date.now()}` : id,
    label: input.label.trim(),
    description: input.description.trim() || "Custom Saveful internal role. Access is granted by permissions.",
    scope: input.scope,
    status: "active",
    system: false,
    permissions: caps(["viewDashboard"]),
    updatedAt: new Date().toISOString(),
    lastReviewAt: new Date().toISOString(),
  };
  store.extras = [role, ...store.extras];
  persist();
  emit();
  writeAudit(actorOf(user), "Created admin role", role, `Saveful Admin created ${role.label}.`, [
    { field: "Role", previous: "—", next: role.label },
    { field: "Scope", previous: "—", next: role.scope === "global" ? "Global" : "Organisation" },
  ]);
  return role;
}

export function buildAdminRolesModel() {
  const roles = listAdminRoles();
  const staff = ADMIN_STAFF;
  const newAdmins = staff.filter((row) => addDays(DEMO_TODAY, -30) <= new Date(row.joinedAt)).length;
  const customGrants = roles.reduce((sum, role) => sum + Object.values(role.permissions).filter(Boolean).length, 0);
  const highRiskUsers = staff.filter((row) => {
    const role = roles.find((item) => item.id === row.roleId);
    return Boolean(role?.permissions.manageRoles || role?.permissions.managePlans || role?.permissions.manageMethodology);
  }).length;
  const overdueReviews = roles.filter((role) => !role.lastReviewAt || addDays(new Date(role.lastReviewAt), 90) < DEMO_TODAY).length;
  const overPrivileged = roles.filter((role) => role.id !== "super_admin" && (role.permissions.manageRoles || (role.permissions.managePlans && role.permissions.manageMethodology))).length;
  const latest = roles.map((role) => role.updatedAt).sort().at(-1) ?? stamp(0);
  const audit = listAdminAudit({ q: "", period: "all", organisationId: "saveful", page: 1 }).filter((row) => row.entityType === "role");
  return {
    roles: roles.map((role) => ({
      ...role,
      users: staffForRole(role.id).length,
      highRisk: role.permissions.manageRoles || role.permissions.managePlans || role.permissions.manageMethodology,
    })),
    staff,
    latest,
    metrics: {
      users: staff.length,
      usersDelta: 0,
      activeRoles: roles.filter((role) => role.status === "active").length,
      newAdmins,
      newAdminsDelta: 0,
      customPermissions: customGrants,
      highRiskUsers,
      accessReviews: overdueReviews,
      nextReview: formatDisplayDate(addDays(DEMO_TODAY, 21).toISOString().slice(0, 10)),
    },
    health: {
      active: roles.filter((role) => role.status === "active").length,
      inactive: roles.filter((role) => role.status === "inactive").length,
      overPrivileged,
      noReview: overdueReviews,
    },
    recent: audit.slice(0, 6),
  };
}

export function exportAdminRolesCsv() {
  const roles = listAdminRoles();
  const header = ["Role", "Description", "Users", "Scope", "Status", "Last updated", ...ADMIN_PERMISSIONS.map((item) => item.label)];
  const lines = [
    header,
    ...roles.map((role) => [
      role.label,
      role.description,
      String(staffForRole(role.id).length),
      role.scope === "global" ? "Global" : "Organisation",
      role.status === "active" ? "Active" : "Inactive",
      role.updatedAt.slice(0, 10),
      ...ADMIN_PERMISSIONS.map((item) => (role.permissions[item.id] ? "Allowed" : "Not allowed")),
    ]),
  ];
  const csv = lines.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "saveful-admin-roles.csv";
  link.click();
  URL.revokeObjectURL(url);
}
