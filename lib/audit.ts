"use client";

import { useSyncExternalStore } from "react";
import { DEMO_TODAY, addDays, inDateRange, periodRange, toApiDate } from "@/lib/dates";
import type { PeriodKey } from "@/types/enterprise";

export const AUDIT_RETENTION_MONTHS = 24;
export const AUDIT_RETENTION_DAYS = Math.round((AUDIT_RETENTION_MONTHS * 365) / 12);

export const AUDIT_AREAS = [
  { id: "sites", label: "Sites" },
  { id: "users", label: "Users" },
  { id: "structure", label: "Organisation Structure" },
  { id: "settings", label: "Enterprise Settings" },
] as const;

export type AuditArea = (typeof AUDIT_AREAS)[number]["id"];

export type AuditChange = {
  field: string;
  previous: string;
  next: string;
};

export type AuditEntry = {
  id: string;
  at: string;
  actor: string;
  action: string;
  area: AuditArea;
  entity: string;
  detail: string;
  changes: AuditChange[];
};

export type AuditFilters = {
  q: string;
  period: PeriodKey;
  action: string;
  user: string;
  area: string;
  page: number;
  pageSize: 10 | 25 | 50;
};

export const EMPTY_AUDIT_FILTERS: AuditFilters = {
  q: "",
  period: "30",
  action: "all",
  user: "all",
  area: "all",
  page: 1,
  pageSize: 10,
};

const STORAGE_KEY = "enterprise_audit_log_v2";
const listeners = new Set<() => void>();
let version = 0;
let extras: AuditEntry[] = [];
let loaded = false;
const seed: AuditEntry[] = [];
let entries: AuditEntry[] = applyRetention(seed);

function emit() {
  version += 1;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAuditVersion() {
  return useSyncExternalStore(subscribe, () => version, () => 0);
}

function stamp(daysBack: number, time: string) {
  return `${toApiDate(addDays(DEMO_TODAY, -daysBack))}T${time}:00+10:00`;
}

function row(
  daysBack: number,
  time: string,
  actor: string,
  action: string,
  area: AuditArea,
  entity: string,
  detail: string,
  changes: AuditChange[] = [],
): Omit<AuditEntry, "id"> {
  return { at: stamp(daysBack, time), actor, action, area, entity, detail, changes };
}

function buildDemoAuditLog(): AuditEntry[] {
  const featured: Omit<AuditEntry, "id">[] = [
    row(0, "10:42", "Alex Morgan", "Site reassigned", "sites", "Parramatta Cafe", "Territory changed for Parramatta Cafe.", [
      { field: "Territory", previous: "Greater West", next: "Sydney CBD" },
    ]),
    row(0, "09:15", "Alex Morgan", "User added", "users", "Sam Reid", "Invited Sam Reid as Site Admin for Parramatta Cafe.", [
      { field: "Role", previous: "—", next: "Site Admin" },
      { field: "Scope", previous: "—", next: "Parramatta Cafe" },
    ]),
    row(0, "08:04", "Taylor Quincy", "Site deactivated", "sites", "North Shore Events", "North Shore Events was deactivated. Historical recovery records are unchanged.", [
      { field: "Status", previous: "Active", next: "Deactivated" },
    ]),
    row(1, "16:40", "Alex Morgan", "Updated organisation profile", "settings", "Harbour Kitchen Group", "Primary contact details were updated.", [
      { field: "Primary contact", previous: "Alex Morgan", next: "Taylor Quincy" },
      { field: "Contact email", previous: "alex@harbourkitchen.com", next: "taylor@harbourkitchen.com" },
    ]),
    row(1, "14:12", "Taylor Quincy", "Updated notification settings", "settings", "Notifications", "Site attention threshold was tightened.", [
      { field: "No recent activity threshold", previous: "30 days", next: "14 days" },
    ]),
    row(2, "11:20", "Alex Morgan", "Changed role or scope", "users", "Jamie Chen", "Access for Jamie Chen was reduced to Harbour Kitchen HQ.", [
      { field: "Role", previous: "Group Admin", next: "Site Admin" },
      { field: "Scope", previous: "Harbour Kitchen", next: "Harbour Kitchen HQ" },
    ]),
    row(3, "15:05", "Taylor Quincy", "Site reassigned", "sites", "Bondi Kitchen", "Cluster changed for Bondi Kitchen.", [
      { field: "Cluster", previous: "Bondi", next: "Inner City" },
    ]),
    row(4, "10:18", "Alex Morgan", "Added site", "sites", "Rozelle Kitchen", "Rozelle Kitchen was added as a branch of Harbour Kitchen HQ.", [
      { field: "Status", previous: "—", next: "Active" },
      { field: "Group", previous: "—", next: "Harbour Kitchen" },
    ]),
    row(5, "09:40", "Alex Morgan", "Updated group", "structure", "Harbour Cafe", "Harbour Cafe description was updated.", [
      { field: "Description", previous: "Cafe and counter-service sites.", next: "Cafe, kiosk and counter-service sites." },
    ]),
    row(6, "13:22", "Taylor Quincy", "User added", "users", "Asha Rahman", "Invited Asha Rahman as Site Admin for Quay Cafe.", [
      { field: "Role", previous: "—", next: "Site Admin" },
      { field: "Scope", previous: "—", next: "Quay Cafe" },
    ]),
    row(7, "11:08", "Alex Morgan", "Deactivated user", "users", "Riley Brooks", "Access for Riley Brooks was removed. Historical activity is unchanged.", [
      { field: "Status", previous: "Active", next: "Deactivated" },
    ]),
    row(8, "16:30", "Taylor Quincy", "Added territory", "structure", "Illawarra", "Illawarra was added as an independent territory.", [
      { field: "Status", previous: "—", next: "Active" },
      { field: "Code", previous: "—", next: "ILLA" },
    ]),
    row(9, "10:02", "Alex Morgan", "Site updated", "sites", "Surry Hills Kitchen", "Collection window was changed for Surry Hills Kitchen.", [
      { field: "Collection hours", previous: "14:00–17:00", next: "13:00–16:30" },
    ]),
    row(10, "15:44", "Taylor Quincy", "Changed role or scope", "users", "Elena Voss", "Reporting scope for Elena Voss was expanded.", [
      { field: "Scope", previous: "Eastern Suburbs", next: "Eastern Suburbs, Sydney CBD" },
    ]),
    row(12, "09:10", "Alex Morgan", "Deactivated cluster", "structure", "Liverpool", "Liverpool cluster was deactivated and sites were moved.", [
      { field: "Status", previous: "Active", next: "Deactivated" },
    ]),
    row(12, "09:11", "Alex Morgan", "Site reassigned", "sites", "Liverpool Cafe", "Liverpool Cafe was moved after the Liverpool cluster was deactivated.", [
      { field: "Cluster", previous: "Liverpool", next: "Parramatta" },
    ]),
    row(14, "12:15", "Taylor Quincy", "Updated organisation profile", "settings", "Harbour Kitchen Group", "Display defaults were changed.", [
      { field: "Timezone", previous: "Australian Eastern Standard Time", next: "Australian Eastern Time (Melbourne)" },
    ]),
    row(16, "08:50", "Alex Morgan", "Resent invitation", "users", "Noah Patel", "A new activation link was sent. The previous link no longer works.", [
      { field: "Invitation", previous: "Outstanding", next: "Resent" },
    ]),
    row(18, "14:28", "Alex Morgan", "Changed role or scope", "users", "Chris Adeyemi", "Group Admin scope was limited to Harbour Cafe.", [
      { field: "Scope", previous: "Harbour Cafe, Harbour Catering", next: "Harbour Cafe" },
    ]),
    row(21, "10:00", "Alex Morgan", "Added site", "sites", "Parramatta Cafe", "Parramatta Cafe was added as a branch of Harbour Kitchen HQ.", [
      { field: "Group", previous: "—", next: "Harbour Cafe" },
      { field: "Territory", previous: "—", next: "Greater West" },
    ]),
    row(24, "11:36", "Taylor Quincy", "Updated notification settings", "settings", "Notifications", "Report-ready alerts were turned on.", [
      { field: "Report ready", previous: "Off", next: "On" },
    ]),
    row(28, "15:20", "Alex Morgan", "Site deactivated", "sites", "Events at Circular Quay", "Events at Circular Quay was temporarily deactivated.", [
      { field: "Status", previous: "Active", next: "Deactivated" },
    ]),
    row(28, "16:05", "Alex Morgan", "Site reactivated", "sites", "Events at Circular Quay", "Events at Circular Quay was restored to active.", [
      { field: "Status", previous: "Deactivated", next: "Active" },
    ]),
    row(32, "09:48", "Taylor Quincy", "Added cluster", "structure", "Inner West", "Inner West was added as an independent cluster.", [
      { field: "Status", previous: "—", next: "Active" },
      { field: "Code", previous: "—", next: "IWEST" },
    ]),
    row(36, "13:10", "Alex Morgan", "Updated user", "users", "Morgan Hale", "Contact details for Morgan Hale were updated.", [
      { field: "Mobile", previous: "—", next: "+61 400 118 300" },
    ]),
    row(40, "10:22", "Taylor Quincy", "Updated territory", "structure", "Greater West", "Greater West code was standardised.", [
      { field: "Code", previous: "WEST", next: "GWEST" },
    ]),
    row(45, "14:55", "Alex Morgan", "Deactivated user", "users", "Jordan Blake", "Access for Jordan Blake was removed.", [
      { field: "Status", previous: "Active", next: "Deactivated" },
    ]),
    row(52, "09:05", "Taylor Quincy", "Site reassigned", "sites", "Manly Cafe", "Manly Cafe was moved to North Shore.", [
      { field: "Territory", previous: "Sydney CBD", next: "North Shore" },
    ]),
    row(60, "11:40", "Alex Morgan", "Updated organisation profile", "settings", "Harbour Kitchen Group", "Organisation logo was updated.", [
      { field: "Logo", previous: "Default", next: "Updated" },
    ]),
    row(75, "10:16", "Taylor Quincy", "Added group", "structure", "Harbour Events", "Harbour Events was added as a business group.", [
      { field: "Status", previous: "—", next: "Active" },
      { field: "Code", previous: "—", next: "HE" },
    ]),
    row(88, "15:33", "Alex Morgan", "Site updated", "sites", "Harbour Kitchen HQ", "Primary contact for Harbour Kitchen HQ was changed.", [
      { field: "Primary contact", previous: "Harbour HQ", next: "Jamie Chen" },
    ]),
    row(110, "09:12", "Alex Morgan", "User added", "users", "Elena Voss", "Invited Elena Voss as a Reporting User.", [
      { field: "Role", previous: "—", next: "Reporting User" },
      { field: "Scope", previous: "—", next: "Eastern Suburbs" },
    ]),
  ];

  const fillSites = ["Quay Cafe", "Newtown Cafe", "Westmead Cafe", "Paddington Kitchen", "North Sydney Kitchen", "Catering Hub", "West Catering"];
  const fillUsers = ["Priya Nair", "Jamie Chen", "Morgan Hale", "Chris Adeyemi", "Noah Patel"];
  const generated = fillSites.flatMap((site, index) => {
    const days = 11 + index * 7;
    const user = fillUsers[index % fillUsers.length];
    return [
      row(days, "10:30", index % 2 ? "Taylor Quincy" : "Alex Morgan", "Site updated", "sites", site, `Contact details were updated for ${site}.`, [
        { field: "Primary contact", previous: "Site manager", next: user },
      ]),
      row(days + 2, "14:05", index % 2 ? "Alex Morgan" : "Taylor Quincy", "Changed role or scope", "users", user, `Site access was adjusted for ${user}.`, [
        { field: "Scope", previous: "Harbour Kitchen HQ", next: site },
      ]),
      row(days + 4, "09:25", "Alex Morgan", "Updated notification settings", "settings", "Notifications", "A site attention alert was adjusted.", [
        { field: "No listings threshold", previous: "30 days", next: `${[7, 14, 30, 60][index % 4]} days` },
      ]),
    ];
  });

  return [...featured, ...generated]
    .map((entry, index) => ({ ...entry, id: `audit-seed-${String(index + 1).padStart(2, "0")}` }))
    .sort((left, right) => right.at.localeCompare(left.at));
}

function applyRetention(items: AuditEntry[]) {
  const start = toApiDate(addDays(DEMO_TODAY, -(AUDIT_RETENTION_DAYS - 1)));
  return items.filter((entry) => inDateRange(entry.at, start)).sort((left, right) => right.at.localeCompare(left.at));
}

function normalize(raw: Partial<AuditEntry> & { time?: string }): AuditEntry | null {
  if (!raw.id || !raw.actor || !raw.action) return null;
  const area = AUDIT_AREAS.some((item) => item.id === raw.area) ? (raw.area as AuditArea) : inferArea(raw.action, raw.detail ?? "");
  return {
    id: raw.id,
    at: raw.at ?? (raw.time ? DEMO_TODAY.toISOString() : new Date().toISOString()),
    actor: raw.actor,
    action: raw.action,
    area,
    entity: raw.entity ?? "",
    detail: raw.detail ?? "",
    changes: Array.isArray(raw.changes) ? raw.changes.filter((item) => item?.field) : [],
  };
}

function inferArea(action: string, detail: string): AuditArea {
  const text = `${action} ${detail}`.toLowerCase();
  if (text.includes("user") || text.includes("invitation") || text.includes("role") || text.includes("scope")) return "users";
  if (text.includes("group") || text.includes("territory") || text.includes("cluster") || text.includes("structure")) return "structure";
  if (text.includes("organisation") || text.includes("notification") || text.includes("settings") || text.includes("profile")) {
    return "settings";
  }
  return "sites";
}

function persist() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(extras));
}

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    extras = raw ? ((JSON.parse(raw) as unknown[]) ?? []).map((item) => normalize(item as Partial<AuditEntry>)).filter((item): item is AuditEntry => Boolean(item)) : [];
  } catch {
    extras = [];
  }
  entries = applyRetention([...extras, ...seed]);
}

export function listAudit() {
  ensureLoaded();
  return entries;
}

export function appendAudit(
  entry: Omit<AuditEntry, "id" | "at" | "entity" | "area" | "changes" | "detail"> &
    Partial<Pick<AuditEntry, "at" | "entity" | "area" | "changes" | "detail">> & {
      action: string;
      actor: string;
    },
) {
  ensureLoaded();
  const at = entry.at ?? new Date().toISOString();
  const area = entry.area ?? inferArea(entry.action, entry.detail ?? "");
  const changes = entry.changes ?? [];
  const detail = entry.detail || [entry.entity, formatAuditChanges(changes)].filter(Boolean).join(" · ");
  const next: AuditEntry = {
    id: `audit-${Date.now()}-${version}`,
    at,
    actor: entry.actor,
    action: entry.action,
    area,
    entity: entry.entity ?? "",
    detail,
    changes,
  };
  extras = [next, ...extras];
  entries = applyRetention([next, ...entries]);
  persist();
  emit();
}

export function areaLabel(area: AuditArea | string) {
  return AUDIT_AREAS.find((item) => item.id === area)?.label ?? area;
}

export function formatAuditChange(change: AuditChange) {
  if (change.previous && change.next) return `${change.field}: ${change.previous} → ${change.next}`;
  return change.next ? `${change.field}: ${change.next}` : change.field;
}

export function formatAuditChanges(changes: AuditChange[] = []) {
  return changes.map(formatAuditChange).join(". ");
}

export function actorInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function parseAuditFilters(params: URLSearchParams | null): AuditFilters {
  const period = params?.get("period");
  const pageSize = Number(params?.get("pageSize"));
  const page = Number(params?.get("page"));
  return {
    q: params?.get("q") ?? "",
    period: period === "7" || period === "90" || period === "all" ? period : "30",
    action: params?.get("action") || "all",
    user: params?.get("user") || "all",
    area: params?.get("area") || "all",
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
    pageSize: pageSize === 25 || pageSize === 50 ? pageSize : 10,
  };
}

export function auditFiltersToQuery(filters: AuditFilters) {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.period !== "30") params.set("period", filters.period);
  if (filters.action !== "all") params.set("action", filters.action);
  if (filters.user !== "all") params.set("user", filters.user);
  if (filters.area !== "all") params.set("area", filters.area);
  if (filters.page > 1) params.set("page", String(filters.page));
  if (filters.pageSize !== 10) params.set("pageSize", String(filters.pageSize));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function hasActiveAuditFilters(filters: AuditFilters) {
  return Boolean(filters.q.trim() || filters.period !== "30" || filters.action !== "all" || filters.user !== "all" || filters.area !== "all");
}

export function auditFilterOptions(items = listAudit()) {
  const actions = [...new Set(items.map((item) => item.action))].sort((left, right) => left.localeCompare(right));
  const users = [...new Set(items.map((item) => item.actor))].sort((left, right) => left.localeCompare(right));
  return { actions, users };
}

function auditPeriodRange(period: PeriodKey) {
  const today = new Date() > DEMO_TODAY ? new Date() : DEMO_TODAY;
  if (period === "all") return { startDate: undefined as string | undefined, endDate: undefined as string | undefined };
  return periodRange(period, today);
}

export function filterAudit(filters: AuditFilters, items = listAudit()) {
  const query = filters.q.trim().toLowerCase();
  const range = auditPeriodRange(filters.period);
  return items.filter((entry) => {
    if (!inDateRange(entry.at, range.startDate, range.endDate)) return false;
    if (filters.action !== "all" && entry.action !== filters.action) return false;
    if (filters.user !== "all" && entry.actor !== filters.user) return false;
    if (filters.area !== "all" && entry.area !== filters.area) return false;
    if (!query) return true;
    const haystack = [entry.actor, entry.action, areaLabel(entry.area), entry.entity, entry.detail, formatAuditChanges(entry.changes)]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });
}

export function exportAuditCsv(rows: AuditEntry[]) {
  const header = ["Date & time", "User", "Action", "Area", "Entity", "Details", "Previous", "Changed to"];
  const body = rows.map((row) => [
    row.at,
    row.actor,
    row.action,
    areaLabel(row.area),
    row.entity,
    row.detail,
    row.changes.map((change) => `${change.field}: ${change.previous}`).join("; "),
    row.changes.map((change) => `${change.field}: ${change.next}`).join("; "),
  ]);
  const csv = [header, ...body].map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "saveful-audit-log.csv";
  link.click();
  URL.revokeObjectURL(url);
}
