"use client";

import { useSyncExternalStore } from "react";
import { appendAudit } from "@/lib/audit";
import { recordNotificationEvent } from "@/lib/notifications";
import { daysAgoIso } from "@/lib/dates";
import { demoClusters, demoGroups, demoNetworkSites, demoTerritories } from "@/lib/network";
import { listUnits } from "@/lib/orgStructure";
import { formatLastActivity } from "@/lib/networkRules";
import type {
  AccessScope,
  DirectoryUser,
  DirectoryUserStatus,
  EnterpriseRole,
  OrganizationSite,
  UserAccessScope,
} from "@/types/enterprise";

export const ENTERPRISE_ROLES: { id: EnterpriseRole; label: string; description: string }[] = [
  {
    id: "enterprise_super_admin",
    label: "Enterprise Super Admin",
    description: "Full administration across the Enterprise, including highest-level access and administration.",
  },
  {
    id: "enterprise_admin",
    label: "Enterprise Admin",
    description: "Administration across the entire Enterprise, subject to the permissions defined for this role.",
  },
  {
    id: "group_admin",
    label: "Group Admin",
    description: "Administration within assigned Scope, which may include one or more Groups, Territories and/or Clusters.",
  },
  {
    id: "reporting",
    label: "Reporting User",
    description: "Reporting and visibility within assigned Scope.",
  },
  {
    id: "site_admin",
    label: "Site Admin",
    description: "Operational administration for assigned Site(s).",
  },
];

const ROLE_RANK: Record<EnterpriseRole, number> = {
  enterprise_super_admin: 5,
  enterprise_admin: 4,
  group_admin: 3,
  site_admin: 2,
  reporting: 1,
};

export const SCOPE_FILTERS = [
  { id: "all", name: "Scope: All" },
  { id: "enterprise", name: "Entire Enterprise" },
  { id: "group", name: "Group" },
  { id: "territory", name: "Territory" },
  { id: "cluster", name: "Cluster" },
  { id: "site", name: "Site" },
] as const;

export type ScopeFilter = (typeof SCOPE_FILTERS)[number]["id"];

const listeners = new Set<() => void>();
let version = 0;

function token() {
  return `inv-${Math.random().toString(36).slice(2, 10)}`;
}

function person(
  id: string,
  firstName: string,
  lastName: string,
  email: string,
  role: EnterpriseRole,
  scope: UserAccessScope,
  status: DirectoryUser["status"],
  lastActiveAt: string | null,
  invitedAt: string | null,
  mobile = "",
): DirectoryUser {
  return {
    id,
    firstName,
    lastName,
    name: `${firstName} ${lastName}`.trim(),
    email,
    mobile,
    role,
    scope,
    status,
    lastActiveAt,
    invitedAt,
    inviteToken: status === "invited" ? token() : null,
  };
}

const seed: DirectoryUser[] = [
  person("u1", "Alex", "Morgan", "alex@harbourkitchen.com", "enterprise_super_admin", { enterprise: true }, "active", daysAgoIso(0), daysAgoIso(400), "+61 400 111 222"),
  person("u13", "Taylor", "Quincy", "taylor@harbourkitchen.com", "enterprise_admin", { enterprise: true }, "active", daysAgoIso(1), daysAgoIso(200), "+61 400 118 200"),
  person("u2", "Priya", "Nair", "priya@harbourkitchen.com", "site_admin", { siteIds: ["2"] }, "active", daysAgoIso(1), daysAgoIso(280), "+61 400 333 444"),
  person("u3", "Jamie", "Chen", "jamie@harbourkitchen.com", "site_admin", { siteIds: ["hq"] }, "active", daysAgoIso(3), daysAgoIso(120)),
  person("u4", "Sam", "Reid", "sam@harbourkitchen.com", "site_admin", { siteIds: ["3"] }, "invited", null, daysAgoIso(2)),
  person("u5", "Morgan", "Hale", "morgan@harbourkitchen.com", "group_admin", { groupIds: ["kitchen"] }, "active", daysAgoIso(0), daysAgoIso(90)),
  person("u6", "Chris", "Adeyemi", "chris@harbourkitchen.com", "group_admin", { groupIds: ["cafe"] }, "active", daysAgoIso(4), daysAgoIso(70)),
  person("u7", "Elena", "Voss", "elena@harbourkitchen.com", "reporting", { territoryIds: ["east"] }, "active", daysAgoIso(6), daysAgoIso(40)),
  person("u8", "Noah", "Patel", "noah@harbourkitchen.com", "reporting", { groupIds: ["catering"], clusterIds: ["parra"] }, "invited", null, daysAgoIso(5)),
  person("u9", "Riley", "Brooks", "riley@harbourkitchen.com", "site_admin", { siteIds: ["events-north"] }, "deactivated", daysAgoIso(21), daysAgoIso(200)),
  person("u10", "Jordan", "Blake", "jordan@harbourkitchen.com", "site_admin", { siteIds: ["bondi-kitchen"] }, "deactivated", daysAgoIso(45), daysAgoIso(160)),
  person("u11", "Asha", "Rahman", "asha@harbourkitchen.com", "site_admin", { siteIds: ["quay-cafe"] }, "invited", null, daysAgoIso(1)),
  person("u12", "Harbour", "HQ", "hq@harbourkitchen.com", "site_admin", { siteIds: ["hq"] }, "active", daysAgoIso(0), daysAgoIso(400)),
];

let users: DirectoryUser[] = seed.map((user) => ({ ...user, scope: { ...user.scope } }));

function emit() {
  version += 1;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useUsersVersion() {
  return useSyncExternalStore(subscribe, () => version, () => 0);
}

export function listUsers() {
  return users;
}

export function countUsersByRole(role: EnterpriseRole) {
  return users.filter((user) => user.role === role && user.status !== "deactivated").length;
}

export function getUser(id: string) {
  return users.find((user) => user.id === id) ?? null;
}

export function roleLabel(role: EnterpriseRole) {
  return ENTERPRISE_ROLES.find((item) => item.id === role)?.label ?? role;
}

export function roleDescription(role: EnterpriseRole) {
  return ENTERPRISE_ROLES.find((item) => item.id === role)?.description ?? "";
}

export function statusLabel(status: DirectoryUserStatus) {
  if (status === "invited") return "Invited";
  if (status === "deactivated") return "Deactivated";
  return "Active";
}

export function assignableRoles(actorRole: EnterpriseRole = "enterprise_super_admin"): EnterpriseRole[] {
  const rank = ROLE_RANK[actorRole];
  return ENTERPRISE_ROLES.filter((role) => ROLE_RANK[role.id] <= rank).map((role) => role.id);
}

export function roleAllowsEnterprise(role: EnterpriseRole) {
  return role === "enterprise_super_admin" || role === "enterprise_admin";
}

export function canAssignEnterprise(actorRole: EnterpriseRole = "enterprise_super_admin") {
  return roleAllowsEnterprise(actorRole);
}

export type ScopeChip = {
  key: string;
  kind: "group" | "territory" | "cluster" | "site";
  id: string;
  label: string;
};

export function scopeChips(scope: UserAccessScope): ScopeChip[] {
  const chips: ScopeChip[] = [];
  for (const id of scope.groupIds ?? []) {
    const name = listUnits("group").find((item) => item.id === id)?.name ?? demoGroups.find((item) => item.id === id)?.name;
    if (name) chips.push({ key: `group:${id}`, kind: "group", id, label: name });
  }
  for (const id of scope.territoryIds ?? []) {
    const name = listUnits("territory").find((item) => item.id === id)?.name ?? demoTerritories.find((item) => item.id === id)?.name;
    if (name) chips.push({ key: `territory:${id}`, kind: "territory", id, label: `Territory: ${name}` });
  }
  for (const id of scope.clusterIds ?? []) {
    const name = listUnits("cluster").find((item) => item.id === id)?.name ?? demoClusters.find((item) => item.id === id)?.name;
    if (name) chips.push({ key: `cluster:${id}`, kind: "cluster", id, label: `Cluster: ${name}` });
  }
  for (const id of scope.siteIds ?? []) {
    const name = demoNetworkSites.find((item) => item.id === id)?.name;
    if (name) chips.push({ key: `site:${id}`, kind: "site", id, label: name });
  }
  return chips;
}

export function accessSummaryText(scope: UserAccessScope) {
  if (scope.enterprise) return "This user will have access to the entire Enterprise.";
  const chips = scopeChips(scope);
  if (!chips.length) return "Select at least one Group, Territory, Cluster or Site.";
  return `This user will have access to ${chips.map((chip) => chip.label).join(", ").replace(/, ([^,]*)$/, " and $1")}.`;
}

function scopeKeySet(scope: UserAccessScope) {
  if (scope.enterprise) return new Set(["enterprise"]);
  return new Set(scopeChips(scope).map((chip) => chip.key));
}

export function describeAccessChange(
  previous: { role: EnterpriseRole; scope: UserAccessScope },
  next: { role: EnterpriseRole; scope: UserAccessScope },
) {
  const roleChanged = previous.role !== next.role;
  const before = scopeKeySet(previous.scope);
  const after = scopeKeySet(next.scope);
  const added = [...after].filter((key) => !before.has(key));
  const removed = [...before].filter((key) => !after.has(key));
  const scopeChanged = added.length > 0 || removed.length > 0;
  if (!roleChanged && !scopeChanged) return null;

  const rankDelta = ROLE_RANK[next.role] - ROLE_RANK[previous.role];
  const expanded = added.length > 0 && removed.length === 0 && rankDelta >= 0;
  const reduced = removed.length > 0 && added.length === 0 && rankDelta <= 0;
  const direction = expanded ? "expand" : reduced ? "reduce" : "change";

  const changes = [
    roleChanged ? { field: "Role", previous: roleLabel(previous.role), next: roleLabel(next.role) } : null,
    scopeChanged ? { field: "Scope", previous: formatScope(previous.scope), next: formatScope(next.scope) } : null,
  ].filter((item): item is { field: string; previous: string; next: string } => Boolean(item));

  return {
    direction,
    title: expanded
      ? "This will expand the user’s access"
      : reduced
        ? "This will reduce the user’s access"
        : "This will change the user’s access",
    detail: changes.map((item) => `${item.field}: ${item.previous} → ${item.next}`).join(". "),
    changes,
  };
}

export function emptyScope(): UserAccessScope {
  return { enterprise: false, groupIds: [], territoryIds: [], clusterIds: [], siteIds: [] };
}

export function accessFromUserScope(scope: UserAccessScope): AccessScope | undefined {
  if (scope.enterprise) return undefined;
  return {
    groupIds: scope.groupIds?.length ? scope.groupIds : undefined,
    territoryIds: scope.territoryIds?.length ? scope.territoryIds : undefined,
    clusterIds: scope.clusterIds?.length ? scope.clusterIds : undefined,
    siteIds: scope.siteIds?.length ? scope.siteIds : undefined,
  };
}

export function userScopeFromAccess(scope: AccessScope): UserAccessScope {
  if (scope.groupIds == null && scope.territoryIds == null && scope.clusterIds == null && scope.siteIds == null) {
    return { enterprise: true };
  }
  return {
    enterprise: false,
    groupIds: scope.groupIds ?? [],
    territoryIds: scope.territoryIds ?? [],
    clusterIds: scope.clusterIds ?? [],
    siteIds: scope.siteIds ?? [],
  };
}

export function formatScope(scope: UserAccessScope) {
  if (scope.enterprise) return "Entire Enterprise";
  const parts: string[] = [];
  for (const id of scope.groupIds ?? []) {
    const name = listUnits("group").find((item) => item.id === id)?.name ?? demoGroups.find((item) => item.id === id)?.name;
    if (name) parts.push(`${name} (Group)`);
  }
  for (const id of scope.territoryIds ?? []) {
    const name = listUnits("territory").find((item) => item.id === id)?.name ?? demoTerritories.find((item) => item.id === id)?.name;
    if (name) parts.push(`${name} (Territory)`);
  }
  for (const id of scope.clusterIds ?? []) {
    const name = listUnits("cluster").find((item) => item.id === id)?.name ?? demoClusters.find((item) => item.id === id)?.name;
    if (name) parts.push(`${name} (Cluster)`);
  }
  for (const id of scope.siteIds ?? []) {
    const name = demoNetworkSites.find((item) => item.id === id)?.name;
    if (name) parts.push(name);
  }
  if (!parts.length) return "No scope assigned";
  if (parts.length <= 2) return parts.join(" · ");
  return `${parts.slice(0, 2).join(" · ")} +${parts.length - 2}`;
}

export function formatInviteSent(iso: string | null) {
  if (!iso) return "Invitation sent";
  const date = new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return `Invitation sent ${date}`;
}

export function lastSeenLabel(user: DirectoryUser) {
  if (user.status === "invited") return formatInviteSent(user.invitedAt);
  return formatLastActivity(user.lastActiveAt);
}

export function userInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "")).toUpperCase();
}

const AVATAR_COLORS = ["#2D5F4F", "#4C7C9B", "#C4843C", "#0F766E", "#7C6BB0"];

export function avatarColor(name: string) {
  const sum = name.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

export function scopeKind(scope: UserAccessScope): ScopeFilter[] {
  const kinds: ScopeFilter[] = [];
  if (scope.enterprise) kinds.push("enterprise");
  if (scope.groupIds?.length) kinds.push("group");
  if (scope.territoryIds?.length) kinds.push("territory");
  if (scope.clusterIds?.length) kinds.push("cluster");
  if (scope.siteIds?.length) kinds.push("site");
  return kinds;
}

export type UsersTableFilters = {
  q: string;
  role: "all" | EnterpriseRole;
  scope: ScopeFilter;
  status: "all" | DirectoryUserStatus;
  summary: "all" | DirectoryUserStatus | "total";
  page: number;
  pageSize: 10 | 25 | 50;
};

export const EMPTY_USER_FILTERS: UsersTableFilters = {
  q: "",
  role: "all",
  scope: "all",
  status: "all",
  summary: "all",
  page: 1,
  pageSize: 10,
};

export function parseUserFilters(params: URLSearchParams): UsersTableFilters {
  const pageSize = Number(params.get("pageSize"));
  const page = Number(params.get("page"));
  return {
    q: params.get("q") ?? "",
    role: (params.get("role") as UsersTableFilters["role"]) || "all",
    scope: (params.get("scope") as ScopeFilter) || "all",
    status: (params.get("status") as UsersTableFilters["status"]) || "all",
    summary: (params.get("summary") as UsersTableFilters["summary"]) || "all",
    page: page > 0 ? page : 1,
    pageSize: pageSize === 25 || pageSize === 50 ? pageSize : 10,
  };
}

export function userFiltersToQuery(filters: UsersTableFilters) {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.role !== "all") params.set("role", filters.role);
  if (filters.scope !== "all") params.set("scope", filters.scope);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.summary !== "all" && filters.summary !== "total") params.set("summary", filters.summary);
  if (filters.page > 1) params.set("page", String(filters.page));
  if (filters.pageSize !== 10) params.set("pageSize", String(filters.pageSize));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function hasActiveUserFilters(filters: UsersTableFilters) {
  return Boolean(filters.q.trim()) || filters.role !== "all" || filters.scope !== "all" || filters.status !== "all" || (filters.summary !== "all" && filters.summary !== "total");
}

export function filterUsers(filters: UsersTableFilters) {
  const query = filters.q.trim().toLowerCase();
  return users.filter((user) => {
    if (filters.role !== "all" && user.role !== filters.role) return false;
    if (filters.scope !== "all" && !scopeKind(user.scope).includes(filters.scope)) return false;
    const status = filters.summary !== "all" && filters.summary !== "total" ? filters.summary : filters.status;
    if (status !== "all" && user.status !== status) return false;
    if (query && !`${user.name} ${user.email}`.toLowerCase().includes(query)) return false;
    return true;
  });
}

export function userSummaryCounts() {
  return {
    total: users.length,
    active: users.filter((user) => user.status === "active").length,
    invited: users.filter((user) => user.status === "invited").length,
    deactivated: users.filter((user) => user.status === "deactivated").length,
  };
}

export function userCoversSite(user: DirectoryUser, site: OrganizationSite) {
  if (user.scope.enterprise) return true;
  if (user.scope.siteIds?.includes(site.id)) return true;
  if (site.groupId && user.scope.groupIds?.includes(site.groupId)) return true;
  if (site.territoryId && user.scope.territoryIds?.includes(site.territoryId)) return true;
  if (site.clusterId && user.scope.clusterIds?.includes(site.clusterId)) return true;
  return false;
}

export function usersForSite(site: OrganizationSite) {
  return users.filter((user) => userCoversSite(user, site));
}

function uniqueEmail(email: string, excludeId?: string) {
  const value = email.trim().toLowerCase();
  return !users.some((user) => user.id !== excludeId && user.email.toLowerCase() === value);
}

function hasScope(scope: UserAccessScope) {
  if (scope.enterprise) return true;
  return Boolean(scope.groupIds?.length || scope.territoryIds?.length || scope.clusterIds?.length || scope.siteIds?.length);
}

export function saveUser(
  draft: {
    firstName: string;
    lastName: string;
    email: string;
    mobile?: string;
    role: EnterpriseRole;
    scope: UserAccessScope;
  },
  existingId?: string,
  actor = "Alex Morgan",
) {
  const firstName = draft.firstName.trim();
  const lastName = draft.lastName.trim();
  const email = draft.email.trim();
  const mobile = draft.mobile?.trim() ?? "";
  const name = `${firstName} ${lastName}`.trim();
  if (!firstName) return { ok: false as const, error: "Please enter a first name." };
  if (!lastName) return { ok: false as const, error: "Please enter a last name." };
  if (!email) return { ok: false as const, error: "Please enter an email." };
  if (!uniqueEmail(email, existingId)) return { ok: false as const, error: "A user with this email already exists." };
  const scope = draft.role === "enterprise_super_admin" ? { enterprise: true } : draft.scope;
  if (draft.role === "enterprise_super_admin" && !scope.enterprise) {
    return { ok: false as const, error: "Enterprise Super Admin must have Entire Enterprise scope." };
  }
  if (!roleAllowsEnterprise(draft.role) && scope.enterprise) {
    return { ok: false as const, error: "This role cannot have Entire Enterprise scope." };
  }
  if (!hasScope(scope)) return { ok: false as const, error: "Assign at least one Group, Territory, Cluster or Site." };

  if (existingId) {
    const previous = getUser(existingId);
    users = users.map((user) =>
      user.id === existingId ? { ...user, firstName, lastName, name, email, mobile, role: draft.role, scope } : user,
    );
    const change = previous ? describeAccessChange(previous, { role: draft.role, scope }) : null;
    const changes = [
      previous && previous.name !== name ? { field: "Name", previous: previous.name, next: name } : null,
      previous && previous.email !== email ? { field: "Email", previous: previous.email, next: email } : null,
      previous && previous.mobile !== mobile ? { field: "Mobile", previous: previous.mobile || "—", next: mobile || "—" } : null,
      ...(change?.changes ?? []),
    ].filter((item): item is { field: string; previous: string; next: string } => Boolean(item));
    appendAudit({
      actor,
      action: change ? "Changed role or scope" : "Updated user",
      area: "users",
      entity: name,
      detail: `${name} · ${roleLabel(draft.role)} · ${formatScope(scope)}${change ? ` · ${change.detail}` : ""}`,
      changes,
    });
    if (change) {
      recordNotificationEvent({
        kind: "access_changed",
        title: "User access changed",
        detail: `${name} · ${change.detail}`,
        href: `/users/${existingId}`,
        siteIds: [...(scope.siteIds ?? []), ...(previous?.scope.siteIds ?? [])],
      });
    }
    emit();
    return { ok: true as const, id: existingId };
  }

  const user: DirectoryUser = {
    id: `u-${Date.now()}`,
    firstName,
    lastName,
    name,
    email,
    mobile,
    role: draft.role,
    scope,
    status: "invited",
    lastActiveAt: null,
    invitedAt: daysAgoIso(0),
    inviteToken: token(),
  };
  users = [user, ...users];
  appendAudit({
    actor,
    action: "User added",
    area: "users",
    entity: name,
    detail: `${name} · ${roleLabel(draft.role)} · ${formatScope(scope)}`,
    changes: [
      { field: "Role", previous: "—", next: roleLabel(draft.role) },
      { field: "Scope", previous: "—", next: formatScope(scope) },
    ],
  });
  emit();
  return { ok: true as const, id: user.id };
}

export function setUserStatus(id: string, status: "active" | "deactivated", actor = "Alex Morgan") {
  const current = getUser(id);
  if (!current) return;
  users = users.map((user) => (user.id === id ? { ...user, status, inviteToken: status === "active" ? null : user.inviteToken } : user));
  appendAudit({
    actor,
    action: status === "deactivated" ? "Deactivated user" : "Reactivated user",
    area: "users",
    entity: current.name,
    detail: `${current.name} · access ${status === "deactivated" ? "removed" : "restored"}. Historical activity is unchanged.`,
    changes: [
      {
        field: "Status",
        previous: current.status === "deactivated" ? "Deactivated" : current.status === "invited" ? "Invited" : "Active",
        next: status === "deactivated" ? "Deactivated" : "Active",
      },
    ],
  });
  if (current.status === "invited" && status === "active") {
    recordNotificationEvent({
      kind: "user_activated",
      title: "New user activated",
      detail: `${current.name} accepted their invitation and is now active.`,
      href: `/users/${id}`,
      siteIds: current.scope.siteIds ?? [],
    });
  }
  emit();
}

export function resendInvitation(id: string, actor = "Alex Morgan") {
  const current = getUser(id);
  if (!current || current.status !== "invited") return { ok: false as const, error: "Only invited users can be resent an invitation." };
  users = users.map((user) =>
    user.id === id ? { ...user, invitedAt: daysAgoIso(0), inviteToken: token() } : user,
  );
  appendAudit({
    actor,
    action: "Resent invitation",
    area: "users",
    entity: current.name,
    detail: `${current.name} · previous activation link invalidated`,
    changes: [{ field: "Invitation", previous: "Outstanding", next: "Resent" }],
  });
  emit();
  return { ok: true as const };
}

export function assignableUnits() {
  return {
    groups: listUnits("group").filter((unit) => unit.status === "active"),
    territories: listUnits("territory").filter((unit) => unit.status === "active"),
    clusters: listUnits("cluster").filter((unit) => unit.status === "active"),
    sites: demoNetworkSites.filter((site) => site.status === "active"),
  };
}
