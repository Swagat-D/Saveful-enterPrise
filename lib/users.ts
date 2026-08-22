"use client";

import { useSyncExternalStore } from "react";
import { appendAudit } from "@/lib/audit";
import { daysAgoIso } from "@/lib/dates";
import { demoClusters, demoGroups, demoNetworkSites, demoTerritories } from "@/lib/network";
import { listUnits } from "@/lib/orgStructure";
import { formatLastActivity } from "@/lib/networkRules";
import type {
  DirectoryUser,
  DirectoryUserStatus,
  EnterpriseRole,
  OrganizationSite,
  UserAccessScope,
} from "@/types/enterprise";

export const ENTERPRISE_ROLES: { id: EnterpriseRole; label: string; description: string }[] = [
  { id: "head_admin", label: "Head admin", description: "What they can do: manage the whole organisation, users, sites, and settings." },
  { id: "group_admin", label: "Group admin", description: "What they can do: administer users and sites inside their assigned groups." },
  { id: "site_admin", label: "Site admin", description: "What they can do: run assigned sites, listings, and local access." },
  { id: "reporting", label: "Reporting user", description: "What they can do: view reports for their assigned scope." },
  { id: "staff", label: "Staff", description: "What they can do: create and manage surplus listings at assigned sites." },
];

const ROLE_RANK: Record<EnterpriseRole, number> = {
  head_admin: 4,
  group_admin: 3,
  site_admin: 2,
  reporting: 1,
  staff: 0,
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

const seed: DirectoryUser[] = [
  {
    id: "u1",
    name: "Alex Morgan",
    email: "alex@harbourkitchen.com",
    role: "head_admin",
    scope: { enterprise: true },
    status: "active",
    lastActiveAt: daysAgoIso(0),
    invitedAt: daysAgoIso(400),
    inviteToken: null,
  },
  {
    id: "u2",
    name: "Priya Nair",
    email: "priya@harbourkitchen.com",
    role: "site_admin",
    scope: { siteIds: ["2"] },
    status: "active",
    lastActiveAt: daysAgoIso(1),
    invitedAt: daysAgoIso(280),
    inviteToken: null,
  },
  {
    id: "u3",
    name: "Jamie Chen",
    email: "jamie@harbourkitchen.com",
    role: "staff",
    scope: { siteIds: ["hq"] },
    status: "active",
    lastActiveAt: daysAgoIso(3),
    invitedAt: daysAgoIso(120),
    inviteToken: null,
  },
  {
    id: "u4",
    name: "Sam Reid",
    email: "sam@harbourkitchen.com",
    role: "site_admin",
    scope: { siteIds: ["3"] },
    status: "invited",
    lastActiveAt: null,
    invitedAt: daysAgoIso(2),
    inviteToken: token(),
  },
  {
    id: "u5",
    name: "Morgan Hale",
    email: "morgan@harbourkitchen.com",
    role: "group_admin",
    scope: { groupIds: ["kitchen"] },
    status: "active",
    lastActiveAt: daysAgoIso(0),
    invitedAt: daysAgoIso(90),
    inviteToken: null,
  },
  {
    id: "u6",
    name: "Chris Adeyemi",
    email: "chris@harbourkitchen.com",
    role: "group_admin",
    scope: { groupIds: ["cafe"] },
    status: "active",
    lastActiveAt: daysAgoIso(4),
    invitedAt: daysAgoIso(70),
    inviteToken: null,
  },
  {
    id: "u7",
    name: "Elena Voss",
    email: "elena@harbourkitchen.com",
    role: "reporting",
    scope: { territoryIds: ["east"] },
    status: "active",
    lastActiveAt: daysAgoIso(6),
    invitedAt: daysAgoIso(40),
    inviteToken: null,
  },
  {
    id: "u8",
    name: "Noah Patel",
    email: "noah@harbourkitchen.com",
    role: "reporting",
    scope: { groupIds: ["catering"], clusterIds: ["parra"] },
    status: "invited",
    lastActiveAt: null,
    invitedAt: daysAgoIso(5),
    inviteToken: token(),
  },
  {
    id: "u9",
    name: "Riley Brooks",
    email: "riley@harbourkitchen.com",
    role: "site_admin",
    scope: { siteIds: ["events-north"] },
    status: "deactivated",
    lastActiveAt: daysAgoIso(21),
    invitedAt: daysAgoIso(200),
    inviteToken: null,
  },
  {
    id: "u10",
    name: "Jordan Blake",
    email: "jordan@harbourkitchen.com",
    role: "staff",
    scope: { siteIds: ["bondi-kitchen"] },
    status: "deactivated",
    lastActiveAt: daysAgoIso(45),
    invitedAt: daysAgoIso(160),
    inviteToken: null,
  },
  {
    id: "u11",
    name: "Asha Rahman",
    email: "asha@harbourkitchen.com",
    role: "staff",
    scope: { siteIds: ["quay-cafe"] },
    status: "invited",
    lastActiveAt: null,
    invitedAt: daysAgoIso(1),
    inviteToken: token(),
  },
  {
    id: "u12",
    name: "Head office",
    email: "hq@harbourkitchen.com",
    role: "site_admin",
    scope: { siteIds: ["hq"] },
    status: "active",
    lastActiveAt: daysAgoIso(0),
    invitedAt: daysAgoIso(400),
    inviteToken: null,
  },
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

export function assignableRoles(actorRole: EnterpriseRole = "head_admin"): EnterpriseRole[] {
  const rank = ROLE_RANK[actorRole];
  return ENTERPRISE_ROLES.filter((role) => ROLE_RANK[role.id] <= rank).map((role) => role.id);
}

export function emptyScope(): UserAccessScope {
  return { enterprise: false, groupIds: [], territoryIds: [], clusterIds: [], siteIds: [] };
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
  draft: { name: string; email: string; role: EnterpriseRole; scope: UserAccessScope },
  existingId?: string,
  actor = "Alex Morgan",
) {
  const name = draft.name.trim();
  const email = draft.email.trim();
  if (!name) return { ok: false as const, error: "Please enter a name." };
  if (!email) return { ok: false as const, error: "Please enter an email." };
  if (!uniqueEmail(email, existingId)) return { ok: false as const, error: "A user with this email already exists." };
  const scope = draft.role === "head_admin" ? { enterprise: true } : draft.scope;
  if (!hasScope(scope)) return { ok: false as const, error: "Assign at least one Group, Territory, Cluster or Site." };

  if (existingId) {
    const previous = getUser(existingId);
    users = users.map((user) => (user.id === existingId ? { ...user, name, email, role: draft.role, scope } : user));
    appendAudit({
      actor,
      action: "Updated access",
      detail: `${name} · ${roleLabel(draft.role)} · ${formatScope(scope)}${previous && previous.role !== draft.role ? ` (was ${roleLabel(previous.role)})` : ""}`,
    });
    emit();
    return { ok: true as const, id: existingId };
  }

  const user: DirectoryUser = {
    id: `u-${Date.now()}`,
    name,
    email,
    role: draft.role,
    scope,
    status: "invited",
    lastActiveAt: null,
    invitedAt: daysAgoIso(0),
    inviteToken: token(),
  };
  users = [user, ...users];
  appendAudit({ actor, action: "Invited user", detail: `${name} · ${roleLabel(draft.role)} · ${formatScope(scope)}` });
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
    detail: `${current.name} · access ${status === "deactivated" ? "removed" : "restored"}. Historical activity is unchanged.`,
  });
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
    detail: `${current.name} · previous activation link invalidated`,
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
