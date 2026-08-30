"use client";

import { useSyncExternalStore } from "react";
import { listAllAdminEnterpriseAudit, type ApiAuditLogRow } from "@/lib/api";
import { DEMO_TODAY, addDays, inDateRange, liveToday, periodRange, toApiDate } from "@/lib/dates";
import type { PeriodKey } from "@/types/enterprise";

export const ADMIN_AUDIT_RETENTION_MONTHS = 24;
export const ADMIN_AUDIT_RETENTION_DAYS = Math.round((ADMIN_AUDIT_RETENTION_MONTHS * 365) / 12);

export type AdminAuditEntityType = "organisation" | "site" | "listing" | "collection" | "role" | "notification";

export const ADMIN_AUDIT_AREAS = [
  { id: "organisations", label: "Organisations" },
  { id: "sites", label: "Sites" },
  { id: "listings", label: "Listings" },
  { id: "collections", label: "Collections" },
  { id: "roles", label: "Admin Roles" },
  { id: "notifications", label: "Notifications" },
  { id: "plans", label: "Plans & Accounts" },
] as const;

export type AdminAuditArea = (typeof ADMIN_AUDIT_AREAS)[number]["id"];

export type AdminAuditChange = {
  field: string;
  previous: string;
  next: string;
};

export type AdminAuditEntry = {
  id: string;
  at: string;
  actorType: "saveful_admin";
  actor: string;
  actorEmail: string;
  action: string;
  organisationId: string;
  organisationName: string;
  siteId?: string;
  siteName?: string;
  entityType: AdminAuditEntityType;
  entity: string;
  entityId: string;
  area: AdminAuditArea;
  detail: string;
  changes: AdminAuditChange[];
};

export type AdminAuditFilters = {
  q: string;
  period: PeriodKey;
  organisationId: string;
  user: string;
  entityType: string;
  action: string;
  area: string;
  page: number;
  pageSize: 10 | 25 | 50;
};

export const EMPTY_ADMIN_AUDIT_FILTERS: AdminAuditFilters = {
  q: "",
  period: "30",
  organisationId: "all",
  user: "all",
  entityType: "all",
  action: "all",
  area: "all",
  page: 1,
  pageSize: 10,
};

const STORAGE_KEY = "saveful_admin_audit_log";
const listeners = new Set<() => void>();
let version = 0;
let extras: AdminAuditEntry[] = [];
let remoteEntries: AdminAuditEntry[] = [];
let loaded = false;

function emit() {
  version += 1;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAdminAuditVersion() {
  return useSyncExternalStore(subscribe, () => version, () => 0);
}

export function areaFromEntityType(entityType: AdminAuditEntityType): AdminAuditArea {
  if (entityType === "organisation") return "organisations";
  if (entityType === "role") return "roles";
  if (entityType === "notification") return "notifications";
  if (entityType === "listing") return "listings";
  if (entityType === "collection") return "collections";
  return "sites";
}

export function adminAuditAreaLabel(area: string) {
  return ADMIN_AUDIT_AREAS.find((item) => item.id === area)?.label ?? area;
}

export function adminAuditEntityTypeLabel(type: string) {
  if (type === "organisation") return "Organisation";
  if (type === "site") return "Site";
  if (type === "listing") return "Listing";
  if (type === "collection") return "Collection";
  if (type === "role") return "Role";
  if (type === "notification") return "Notification";
  return type;
}

function normalize(raw: Partial<AdminAuditEntry>): AdminAuditEntry | null {
  if (!raw.id || !raw.actor || !raw.action) return null;
  const entityType = raw.entityType ?? "organisation";
  return {
    id: raw.id,
    at: raw.at ?? new Date().toISOString(),
    actorType: "saveful_admin",
    actor: raw.actor,
    actorEmail: raw.actorEmail ?? "",
    action: raw.action,
    organisationId: raw.organisationId ?? "saveful",
    organisationName: raw.organisationName ?? "Saveful",
    siteId: raw.siteId,
    siteName: raw.siteName,
    entityType,
    entity: raw.entity ?? "",
    entityId: raw.entityId ?? raw.siteId ?? raw.organisationId ?? raw.id,
    area: raw.area ?? areaFromEntityType(entityType),
    detail: raw.detail ?? "",
    changes: Array.isArray(raw.changes) ? raw.changes.filter((item) => item?.field) : [],
  };
}

function seed(): AdminAuditEntry[] {
  return [];
}

function applyRetention(items: AdminAuditEntry[]) {
  const start = toApiDate(addDays(DEMO_TODAY, -(ADMIN_AUDIT_RETENTION_DAYS - 1)));
  return items.filter((entry) => inDateRange(entry.at, start)).sort((left, right) => right.at.localeCompare(left.at));
}

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    extras = raw
      ? ((JSON.parse(raw) as unknown[]) ?? [])
          .map((item) => normalize(item as Partial<AdminAuditEntry>))
          .filter((item): item is AdminAuditEntry => Boolean(item))
      : [];
  } catch {
    extras = [];
  }
}

function persist() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(extras));
}

function formatAuditAction(action: string) {
  return action
    .replace(/[._]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function mapAuditArea(area: string): AdminAuditArea {
  const value = area.toUpperCase();
  if (value === "SITES") return "sites";
  if (value === "NOTIFICATIONS") return "notifications";
  if (value === "ENTERPRISE_SETTINGS") return "plans";
  return "organisations";
}

function mapAuditEntityType(type: string): AdminAuditEntityType {
  const value = type.toLowerCase();
  if (value.includes("site")) return "site";
  if (value.includes("role")) return "role";
  if (value.includes("notification")) return "notification";
  if (value.includes("listing")) return "listing";
  if (value.includes("collection") || value.includes("claim")) return "collection";
  return "organisation";
}

function changesFromValues(previous: Record<string, unknown> | null | undefined, next: Record<string, unknown> | null | undefined): AdminAuditChange[] {
  if (!next || typeof next !== "object") return [];
  const before = previous && typeof previous === "object" ? previous : {};
  return Object.keys(next).map((field) => ({
    field,
    previous: before[field] == null ? "—" : String(before[field]),
    next: next[field] == null ? "—" : String(next[field]),
  }));
}

function mapRemoteAudit(row: ApiAuditLogRow): AdminAuditEntry {
  return {
    id: `api-${row.id}`,
    at: row.createdAt,
    actorType: "saveful_admin",
    actor: row.actorName || row.actorEmail || "Admin",
    actorEmail: row.actorEmail ?? "",
    action: formatAuditAction(row.action),
    organisationId: String(row.organisationId),
    organisationName: row.organisation?.name || `Organisation ${row.organisationId}`,
    entityType: mapAuditEntityType(row.entityType),
    entity: row.entityLabel || row.entityType,
    entityId: String(row.entityId ?? row.id),
    area: mapAuditArea(row.area),
    detail: row.summary,
    changes: changesFromValues(row.previousValue, row.newValue),
  };
}

export async function refreshAdminAudit() {
  const rows = await listAllAdminEnterpriseAudit();
  remoteEntries = rows.map(mapRemoteAudit);
  emit();
  return listAllAdminAudit();
}

export function appendAdminAudit(
  entry: Omit<AdminAuditEntry, "id" | "at" | "actorType" | "entityId" | "area"> & {
    at?: string;
    entityId?: string;
    area?: AdminAuditArea;
  },
) {
  ensureLoaded();
  const next = normalize({
    ...entry,
    id: `aa-${Date.now()}-${version}`,
    at: entry.at ?? new Date().toISOString(),
    actorType: "saveful_admin",
    entityId: entry.entityId ?? entry.siteId ?? entry.organisationId,
    area: entry.area ?? areaFromEntityType(entry.entityType),
  });
  if (!next) return null;
  extras = [next, ...extras];
  persist();
  emit();
  return next;
}

export function listAdminAudit(filters: Partial<AdminAuditFilters> & Pick<AdminAuditFilters, "period" | "organisationId">) {
  ensureLoaded();
  const merged: AdminAuditFilters = { ...EMPTY_ADMIN_AUDIT_FILTERS, ...filters };
  const { startDate, endDate } = periodRange(merged.period, liveToday());
  const query = merged.q.trim().toLowerCase();
  return applyRetention([...remoteEntries, ...extras, ...seed()]).filter((row) => {
    if (!inDateRange(row.at, startDate, endDate)) return false;
    if (merged.organisationId !== "all" && row.organisationId !== merged.organisationId) return false;
    if (merged.user !== "all" && row.actor !== merged.user) return false;
    if (merged.entityType !== "all" && row.entityType !== merged.entityType) return false;
    if (merged.action !== "all" && row.action !== merged.action) return false;
    if (merged.area !== "all" && row.area !== merged.area) return false;
    if (!query) return true;
    const haystack = [
      row.actor,
      row.actorEmail,
      row.action,
      row.organisationName,
      row.entity,
      row.entityId,
      row.detail,
      adminAuditAreaLabel(row.area),
      row.changes.map((change) => `${change.field} ${change.previous} ${change.next}`).join(" "),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });
}

export function listAllAdminAudit() {
  ensureLoaded();
  return applyRetention([...remoteEntries, ...extras, ...seed()]);
}

export function parseAdminAuditFilters(params: URLSearchParams | null): AdminAuditFilters {
  const period = params?.get("period");
  const pageSize = Number(params?.get("pageSize"));
  const page = Number(params?.get("page"));
  const entityType = params?.get("entityType");
  const area = params?.get("area");
  return {
    q: params?.get("q") ?? "",
    period: period === "7" || period === "90" || period === "all" ? period : "30",
    organisationId: params?.get("org") || "all",
    user: params?.get("user") || "all",
    entityType: entityType && entityType !== "all" ? entityType : "all",
    action: params?.get("action") || "all",
    area: area && area !== "all" ? area : "all",
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
    pageSize: pageSize === 25 || pageSize === 50 ? pageSize : 10,
  };
}

export function adminAuditFiltersToQuery(filters: AdminAuditFilters) {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.period !== "30") params.set("period", filters.period);
  if (filters.organisationId !== "all") params.set("org", filters.organisationId);
  if (filters.user !== "all") params.set("user", filters.user);
  if (filters.entityType !== "all") params.set("entityType", filters.entityType);
  if (filters.action !== "all") params.set("action", filters.action);
  if (filters.area !== "all") params.set("area", filters.area);
  if (filters.page > 1) params.set("page", String(filters.page));
  if (filters.pageSize !== 10) params.set("pageSize", String(filters.pageSize));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function hasActiveAdminAuditFilters(filters: AdminAuditFilters) {
  return Boolean(
    filters.q.trim() ||
      filters.period !== "30" ||
      filters.organisationId !== "all" ||
      filters.user !== "all" ||
      filters.entityType !== "all" ||
      filters.action !== "all" ||
      filters.area !== "all",
  );
}

export function adminAuditFilterOptions(items = listAllAdminAudit()) {
  const actions = [...new Set(items.map((item) => item.action))].sort((left, right) => left.localeCompare(right));
  const users = [...new Set(items.map((item) => item.actor))].sort((left, right) => left.localeCompare(right));
  const organisations = [...new Map(items.map((item) => [item.organisationId, item.organisationName])).entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((left, right) => left.name.localeCompare(right.name));
  return { actions, users, organisations };
}

export function firstChange(entry: AdminAuditEntry) {
  return entry.changes[0] ?? null;
}

export function actorInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function exportAdminAuditCsv(rows: AdminAuditEntry[]) {
  const header = [
    "Date/time",
    "User",
    "Action",
    "Organisation",
    "Entity",
    "Entity ID",
    "Entity type",
    "Area",
    "Previous value",
    "New value",
    "Details",
  ];
  const body = rows.map((row) => [
    row.at,
    row.actor,
    row.action,
    row.organisationName,
    row.entity,
    row.entityId,
    adminAuditEntityTypeLabel(row.entityType),
    adminAuditAreaLabel(row.area),
    row.changes.map((change) => `${change.field}: ${change.previous}`).join("; "),
    row.changes.map((change) => `${change.field}: ${change.next}`).join("; "),
    row.detail,
  ]);
  const csv = [header, ...body].map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "saveful-admin-audit-log.csv";
  link.click();
  URL.revokeObjectURL(url);
}
