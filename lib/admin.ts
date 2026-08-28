"use client";

import { useSyncExternalStore } from "react";
import { appendAdminAudit, listAdminAudit } from "@/lib/adminAudit";
import { ApiError, getEnterprise, listEnterprises, provisionEnterprise, uploadEnterpriseLogo, type EnterpriseDetail, type EnterpriseListItem, type ProvisionEnterpriseInput } from "@/lib/api";
import { inDateRange, periodRange, previousPeriodRange } from "@/lib/dates";
import { calculateImpact, formatKg } from "@/lib/impact";
import { demoUsers } from "@/lib/demo";
import { demoNetworkSites, recoveryTransactions } from "@/lib/network";
import { ACTIVITY_LABEL, activityStatus, formatLastActivity, isActivated } from "@/lib/networkRules";
import { foodInsights, organisationInsights } from "@/lib/insights";
import { foodCategoryFor, impactOverTime, PATHWAY_LABEL } from "@/lib/networkQuery";
import { activityForSite } from "@/lib/siteWorkspace";
import { foodRecoveredKg, lookupLabel } from "@/lib/sitesDirectory";
import type { ActivityStatus, PeriodKey, RecoveryPathway, RecoveryTransaction, SiteLifecycleStatus } from "@/types/enterprise";

export type OrgTypeId = "food_business" | "charity" | "farmer" | "circular";
export type ParticipationRoleId = "surplus_provider" | "surplus_receiver";
export type AdminOrgStatus = "Active" | "Prospect" | "Suspended";
export type OrgPlanId = "enterprise" | "standard";
export type OrgActivityStatus = "Active" | "Inactive";

export const ORG_TYPES: { id: OrgTypeId; label: string }[] = [
  { id: "food_business", label: "Food Business / Surplus Provider" },
  { id: "charity", label: "Charity" },
  { id: "farmer", label: "Farmer" },
  { id: "circular", label: "Circular Recovery Provider" },
];

export const ACCOUNT_STATUSES: { id: AdminOrgStatus; label: string }[] = [
  { id: "Active", label: "Active" },
  { id: "Prospect", label: "Prospect" },
  { id: "Suspended", label: "Suspended" },
];

export const ORG_PLANS: { id: OrgPlanId; label: string }[] = [
  { id: "enterprise", label: "Enterprise" },
  { id: "standard", label: "Standard" },
];

export const PARTICIPATION_ROLES: { id: ParticipationRoleId; label: string }[] = [
  { id: "surplus_provider", label: "Surplus provider" },
  { id: "surplus_receiver", label: "Surplus receiver" },
];

export const ADMIN_COUNTRIES: { id: string; name: string; timezone: string; currency: string; region?: "AU" | "IN" | "US" }[] = [
  { id: "AU", name: "Australia", timezone: "Australia/Sydney", currency: "AUD", region: "AU" },
  { id: "NZ", name: "New Zealand", timezone: "Pacific/Auckland", currency: "NZD" },
  { id: "IN", name: "India", timezone: "Asia/Kolkata", currency: "INR", region: "IN" },
  { id: "GB", name: "United Kingdom", timezone: "Europe/London", currency: "GBP" },
  { id: "US", name: "United States", timezone: "America/New_York", currency: "USD", region: "US" },
];

export const ADMIN_TIMEZONES = [
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Brisbane",
  "Australia/Adelaide",
  "Australia/Perth",
  "Pacific/Auckland",
  "Asia/Kolkata",
  "Europe/London",
  "America/New_York",
];

export const ADMIN_CURRENCIES = ["AUD", "NZD", "INR", "GBP", "USD"];
export const ADMIN_REGIONS = [
  { id: "AU", name: "AU" },
  { id: "IN", name: "IN" },
  { id: "US", name: "US" },
];
export const ADMIN_MEASUREMENT_UNITS = [
  { id: "METRIC", name: "METRIC" },
  { id: "IMPERIAL", name: "IMPERIAL" },
];

export function countryLabel(code: string) {
  const match = ADMIN_COUNTRIES.find((item) => item.id === code.toUpperCase() || item.name === code);
  return match?.name ?? code;
}

export function countryCode(value: string) {
  const match = ADMIN_COUNTRIES.find((item) => item.id === value.toUpperCase() || item.name === value);
  return match?.id ?? value.slice(0, 2).toUpperCase();
}

export type AdminFilters = {
  period: PeriodKey;
  country: string;
  state: string;
  orgType: "all" | OrgTypeId;
  role: "all" | ParticipationRoleId | "both";
  organisationId: string;
  pathway: "all" | RecoveryPathway;
  q: string;
  accountStatus: "all" | AdminOrgStatus;
  activityStatus: "all" | "active" | "inactive";
  plan: "all" | OrgPlanId;
};

export const EMPTY_ADMIN_FILTERS: AdminFilters = {
  period: "30",
  country: "all",
  state: "all",
  orgType: "all",
  role: "all",
  organisationId: "all",
  pathway: "all",
  q: "",
  accountStatus: "all",
  activityStatus: "all",
  plan: "all",
};

const PATHWAYS: RecoveryPathway[] = ["people", "livestock", "circular", "bioenergy"];

const ADMIN_PATHWAY_COLORS: Record<RecoveryPathway, string> = {
  people: "#2D5F4F",
  livestock: "#4C7C9B",
  circular: "#7C6BB0",
  bioenergy: "#E3B23C",
};

export type AdminOrganisation = {
  id: string;
  name: string;
  type: OrgTypeId;
  roles: ParticipationRoleId[];
  country: string;
  state: string;
  status: AdminOrgStatus;
  plan: OrgPlanId;
  users: number;
  source: "platform" | "seeded" | "created";
  enterpriseId?: string;
  lastLoginAt?: string | null;
};

export type AdminSite = {
  id: string;
  orgId: string;
  name: string;
  address: string;
  status: string;
  lastActivityAt: string | null;
};

export type AdminListing = {
  id: string;
  orgId: string;
  siteId: string;
  code: string;
  food: string;
  pathway: RecoveryPathway;
  quantityKg: number;
  status: string;
  createdAt: string;
};

export type AdminCollection = {
  id: string;
  orgId: string;
  siteId: string;
  listingId: string;
  code: string;
  food: string;
  pathway: RecoveryPathway;
  quantityKg: number;
  recipientName: string;
  recipientOrgId?: string;
  status: string;
  occurredAt: string;
};

export type AdminOrgUser = {
  id: string;
  orgId: string;
  name: string;
  email: string;
  role: string;
  status: "Active" | "Invited" | "Deactivated";
  lastActiveAt: string | null;
};

export type AdminOrgProfile = {
  code: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  joinedAt: string;
  contractStart: string;
  nextReview: string;
  billing: string;
  address?: string;
  timezone?: string;
  currency?: string;
  measurementUnit?: string;
  country?: string;
  logoUrl?: string | null;
};

export const ORG_DETAIL_TABS = [
  { id: "overview", label: "Overview" },
  { id: "sites", label: "Sites" },
  { id: "users", label: "Users" },
  { id: "listings", label: "Listings" },
  { id: "collections", label: "Collections" },
  { id: "insights", label: "Insights" },
  { id: "account", label: "Account" },
  { id: "audit", label: "Support & Audit" },
] as const;

export type OrgDetailTab = (typeof ORG_DETAIL_TABS)[number]["id"];

type Overlay = Partial<Pick<AdminOrganisation, "type" | "roles" | "status" | "plan">>;

const STORAGE_KEY = "saveful_admin_org_overlay";
const CREATED_KEY = "saveful_admin_created_orgs";
const SITE_OVERLAY_KEY = "saveful_admin_site_overlay";
const listeners = new Set<() => void>();
let version = 0;
let overlay: Record<string, Overlay> = {};
let siteOverlay: Record<string, { status?: SiteLifecycleStatus }> = {};
let createdOrgs: AdminOrganisation[] = [];
let createdSites: AdminSite[] = [];
let remoteOrgs: AdminOrganisation[] = [];
let remoteOrgUsers: Record<string, AdminOrgUser[]> = {};
let remoteOrgProfiles: Record<string, AdminOrgProfile> = {};
let loaded = false;

function site(
  orgId: string,
  id: string,
  name: string,
  address: string,
  status: string,
  lastActivityAt: string | null,
): AdminSite {
  return { id, orgId, name, address, status, lastActivityAt };
}

function emit() {
  version += 1;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAdminVersion() {
  return useSyncExternalStore(subscribe, () => version, () => 0);
}

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    overlay = raw ? (JSON.parse(raw) as Record<string, Overlay>) : {};
    const createdRaw = window.localStorage.getItem(CREATED_KEY);
    const created = createdRaw ? (JSON.parse(createdRaw) as { orgs?: AdminOrganisation[]; sites?: AdminSite[] }) : {};
    createdOrgs = created.orgs ?? [];
    createdSites = created.sites ?? [];
    const siteRaw = window.localStorage.getItem(SITE_OVERLAY_KEY);
    siteOverlay = siteRaw ? (JSON.parse(siteRaw) as Record<string, { status?: SiteLifecycleStatus }>) : {};
  } catch {
    overlay = {};
    siteOverlay = {};
    createdOrgs = [];
    createdSites = [];
  }
}

function persist() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overlay));
  window.localStorage.setItem(CREATED_KEY, JSON.stringify({ orgs: createdOrgs, sites: createdSites }));
  window.localStorage.setItem(SITE_OVERLAY_KEY, JSON.stringify(siteOverlay));
}

export function orgTypeLabel(id: OrgTypeId) {
  return ORG_TYPES.find((item) => item.id === id)?.label ?? id;
}

export function participationLabel(roles: ParticipationRoleId[]) {
  const hasProvider = roles.includes("surplus_provider");
  const hasReceiver = roles.includes("surplus_receiver");
  if (hasProvider && hasReceiver) return "Both";
  if (hasProvider) return "Surplus provider";
  if (hasReceiver) return "Surplus receiver";
  return "—";
}

const FILTER_STORE = "saveful_admin_filters";
const FILTER_PARAM_KEYS = ["period", "country", "state", "orgType", "role", "org", "pathway", "q", "accountStatus", "activityStatus", "plan"];
let rememberedFilters: AdminFilters | null = null;
let filterStoreLoaded = false;

function loadRememberedFilters() {
  if (filterStoreLoaded) return;
  filterStoreLoaded = true;
  if (typeof window === "undefined") return;
  try {
    const raw = window.sessionStorage.getItem(FILTER_STORE);
    rememberedFilters = raw ? cascadeAdminFilters({ ...EMPTY_ADMIN_FILTERS, ...JSON.parse(raw) }) : EMPTY_ADMIN_FILTERS;
  } catch {
    rememberedFilters = EMPTY_ADMIN_FILTERS;
  }
}

export function lastAdminFilters(): AdminFilters {
  loadRememberedFilters();
  return rememberedFilters ?? EMPTY_ADMIN_FILTERS;
}

export function rememberAdminFilters(filters: AdminFilters, announce = false) {
  rememberedFilters = cascadeAdminFilters(filters);
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(FILTER_STORE, JSON.stringify(rememberedFilters));
  }
  if (announce) emit();
}

export function urlHasAdminFilters(params: URLSearchParams) {
  return FILTER_PARAM_KEYS.some((key) => params.has(key));
}

export function parseAdminFilters(params: URLSearchParams): AdminFilters {
  if (!urlHasAdminFilters(params)) return lastAdminFilters();
  const period = params.get("period");
  const orgType = params.get("orgType");
  const role = params.get("role");
  const pathway = params.get("pathway");
  const accountStatus = params.get("accountStatus");
  const activityStatus = params.get("activityStatus");
  const plan = params.get("plan");
  const next = cascadeAdminFilters({
    period: (["7", "30", "90", "all"].includes(period ?? "") ? period : "30") as PeriodKey,
    country: params.get("country") || "all",
    state: params.get("state") || "all",
    orgType: ORG_TYPES.some((item) => item.id === orgType) ? (orgType as OrgTypeId) : "all",
    role: role === "surplus_provider" || role === "surplus_receiver" || role === "both" ? role : "all",
    organisationId: params.get("org") || "all",
    pathway: PATHWAYS.includes(pathway as RecoveryPathway) ? (pathway as RecoveryPathway) : "all",
    q: params.get("q") || "",
    accountStatus: ACCOUNT_STATUSES.some((item) => item.id === accountStatus) ? (accountStatus as AdminOrgStatus) : "all",
    activityStatus: activityStatus === "active" || activityStatus === "inactive" ? activityStatus : "all",
    plan: plan === "enterprise" || plan === "standard" ? plan : "all",
  });
  rememberAdminFilters(next);
  return next;
}

function cascadeAdminFilters(filters: AdminFilters): AdminFilters {
  const orgs = listOrganisations();
  const countryOk = filters.country === "all" || orgs.some((org) => org.country === filters.country);
  const country = countryOk ? filters.country : "all";
  const inCountry = orgs.filter((org) => country === "all" || org.country === country);
  const stateOk = filters.state === "all" || inCountry.some((org) => org.state === filters.state);
  const state = stateOk ? filters.state : "all";
  const next = { ...filters, country, state };
  if (next.organisationId !== "all" && !orgs.some((org) => org.id === next.organisationId && orgMatches({ ...next, organisationId: "all" }, org))) {
    next.organisationId = "all";
  }
  return next;
}

export function adminFiltersToQuery(filters: AdminFilters) {
  const params = new URLSearchParams();
  if (filters.period !== "30") params.set("period", filters.period);
  if (filters.country !== "all") params.set("country", filters.country);
  if (filters.state !== "all") params.set("state", filters.state);
  if (filters.orgType !== "all") params.set("orgType", filters.orgType);
  if (filters.role !== "all") params.set("role", filters.role);
  if (filters.organisationId !== "all") params.set("org", filters.organisationId);
  if (filters.pathway !== "all") params.set("pathway", filters.pathway);
  if (filters.q) params.set("q", filters.q);
  if (filters.accountStatus !== "all") params.set("accountStatus", filters.accountStatus);
  if (filters.activityStatus !== "all") params.set("activityStatus", filters.activityStatus);
  if (filters.plan !== "all") params.set("plan", filters.plan);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function adminFilterOptions(filters: AdminFilters) {
  const orgs = listOrganisations().filter((org) => {
    if (filters.country !== "all" && org.country !== filters.country) return false;
    return true;
  });
  const countries = unique(listOrganisations().map((org) => org.country));
  const states = unique(orgs.map((org) => org.state));
  return {
    countries: countries.map((id) => ({ id, name: id })),
    states: states.map((id) => ({ id, name: id })),
    organisations: listOrganisations()
      .filter((org) => orgMatches({ ...filters, organisationId: "all" }, org))
      .map((org) => ({ id: org.id, name: org.name })),
    pathways: PATHWAYS.map((id) => ({ id, name: PATHWAY_LABEL[id] })),
  };
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function normalizeOrgStatus(status: string | undefined): AdminOrgStatus {
  if (status === "Prospect" || status === "Onboarding") return "Prospect";
  if (status === "Suspended" || status === "Paused") return "Suspended";
  return "Active";
}

function mapAccountStatus(status: EnterpriseListItem["accountStatus"]): AdminOrgStatus {
  if (status === "ACTIVE") return "Active";
  if (status === "SUSPENDED" || status === "CLOSED") return "Suspended";
  return "Prospect";
}

function mapEnterprise(row: EnterpriseListItem): AdminOrganisation {
  return {
    id: String(row.organisationId),
    name: row.name,
    type: "food_business",
    roles: ["surplus_provider"],
    country: countryLabel(row.country),
    state: row.country,
    status: mapAccountStatus(row.accountStatus),
    plan: "enterprise",
    users: row.users,
    source: "platform",
    enterpriseId: row.enterpriseId,
    lastLoginAt: row.lastLoginAt ?? null,
  };
}

export async function refreshOrganisations() {
  const rows = await listEnterprises();
  remoteOrgs = rows.map(mapEnterprise);
  emit();
  const needsDetail = remoteOrgs
    .filter((org) => org.status === "Prospect" || !org.lastLoginAt)
    .slice(0, 8);
  if (needsDetail.length) {
    await Promise.all(needsDetail.map((org) => refreshOrganisationDetail(org.id).catch(() => undefined)));
  }
  return listOrganisations();
}

export function listOrganisations(): AdminOrganisation[] {
  ensureLoaded();
  const remoteIds = new Set(remoteOrgs.map((org) => org.id));
  return [...remoteOrgs, ...createdOrgs.filter((org) => !remoteIds.has(org.id))]
    .filter((org, index, rows) => rows.findIndex((item) => item.id === org.id) === index)
    .map((org) => {
      const patch = overlay[org.id];
      return {
        ...org,
        ...patch,
        status: normalizeOrgStatus(patch?.status ?? org.status),
        plan: patch?.plan ?? org.plan,
      };
    });
}

export function getOrganisation(id: string) {
  return listOrganisations().find((org) => org.id === id) ?? null;
}

function matchRecipientOrgId(name: string): string | undefined {
  const value = name.toLowerCase();
  if (value.includes("ozharvest")) return "ozharvest";
  if (value.includes("community care") || value.includes("community kitchen")) return "community-care";
  if (value.includes("circular renew")) return "circular-renew";
  if (value.includes("circular")) return "circular-lab";
  if (value.includes("farm rescue") || value.includes("livestock")) return "farm-rescue";
  return undefined;
}

function matchOwnSite(orgId: string, recipientName: string) {
  const sites = listSites().filter((row) => row.orgId === orgId);
  const value = recipientName.toLowerCase();
  return (
    sites.find((site) => value.includes(site.name.toLowerCase()) || site.name.toLowerCase().includes(value)) ??
    sites.find((site) => site.name.toLowerCase().split(" ").some((part) => part.length > 4 && value.includes(part))) ??
    null
  );
}

export function listSites(): AdminSite[] {
  ensureLoaded();
  return createdSites.map(applySiteOverlay);
}

function applySiteOverlay(row: AdminSite): AdminSite {
  const status = siteOverlay[row.id]?.status;
  if (!status) return row;
  return { ...row, status: status === "deactivated" ? "Deactivated" : row.status === "Never activated" ? "Never activated" : "Active" };
}

export function listListings(): AdminListing[] {
  return [];
}

export function listCollections(): AdminCollection[] {
  return [];
}

export function getSite(id: string) {
  return listSites().find((row) => row.id === id) ?? null;
}

export function getListing(id: string) {
  return listListings().find((row) => row.id === id) ?? null;
}

export function getCollection(id: string) {
  return listCollections().find((row) => row.id === id) ?? null;
}

function orgMatches(filters: AdminFilters, org: AdminOrganisation) {
  if (filters.organisationId !== "all" && org.id !== filters.organisationId) return false;
  if (filters.country !== "all" && org.country !== filters.country) return false;
  if (filters.state !== "all" && org.state !== filters.state) return false;
  if (filters.orgType !== "all" && org.type !== filters.orgType) return false;
  if (filters.role === "both") {
    return org.roles.includes("surplus_provider") && org.roles.includes("surplus_receiver");
  }
  if (filters.role !== "all" && !org.roles.includes(filters.role)) return false;
  return true;
}

export function orgActivityStatus(orgId: string): OrgActivityStatus {
  const { startDate, endDate } = periodRange("30", new Date());
  const org = getOrganisation(orgId);
  if (org?.lastLoginAt && inDateRange(org.lastLoginAt, startDate, endDate)) return "Active";
  if (listOrgUsers(orgId).some((row) => row.lastActiveAt && inDateRange(row.lastActiveAt, startDate, endDate))) {
    return "Active";
  }
  const recentSite = listSites().some((row) => row.orgId === orgId && inDateRange(row.lastActivityAt, startDate, endDate));
  if (recentSite) return "Active";
  const recentListing = listListings().some((row) => row.orgId === orgId && inDateRange(row.createdAt, startDate, endDate));
  if (recentListing) return "Active";
  const recentCollection = listCollections().some(
    (row) => (row.orgId === orgId || row.recipientOrgId === orgId) && inDateRange(row.occurredAt, startDate, endDate),
  );
  return recentCollection ? "Active" : "Inactive";
}

export function filteredOrganisations(filters: AdminFilters) {
  const query = filters.q.trim().toLowerCase();
  return listOrganisations().filter((org) => {
    if (!orgMatches(filters, org)) return false;
    if (query && !org.name.toLowerCase().includes(query)) return false;
    if (filters.accountStatus !== "all" && org.status !== filters.accountStatus) return false;
    if (filters.plan !== "all" && org.plan !== filters.plan) return false;
    if (filters.activityStatus !== "all" && orgActivityStatus(org.id).toLowerCase() !== filters.activityStatus) return false;
    return true;
  });
}

export function filteredSites(filters: AdminFilters) {
  const allowed = new Set(filteredOrganisations(filters).map((org) => org.id));
  return listSites().filter((row) => allowed.has(row.orgId));
}

export function filteredListings(filters: AdminFilters, range?: { startDate?: string; endDate?: string }) {
  const allowed = new Set(filteredOrganisations(filters).map((org) => org.id));
  const { startDate, endDate } = range ?? periodRange(filters.period);
  return listListings().filter((row) => {
    if (!allowed.has(row.orgId) || !inDateRange(row.createdAt, startDate, endDate)) return false;
    if (filters.pathway !== "all" && row.pathway !== filters.pathway) return false;
    return true;
  });
}

export function filteredCollections(filters: AdminFilters, range?: { startDate?: string; endDate?: string }) {
  const allowed = new Set(filteredOrganisations(filters).map((org) => org.id));
  const { startDate, endDate } = range ?? periodRange(filters.period);
  return listCollections().filter((row) => {
    if (!allowed.has(row.orgId) || !inDateRange(row.occurredAt, startDate, endDate)) return false;
    if (filters.pathway !== "all" && row.pathway !== filters.pathway) return false;
    return true;
  });
}

function recoveryPoints(filters: AdminFilters, range?: { startDate?: string; endDate?: string }) {
  const orgs = new Set(filteredOrganisations(filters).map((org) => org.id));
  const { startDate, endDate } = range ?? periodRange(filters.period);
  const rows: RecoveryTransaction[] = [];
  for (const row of filteredCollections(filters, { startDate, endDate })) {
    if (row.orgId === "harbour" || row.status !== "completed") continue;
    rows.push({
      id: row.id,
      occurredAt: row.occurredAt,
      kg: row.quantityKg,
      pathway: row.pathway,
      recipientId: row.orgId,
      recipientName: row.recipientName,
      snapshot: {
        groupId: "",
        groupName: "",
        territoryId: "",
        territoryName: "",
        clusterId: "",
        clusterName: "",
        siteId: row.siteId,
        siteName: "",
      },
    });
  }
  return rows;
}

function recoveredKg(filters: AdminFilters, range?: { startDate?: string; endDate?: string }) {
  return recoveryPoints(filters, range).reduce((sum, row) => sum + row.kg, 0);
}

function listingRates(listings: AdminListing[]) {
  const published = listings.filter((row) => row.status !== "cancelled");
  const claimed = published.filter((row) =>
    ["claimed", "driver_assigned", "collected", "completed"].includes(row.status),
  );
  const recovered = published.filter((row) => row.status === "collected" || row.status === "completed");
  const denom = published.length;
  return {
    published: published.length,
    claimRate: denom ? Math.round((claimed.length / denom) * 100) : 0,
    recoveryRate: denom ? Math.round((recovered.length / denom) * 100) : 0,
  };
}

function priorLabel(period: PeriodKey) {
  return period === "all" ? "prior period" : `prior ${period} days`;
}

export function buildAdminOverview(filters: AdminFilters) {
  const previousRange = previousPeriodRange(filters.period);
  const organisations = filteredOrganisations(filters);
  const sites = filteredSites(filters);
  const listings = filteredListings(filters);
  const previousListings = filteredListings(filters, previousRange);
  const collections = filteredCollections(filters);
  const previousCollections = filteredCollections(filters, previousRange);
  const currentRows = recoveryPoints(filters);
  const previousRows = recoveryPoints(filters, previousRange);
  const foodKg = currentRows.reduce((sum, row) => sum + row.kg, 0);
  const previousKg = previousRows.reduce((sum, row) => sum + row.kg, 0);
  const impact = calculateImpact(foodKg);
  const previousImpact = calculateImpact(previousKg);
  const completed = collections.filter((row) => row.status === "completed").length;
  const previousCompleted = previousCollections.filter((row) => row.status === "completed").length;
  const currentRates = listingRates(listings);
  const previousRates = listingRates(previousListings);
  const previousSites = sites.filter((site) =>
    previousRows.some((row) => row.snapshot.siteId === site.id),
  ).length;
  const currentActiveSites = sites.filter((site) =>
    currentRows.some((row) => row.snapshot.siteId === site.id),
  ).length;

  const types = ORG_TYPES.filter((type) => filters.orgType === "all" || filters.orgType === type.id).map((type) => {
    const typeFilters = { ...filters, orgType: type.id, organisationId: "all" as const };
    const typeOrgs = filteredOrganisations(typeFilters);
    const typeSites = filteredSites(typeFilters);
    const typeListings = filteredListings(typeFilters);
    const typeCollections = filteredCollections(typeFilters).filter((row) => row.status === "completed");
    const typeRows = recoveryPoints(typeFilters);
    return {
      id: type.id,
      label: type.label,
      organisations: typeOrgs.length,
      activeSites: typeSites.filter((site) => site.status === "Active").length,
      active: typeOrgs.filter((org) => org.status === "Active").length,
      listings: typeListings.length,
      claims: typeListings.filter((row) =>
        ["claimed", "driver_assigned", "collected", "completed"].includes(row.status),
      ).length,
      collections: typeCollections.length || typeRows.length,
      recoveredKg: typeRows.reduce((sum, row) => sum + row.kg, 0),
    };
  });

  const totalPathwayKg = currentRows.reduce((sum, row) => sum + row.kg, 0);
  const pathways = PATHWAYS.map((pathway) => {
    const kg = currentRows.filter((row) => row.pathway === pathway).reduce((sum, row) => sum + row.kg, 0);
    return {
      pathway,
      label: PATHWAY_LABEL[pathway],
      kg,
      percent: totalPathwayKg > 0 ? Math.round((kg / totalPathwayKg) * 100) : 0,
      color: ADMIN_PATHWAY_COLORS[pathway],
    };
  });

  const unclaimed = listings.filter((row) => row.status === "published" || row.status === "expired").length;
  const unresolved = collections.filter((row) => row.status === "scheduled" || row.status === "in_progress").length;
  const awaiting = organisations.filter((org) => org.status === "Prospect").length;
  const quiet = sites.filter((site) => site.status === "Active" && (!site.lastActivityAt || !inDateRange(site.lastActivityAt, periodRange("30").startDate, periodRange("30").endDate))).length;
  const config = 0;

  return {
    filters,
    priorLabel: priorLabel(filters.period),
    organisations,
    sites,
    listings,
    collections,
    types,
    pathways,
    recoveredKg: foodKg,
    series: impactOverTime(currentRows, filters.period),
    headlines: {
      organisations: { value: organisations.length, delta: 0 },
      sites: { value: sites.length, delta: currentActiveSites - previousSites },
      recovered: { value: foodKg, delta: foodKg - previousKg },
      collections: { value: completed || currentRows.length, delta: (completed || currentRows.length) - (previousCompleted || previousRows.length) },
      co2: { value: impact.co2AvoidedKg, delta: impact.co2AvoidedKg - previousImpact.co2AvoidedKg },
    },
    operations: {
      listingsPublished: currentRates.published,
      claimRate: currentRates.claimRate,
      claimRateDelta: currentRates.claimRate - previousRates.claimRate,
      recoveryRate: currentRates.recoveryRate,
      recoveryRateDelta: currentRates.recoveryRate - previousRates.recoveryRate,
      collectionsCompleted: completed || currentRows.length,
      collectionsDelta: (completed || currentRows.length) - (previousCompleted || previousRows.length),
    },
    attention: [
      { id: "unclaimed", label: "Unclaimed / expired listings", count: unclaimed, href: `/admin/listings${adminFiltersToQuery(filters)}` },
      { id: "overdue", label: "Overdue / unresolved collections", count: unresolved, href: `/admin/collections${adminFiltersToQuery(filters)}` },
      { id: "activation", label: "Organisations awaiting activation", count: awaiting, href: `/admin/organisations${adminFiltersToQuery(filters)}` },
      { id: "quiet", label: "Sites with no recent activity", count: quiet, href: `/admin/sites${adminFiltersToQuery(filters)}` },
      { id: "config", label: "Data / configuration issues", count: config, href: `/admin/sites${adminFiltersToQuery({ ...filters, organisationId: organisations.some((org) => org.id === "harbour") ? "harbour" : filters.organisationId })}` },
    ],
    metrics: {
      organisations: organisations.length,
      sites: sites.length,
      listings: listings.length,
      collections: completed || currentRows.length,
      recoveredKg: foodKg,
      ...impact,
    },
  };
}

export function orgCounts(orgId: string, period: PeriodKey = "30") {
  const filters: AdminFilters = { ...EMPTY_ADMIN_FILTERS, organisationId: orgId, period };
  const org = getOrganisation(orgId);
  const sites = filteredSites(filters);
  const listings = filteredListings(filters);
  const collections = filteredCollections(filters);
  return {
    sites: sites.length,
    activeSites: sites.filter((row) => row.status === "Active").length,
    users: org?.users ?? 0,
    listings: listings.length,
    collections: collections.length,
    recoveredKg: recoveredKg(filters),
    activityStatus: orgActivityStatus(orgId),
  };
}

export function buildOrgDirectory(filters: AdminFilters) {
  const organisations = filteredOrganisations(filters);
  const sites = filteredSites(filters);
  const listings = filteredListings(filters);
  const previousListings = filteredListings(filters, previousPeriodRange(filters.period));
  const collections = filteredCollections(filters);
  const previousCollections = filteredCollections(filters, previousPeriodRange(filters.period));
  const previousRange = previousPeriodRange(filters.period);
  const previousActiveSites = sites.filter((site) => inDateRange(site.lastActivityAt, previousRange.startDate, previousRange.endDate)).length;
  return {
    organisations,
    metrics: {
      organisations: organisations.length,
      activeSites: sites.filter((site) => site.status === "Active").length,
      activeSitesDelta: sites.filter((site) => site.status === "Active").length - previousActiveSites,
      activeUsers: organisations.filter((org) => org.status === "Active").reduce((sum, org) => sum + org.users, 0),
      listings: listings.length,
      listingsDelta: listings.length - previousListings.length,
      collections: collections.filter((row) => row.status === "completed").length,
      collectionsDelta: collections.filter((row) => row.status === "completed").length - previousCollections.filter((row) => row.status === "completed").length,
    },
    territories: unique(listOrganisations().map((org) => org.state)),
  };
}

export function updateOrganisation(
  id: string,
  patch: Overlay,
  actor: { name: string; email: string },
) {
  ensureLoaded();
  const current = getOrganisation(id);
  if (!current) return null;
  const next: Overlay = {
    type: patch.type ?? current.type,
    roles: patch.roles ?? current.roles,
    status: patch.status ?? current.status,
    plan: patch.plan ?? current.plan,
  };
  const changes = [
    current.type !== next.type && {
      field: "Organisation type",
      previous: orgTypeLabel(current.type),
      next: orgTypeLabel(next.type!),
    },
    participationLabel(current.roles) !== participationLabel(next.roles ?? []) && {
      field: "Participation role",
      previous: participationLabel(current.roles),
      next: participationLabel(next.roles ?? []),
    },
    current.status !== next.status && {
      field: "Account status",
      previous: current.status,
      next: next.status ?? current.status,
    },
    current.plan !== next.plan && {
      field: "Plan",
      previous: current.plan,
      next: next.plan ?? current.plan,
    },
  ].filter(Boolean) as { field: string; previous: string; next: string }[];

  overlay[id] = { ...overlay[id], ...next };
  persist();
  if (changes.length) {
    appendAdminAudit({
      actor: actor.name,
      actorEmail: actor.email,
      action: changes.length === 1 ? `Updated ${changes[0].field.toLowerCase()}` : "Updated organisation",
      organisationId: current.id,
      organisationName: current.name,
      entityType: "organisation",
      entity: current.name,
      detail: "Saveful Admin updated customer organisation data.",
      changes,
    });
  }
  emit();
  return getOrganisation(id);
}

export async function createOrganisation(
  input: ProvisionEnterpriseInput & { logoFile?: File | null },
  actor: { name: string; email: string },
) {
  const country = countryCode(input.country);
  const locale = ADMIN_COUNTRIES.find((item) => item.id === country);
  const payload = {
    enterpriseName: input.enterpriseName,
    address: input.address,
    country,
    timezone: input.timezone,
    adminFirstName: input.adminFirstName,
    adminLastName: input.adminLastName,
    adminEmail: input.adminEmail,
    adminMobile: input.adminMobile,
    currency: input.currency ?? locale?.currency,
    measurementUnit: input.measurementUnit,
    region: input.region ?? locale?.region,
  };
  let logoUrl = input.logoUrl?.trim();
  let logoFile = input.logoFile ?? null;
  if (logoFile) {
    try {
      logoUrl = (await uploadEnterpriseLogo(logoFile)).logoUrl;
      logoFile = null;
    } catch (err) {
      if (!(err instanceof ApiError) || (err.status !== 404 && err.status !== 405)) {
        throw err instanceof ApiError
          ? new ApiError(`Could not upload logo. ${err.message}`, err.status)
          : err;
      }
    }
  }
  const created = await provisionEnterprise({
    ...payload,
    logoUrl,
    logoFile,
  });
  await refreshOrganisations();
  appendAdminAudit({
    actor: actor.name,
    actorEmail: actor.email,
    action: "Created organisation",
    organisationId: String(created.organisationId),
    organisationName: input.enterpriseName.trim(),
    entityType: "organisation",
    entity: input.enterpriseName.trim(),
    entityId: created.enterpriseId,
    detail: created.message,
    changes: [
      { field: "Enterprise ID", previous: "—", next: created.enterpriseId },
      { field: "Account status", previous: "—", next: "Prospect" },
    ],
  });
  return {
    ...created,
    organisation: getOrganisation(String(created.organisationId)),
  };
}

export function createSite(
  input: { orgId: string; name: string; address: string },
  actor: { name: string; email: string },
) {
  ensureLoaded();
  const org = getOrganisation(input.orgId);
  const name = input.name.trim();
  if (!org || !name) return null;
  const id = `site-${Date.now()}`;
  const next = site(org.id, id, name, input.address.trim() || org.state, "Never activated", null);
  createdSites = [next, ...createdSites];
  persist();
  appendAdminAudit({
    actor: actor.name,
    actorEmail: actor.email,
    action: "Created site",
    organisationId: org.id,
    organisationName: org.name,
    siteId: id,
    siteName: name,
    entityType: "site",
    entity: name,
    detail: "Saveful Admin added a site to this organisation.",
    changes: [{ field: "Site", previous: "—", next: name }],
  });
  emit();
  return next;
}

export function updateSiteStatus(
  siteId: string,
  status: SiteLifecycleStatus,
  actor: { name: string; email: string },
) {
  ensureLoaded();
  const current = getSite(siteId);
  const org = current ? getOrganisation(current.orgId) : null;
  if (!current || !org) return null;
  const previous = siteLifecycle(current);
  siteOverlay[siteId] = { ...siteOverlay[siteId], status };
  persist();
  appendAdminAudit({
    actor: actor.name,
    actorEmail: actor.email,
    action: status === "deactivated" ? "Deactivated site" : "Reactivated site",
    organisationId: org.id,
    organisationName: org.name,
    siteId: current.id,
    siteName: current.name,
    entityType: "site",
    entity: current.name,
    detail: "Saveful Admin changed site status. Site status is separate from activity status.",
    changes: [{ field: "Site status", previous: previous === "deactivated" ? "Deactivated" : "Active", next: status === "deactivated" ? "Deactivated" : "Active" }],
  });
  emit();
  return getSite(siteId);
}

export type AdminSitesTableFilters = {
  q: string;
  groupId: string;
  territoryId: string;
  clusterId: string;
  siteStatus: "all" | SiteLifecycleStatus;
  activity: "all" | ActivityStatus;
  page: number;
  pageSize: 10 | 25 | 50;
};

export const EMPTY_ADMIN_SITES_FILTERS: AdminSitesTableFilters = {
  q: "",
  groupId: "all",
  territoryId: "all",
  clusterId: "all",
  siteStatus: "all",
  activity: "all",
  page: 1,
  pageSize: 10,
};

const SITE_PAGE_SIZES = [10, 25, 50] as const;

export type AdminDirectorySite = {
  id: string;
  orgId: string;
  orgName: string;
  orgType: OrgTypeId;
  name: string;
  address: string;
  siteCode: string;
  groupId: string | null;
  territoryId: string | null;
  clusterId: string | null;
  groupLabel: string;
  territoryLabel: string;
  clusterLabel: string;
  siteStatus: SiteLifecycleStatus;
  activity: ActivityStatus;
  lastActivityAt: string | null;
  recoveredKg: number;
};

export function parseAdminSitesTable(params: URLSearchParams): AdminSitesTableFilters {
  const pageSize = Number(params.get("pageSize"));
  const page = Number(params.get("page"));
  const siteStatus = params.get("status");
  const activity = params.get("activity");
  return {
    q: params.get("q") ?? "",
    groupId: params.get("group") || "all",
    territoryId: params.get("territory") || "all",
    clusterId: params.get("cluster") || "all",
    siteStatus: siteStatus === "active" || siteStatus === "deactivated" ? siteStatus : "all",
    activity:
      activity === "in_period" || activity === "none_in_period" || activity === "never_used" || activity === "never_activated"
        ? activity
        : "all",
    page: page > 0 ? page : 1,
    pageSize: SITE_PAGE_SIZES.includes(pageSize as 10) ? (pageSize as 10 | 25 | 50) : 10,
  };
}

export function adminSitesTableToQuery(filters: AdminSitesTableFilters) {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.groupId !== "all") params.set("group", filters.groupId);
  if (filters.territoryId !== "all") params.set("territory", filters.territoryId);
  if (filters.clusterId !== "all") params.set("cluster", filters.clusterId);
  if (filters.siteStatus !== "all") params.set("status", filters.siteStatus);
  if (filters.activity !== "all") params.set("activity", filters.activity);
  if (filters.page > 1) params.set("page", String(filters.page));
  if (filters.pageSize !== 10) params.set("pageSize", String(filters.pageSize));
  return params;
}

export function hasActiveAdminSitesFilters(filters: AdminSitesTableFilters) {
  return (
    Boolean(filters.q.trim()) ||
    filters.groupId !== "all" ||
    filters.territoryId !== "all" ||
    filters.clusterId !== "all" ||
    filters.siteStatus !== "all" ||
    filters.activity !== "all"
  );
}

function siteLifecycle(row: AdminSite): SiteLifecycleStatus {
  const overlayStatus = siteOverlay[row.id]?.status;
  if (overlayStatus) return overlayStatus;
  return row.status === "Deactivated" ? "deactivated" : "active";
}

function toDirectorySite(row: AdminSite, period: PeriodKey): AdminDirectorySite {
  const org = getOrganisation(row.orgId);
  const harbour = row.orgId === "harbour" ? demoNetworkSites.find((item) => item.id === row.id) : undefined;
  const siteStatus = siteLifecycle(row);
  const activatedAt = harbour?.activatedAt ?? (row.status === "Never activated" ? null : row.lastActivityAt ?? "2026-01-01");
  const lastActivityAt = harbour?.lastActivityAt ?? row.lastActivityAt;
  const activity = activityStatus(
    {
      id: row.id,
      siteCode: harbour?.siteCode ?? (row.id.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || row.id),
      siteType: "branch",
      name: row.name,
      address: row.address,
      postCode: harbour?.postCode ?? "",
      managerName: "",
      email: "",
      mobile: "",
      hasManager: true,
      isDefault: false,
      groupId: harbour?.groupId ?? null,
      territoryId: harbour?.territoryId ?? null,
      clusterId: harbour?.clusterId ?? null,
      status: siteStatus,
      activatedAt,
      lastActivityAt,
      lastListingAt: harbour?.lastListingAt ?? lastActivityAt,
    },
    period,
  );
  const recoveredKg =
    row.orgId === "harbour"
      ? foodRecoveredKg(row.id, period)
      : listCollections()
          .filter((item) => item.siteId === row.id && item.status === "completed" && inDateRange(item.occurredAt, periodRange(period).startDate, periodRange(period).endDate))
          .reduce((sum, item) => sum + item.quantityKg, 0);
  return {
    id: row.id,
    orgId: row.orgId,
    orgName: org?.name ?? row.orgId,
    orgType: org?.type ?? "food_business",
    name: row.name,
    address: row.address,
    siteCode: harbour?.siteCode ?? (row.id.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || row.id),
    groupId: harbour?.groupId ?? null,
    territoryId: harbour?.territoryId ?? null,
    clusterId: harbour?.clusterId ?? null,
    groupLabel: lookupLabel("group", harbour?.groupId),
    territoryLabel: lookupLabel("territory", harbour?.territoryId),
    clusterLabel: lookupLabel("cluster", harbour?.clusterId),
    siteStatus,
    activity,
    lastActivityAt,
    recoveredKg,
  };
}

export function buildSitesDirectory(adminFilters: AdminFilters, table: AdminSitesTableFilters) {
  const scope: AdminFilters = { ...adminFilters, q: "" };
  const query = table.q.trim().toLowerCase();
  const mapped = filteredSites(scope).map((row) => toDirectorySite(row, adminFilters.period));
  const scoped = mapped.filter((row) => {
    if (table.groupId !== "all" && row.groupId !== table.groupId) return false;
    if (table.territoryId !== "all" && row.territoryId !== table.territoryId) return false;
    if (table.clusterId !== "all" && row.clusterId !== table.clusterId) return false;
    if (query && !`${row.name} ${row.siteCode} ${row.orgName}`.toLowerCase().includes(query)) return false;
    return true;
  });
  const rows = scoped.filter((row) => {
    if (table.siteStatus !== "all" && row.siteStatus !== table.siteStatus) return false;
    if (table.activity !== "all" && row.activity !== table.activity) return false;
    return true;
  });
  const counts = {
    total: scoped.length,
    active: scoped.filter((row) => row.siteStatus === "active").length,
    noRecent: scoped.filter((row) => row.activity === "none_in_period").length,
    neverActivated: scoped.filter((row) => row.activity === "never_activated").length,
    deactivated: scoped.filter((row) => row.siteStatus === "deactivated").length,
  };
  const groups = unique(mapped.map((row) => row.groupId).filter((id): id is string => Boolean(id))).map((id) => ({
    id,
    name: lookupLabel("group", id),
  }));
  const territories = unique(mapped.map((row) => row.territoryId).filter((id): id is string => Boolean(id))).map((id) => ({
    id,
    name: lookupLabel("territory", id),
  }));
  const clusters = unique(mapped.map((row) => row.clusterId).filter((id): id is string => Boolean(id))).map((id) => ({
    id,
    name: lookupLabel("cluster", id),
  }));
  return { rows, counts, groups, territories, clusters };
}

export function exportAdminSitesCsv(rows: AdminDirectorySite[], period: PeriodKey) {
  const lines = [
    ["Site", "Site ID", "Organisation", "Address", "Group", "Territory", "Cluster", "Site status", "Activity status", "Last activity", "Food recovered"],
    ...rows.map((row) => [
      row.name,
      row.siteCode,
      row.orgName,
      row.address,
      row.groupLabel,
      row.territoryLabel,
      row.clusterLabel,
      row.siteStatus === "deactivated" ? "Deactivated" : "Active",
      ACTIVITY_LABEL[row.activity],
      formatLastActivity(row.lastActivityAt),
      row.recoveredKg > 0 ? `${row.recoveredKg}` : "—",
    ]),
  ];
  const csv = lines.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "saveful-admin-sites.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function planLabel(plan: OrgPlanId) {
  return ORG_PLANS.find((item) => item.id === plan)?.label ?? plan;
}

export function parseOrgDetailTab(value: string | null): OrgDetailTab {
  return ORG_DETAIL_TABS.some((item) => item.id === value) ? (value as OrgDetailTab) : "overview";
}

const ORG_PROFILES: Record<string, AdminOrgProfile> = {
  harbour: {
    code: "ORG-FB-0001",
    contactName: "Alex Morgan",
    contactEmail: "alex@harbourkitchen.com",
    contactPhone: "+61 400 111 222",
    joinedAt: "2026-07-01",
    contractStart: "2026-07-01",
    nextReview: "2027-07-01",
    billing: "Annual",
  },
  ozharvest: {
    code: "ORG-CH-0094",
    contactName: "Sarah Johnson",
    contactEmail: "sarah.johnson@ozharvest.org.au",
    contactPhone: "0412 345 678",
    joinedAt: "2023-05-12",
    contractStart: "2023-05-12",
    nextReview: "2026-05-12",
    billing: "Monthly",
  },
  westfield: {
    code: "ORG-FB-0018",
    contactName: "Daniel Cho",
    contactEmail: "daniel.cho@westfieldfood.com",
    contactPhone: "0401 222 333",
    joinedAt: "2024-03-08",
    contractStart: "2024-03-08",
    nextReview: "2026-03-08",
    billing: "Annual",
  },
  "farm-rescue": {
    code: "ORG-FM-0007",
    contactName: "Ellie Hart",
    contactEmail: "ellie@farmrescue.au",
    contactPhone: "0422 111 900",
    joinedAt: "2025-01-20",
    contractStart: "2025-01-20",
    nextReview: "2026-01-20",
    billing: "Monthly",
  },
  "circular-lab": {
    code: "ORG-CR-0004",
    contactName: "Mina Rao",
    contactEmail: "mina@circularfoodlab.com",
    contactPhone: "0433 555 210",
    joinedAt: "2024-11-02",
    contractStart: "2024-11-02",
    nextReview: "2025-11-02",
    billing: "Monthly",
  },
  "harbour-cafe-nz": {
    code: "ORG-FB-0102",
    contactName: "Tom Hale",
    contactEmail: "tom@harbourcafe.nz",
    contactPhone: "+64 21 000 111",
    joinedAt: "2026-08-01",
    contractStart: "2026-08-01",
    nextReview: "2027-08-01",
    billing: "Monthly",
  },
  "community-care": {
    code: "ORG-CH-0110",
    contactName: "Priya Shah",
    contactEmail: "priya@communitycare.org.au",
    contactPhone: "0418 777 201",
    joinedAt: "2024-06-14",
    contractStart: "2024-06-14",
    nextReview: "2025-06-14",
    billing: "Monthly",
  },
  "circular-renew": {
    code: "ORG-CR-0011",
    contactName: "Chris Adeyemi",
    contactEmail: "chris@circularrenew.au",
    contactPhone: "0408 333 444",
    joinedAt: "2024-09-09",
    contractStart: "2024-09-09",
    nextReview: "2025-09-09",
    billing: "Monthly",
  },
};

function isoDay(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function mapMemberStatus(status: string): AdminOrgUser["status"] {
  if (status === "DEACTIVATED") return "Deactivated";
  if (status === "INVITED") return "Invited";
  return "Active";
}

function profileFromDetail(detail: EnterpriseDetail): AdminOrgProfile {
  return {
    code: detail.enterpriseId,
    contactName: detail.primaryContactName?.trim() || "—",
    contactEmail: detail.primaryContactEmail?.trim() || "—",
    contactPhone: detail.primaryContactPhone?.trim() || "—",
    joinedAt: isoDay(detail.createdAt),
    contractStart: isoDay(detail.contract?.startDate),
    nextReview: isoDay(detail.contract?.endDate),
    billing: detail.contract?.billingFrequency || "—",
    address: detail.address?.trim() || "—",
    timezone: detail.timezone || "—",
    currency: detail.currency || "—",
    measurementUnit: detail.measurementUnit || "—",
    country: countryLabel(detail.country),
    logoUrl: detail.logoUrl,
  };
}

export async function refreshOrganisationDetail(orgId: string) {
  const detail = await getEnterprise(orgId);
  remoteOrgProfiles[orgId] = profileFromDetail(detail);
  const latestLogin = (detail.users ?? [])
    .map((row) => row.lastLoginAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;
  const onboarded = (detail.users ?? []).some((row) => row.status === "ACTIVE" || row.lastLoginAt || row.joinedAt);
  if (detail.accountStatus === "ACTIVE" || onboarded) {
    remoteOrgs = remoteOrgs.map((org) =>
      org.id === orgId
        ? {
            ...org,
            lastLoginAt: latestLogin ?? org.lastLoginAt,
            status: org.status === "Suspended" ? org.status : "Active",
          }
        : org,
    );
  } else if (latestLogin) {
    remoteOrgs = remoteOrgs.map((org) => (org.id === orgId ? { ...org, lastLoginAt: latestLogin } : org));
  }
  const members: AdminOrgUser[] = (detail.users ?? []).map((row) => ({
    id: String(row.id),
    orgId,
    name: `${row.firstName} ${row.lastName}`.trim() || row.email,
    email: row.email,
    role: row.roleLabel || row.role,
    status: mapMemberStatus(row.status),
    lastActiveAt: row.lastLoginAt ?? null,
  }));
  const seen = new Set(members.map((row) => row.email.toLowerCase()));
  const invited: AdminOrgUser[] = (detail.invitations ?? [])
    .filter((row) => !seen.has(row.email.toLowerCase()))
    .map((row) => ({
      id: `invite-${row.id}`,
      orgId,
      name: `${row.firstName} ${row.lastName}`.trim() || row.email,
      email: row.email,
      role: row.roleLabel || row.role,
      status: "Invited" as const,
      lastActiveAt: null,
    }));
  const hasUserPayload = Array.isArray(detail.users) || Array.isArray(detail.invitations);
  remoteOrgUsers[orgId] =
    members.length || invited.length
      ? [...members, ...invited]
      : !hasUserPayload && detail.primaryContactEmail
        ? [
            {
              id: `contact-${orgId}`,
              orgId,
              name: detail.primaryContactName?.trim() || detail.primaryContactEmail,
              email: detail.primaryContactEmail,
              role: "Enterprise Super Admin",
              status: "Active" as const,
              lastActiveAt: null,
            },
          ]
        : [];
  emit();
  return detail;
}

export function orgProfile(org: AdminOrganisation): AdminOrgProfile {
  return (
    remoteOrgProfiles[org.id] ??
    ORG_PROFILES[org.id] ?? {
      code: org.enterpriseId || "—",
      contactName: "—",
      contactEmail: "—",
      contactPhone: "—",
      joinedAt: "",
      contractStart: "",
      nextReview: "",
      billing: "—",
    }
  );
}

export function listOrgUsers(orgId: string): AdminOrgUser[] {
  return remoteOrgUsers[orgId] ?? [];
}

export function lastOrgActivityAt(orgId: string) {
  const dates = [
    ...listSites().filter((row) => row.orgId === orgId).map((row) => row.lastActivityAt),
    ...listListings().filter((row) => row.orgId === orgId).map((row) => row.createdAt),
    ...listCollections().filter((row) => row.orgId === orgId || row.recipientOrgId === orgId).map((row) => row.occurredAt),
  ].filter((value): value is string => Boolean(value));
  return dates.sort().at(-1) ?? null;
}

function collectionImpactRows(rows: AdminCollection[]): RecoveryTransaction[] {
  return rows
    .filter((row) => row.status === "completed")
    .map((row) => ({
      id: row.id,
      occurredAt: row.occurredAt,
      kg: row.quantityKg,
      pathway: row.pathway,
      recipientId: row.recipientOrgId ?? row.orgId,
      recipientName: row.recipientName,
      snapshot: {
        groupId: "",
        groupName: "",
        territoryId: "",
        territoryName: "",
        clusterId: "",
        clusterName: "",
        siteId: row.siteId,
        siteName: getSite(row.siteId)?.name ?? "",
      },
    }));
}

export function buildOrgDetail(orgId: string, period: PeriodKey = "30") {
  const org = getOrganisation(orgId);
  if (!org) return null;
  const allTime: AdminFilters = { ...EMPTY_ADMIN_FILTERS, organisationId: orgId, period: "all" };
  const previousRange = previousPeriodRange(period);
  const { startDate, endDate } = periodRange(period);
  const sites = listSites().filter((row) => row.orgId === orgId);
  const collections = listCollections().filter((row) => row.orgId === orgId || row.recipientOrgId === orgId);
  const periodCollections = collections.filter((row) => inDateRange(row.occurredAt, startDate, endDate));
  const previousCollections = collections.filter((row) => inDateRange(row.occurredAt, previousRange.startDate, previousRange.endDate));
  const currentRows = collectionImpactRows(periodCollections);
  const previousRows = collectionImpactRows(previousCollections);
  const allRows = collectionImpactRows(collections);
  const foodKg = currentRows.reduce((sum, row) => sum + row.kg, 0);
  const previousKg = previousRows.reduce((sum, row) => sum + row.kg, 0);
  const allKg = allRows.reduce((sum, row) => sum + row.kg, 0);
  const impact = calculateImpact(foodKg);
  const previousImpact = calculateImpact(previousKg);
  const allImpact = calculateImpact(allKg);
  const users = listOrgUsers(orgId);
  const totalPathwayKg = allKg || foodKg;
  const pathwaySource = allRows.length ? allRows : currentRows;
  const pathways = PATHWAYS.map((pathway) => {
    const kg = pathwaySource.filter((row) => row.pathway === pathway).reduce((sum, row) => sum + row.kg, 0);
    return {
      pathway,
      label: PATHWAY_LABEL[pathway],
      kg,
      percent: totalPathwayKg > 0 ? Math.round((kg / totalPathwayKg) * 100) : 0,
      color: ADMIN_PATHWAY_COLORS[pathway],
    };
  });

  const asProvider = collections.filter((row) => row.orgId === orgId && row.status === "completed");
  const asReceiver = collections.filter((row) => row.recipientOrgId === orgId && row.orgId !== orgId && row.status === "completed");
  const partnerCounts = (rows: AdminCollection[], key: "orgId" | "recipientOrgId") => {
    const counts = new Map<string, { id: string; name: string; type?: OrgTypeId; collections: number }>();
    for (const row of rows) {
      const id = key === "orgId" ? row.orgId : row.recipientOrgId;
      if (!id || id === orgId) continue;
      const partner = getOrganisation(id);
      const current = counts.get(id) ?? { id, name: partner?.name ?? row.recipientName, type: partner?.type, collections: 0 };
      current.collections += 1;
      counts.set(id, current);
    }
    return [...counts.values()].sort((a, b) => b.collections - a.collections);
  };
  const providers = partnerCounts(asReceiver, "orgId");
  const receivers = partnerCounts(asProvider, "recipientOrgId");
  const siteCounts = new Map<string, number>();
  for (const row of asProvider) {
    if (getSite(row.siteId)?.orgId !== orgId) continue;
    siteCounts.set(row.siteId, (siteCounts.get(row.siteId) ?? 0) + 1);
  }
  for (const row of asReceiver) {
    const site = matchOwnSite(orgId, row.recipientName);
    if (!site) continue;
    siteCounts.set(site.id, (siteCounts.get(site.id) ?? 0) + 1);
  }
  const ownSites = sites
    .map((site) => ({ id: site.id, name: site.name, collections: siteCounts.get(site.id) ?? 0 }))
    .sort((a, b) => b.collections - a.collections || a.name.localeCompare(b.name));
  const receiverTypes = receivers.reduce(
    (acc, item) => {
      if (item.type === "charity") acc.charities += 1;
      else if (item.type === "farmer") acc.farms += 1;
      else acc.other += 1;
      return acc;
    },
    { charities: 0, farms: 0, other: 0 },
  );

  const invited = users.filter((row) => row.status === "Invited").length;
  const recentActivity = [
    ...collections.map((row) => {
      const provider = getOrganisation(row.orgId);
      const site = getSite(row.siteId);
      const inbound = row.recipientOrgId === orgId && row.orgId !== orgId;
      return {
        id: `col-${row.id}`,
        kind: row.status === "completed" ? "Collection completed" : `Collection ${row.status.replaceAll("_", " ")}`,
        detail: inbound
          ? `${provider?.name ?? "Provider"} → ${matchOwnSite(orgId, row.recipientName)?.name ?? row.recipientName}`
          : `${site?.name ?? "Site"} → ${row.recipientName}`,
        at: row.occurredAt,
      };
    }),
    ...listListings()
      .filter((row) => row.orgId === orgId)
      .map((row) => ({
        id: `list-${row.id}`,
        kind: row.status === "claimed" ? "Listing claimed" : `Listing ${row.status.replaceAll("_", " ")}`,
        detail: `${getSite(row.siteId)?.name ?? row.food} · ${row.food}`,
        at: row.createdAt,
      })),
    ...users
      .filter((row) => row.status === "Invited")
      .map((row) => ({
        id: `user-${row.id}`,
        kind: "User invited",
        detail: row.name,
        at: lastOrgActivityAt(orgId) ?? orgProfile(org).joinedAt,
      })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 5);

  return {
    org,
    profile: orgProfile(org),
    sites,
    listings: filteredListings(allTime),
    collections: collections.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    users,
    activityStatus: orgActivityStatus(orgId),
    lastActivityAt: lastOrgActivityAt(orgId),
    priorLabel: priorLabel(period),
    period,
    recentActivity,
    headlines: {
      sites: sites.length,
      activeSites: sites.filter((site) => site.status === "Active").length,
      users: org.users,
      activeUsers: Math.max(0, org.users - invited),
      collections: periodCollections.filter((row) => row.status === "completed").length,
      collectionsDelta: periodCollections.filter((row) => row.status === "completed").length - previousCollections.filter((row) => row.status === "completed").length,
      recoveredKg: foodKg,
      recoveredDelta: foodKg - previousKg,
      co2: impact.co2AvoidedKg,
      co2Delta: impact.co2AvoidedKg - previousImpact.co2AvoidedKg,
      meals: impact.mealsCreated,
      mealsDelta: impact.mealsCreated - previousImpact.mealsCreated,
    },
    allTime: {
      recoveredKg: allKg || foodKg,
      meals: allImpact.mealsCreated || impact.mealsCreated,
      co2: allImpact.co2AvoidedKg || impact.co2AvoidedKg,
      value: allImpact.foodValue || impact.foodValue,
      collections: allRows.length || collections.filter((row) => row.status === "completed").length,
    },
    series: impactOverTime(currentRows.length ? currentRows : allRows, period),
    pathways,
    relationships: {
      isProvider: org.roles.includes("surplus_provider"),
      isReceiver: org.roles.includes("surplus_receiver"),
      collectionsAsProvider: asProvider.length,
      collectionsAsReceiver: asReceiver.length,
      providers,
      receivers,
      ownSites,
      providerCount: providers.length,
      receiverSummary: receiverTypes,
      siteCount: sites.length,
    },
  };
}

export function buildSiteDetail(siteId: string, period: PeriodKey = "30") {
  const site = getSite(siteId);
  if (!site) return null;
  const org = getOrganisation(site.orgId);
  if (!org) return null;
  const directory = toDirectorySite(site, period);
  const harbour = site.orgId === "harbour" ? demoNetworkSites.find((item) => item.id === site.id) : undefined;
  const profile = orgProfile(org);
  const { startDate, endDate } = periodRange(period);
  const listings = listListings().filter((row) => row.siteId === site.id);
  const outbound = listCollections().filter((row) => row.siteId === site.id);
  const inbound = listCollections().filter((row) => {
    if (row.recipientOrgId !== org.id || row.orgId === org.id) return false;
    return matchOwnSite(org.id, row.recipientName)?.id === site.id;
  });
  const lists =
    org.roles.includes("surplus_provider") ||
    Boolean(harbour) ||
    outbound.some((row) => row.recipientOrgId !== org.id);
  const collects = org.roles.includes("surplus_receiver") || inbound.length > 0;
  const participation: "lists" | "collects" | "both" = lists && collects ? "both" : collects ? "collects" : "lists";
  const periodOutbound = outbound.filter((row) => inDateRange(row.occurredAt, startDate, endDate) && row.status === "completed");
  const periodInbound = inbound.filter((row) => inDateRange(row.occurredAt, startDate, endDate) && row.status === "completed");
  const operational = lists && collects ? [...periodOutbound, ...periodInbound] : collects ? periodInbound : periodOutbound;
  const allOperational = lists && collects ? [...outbound, ...inbound] : collects ? inbound : outbound;
  const harbourRows = harbour
    ? recoveryTransactions.filter((row) => row.snapshot.siteId === site.id && inDateRange(row.occurredAt, startDate, endDate))
    : [];
  const currentRows = harbour ? harbourRows : collectionImpactRows(operational);
  const allRows = harbour
    ? recoveryTransactions.filter((row) => row.snapshot.siteId === site.id)
    : collectionImpactRows(allOperational);
  const foodKg = currentRows.reduce((sum, row) => sum + row.kg, 0);
  const impact = calculateImpact(foodKg);
  const pathways = PATHWAYS.map((pathway) => {
    const kg = currentRows.filter((row) => row.pathway === pathway).reduce((sum, row) => sum + row.kg, 0);
    return {
      pathway,
      label: PATHWAY_LABEL[pathway],
      kg,
      percent: foodKg > 0 ? Math.round((kg / foodKg) * 100) : 0,
      color: ADMIN_PATHWAY_COLORS[pathway],
    };
  });
  const users = listOrgUsers(org.id)
    .filter((row, index) => {
      if (!harbour) return index < 6;
      const assigned = demoUsers.find((user) => user.id === row.id)?.siteId;
      return assigned === site.id || assigned === "all";
    })
    .map((row) => {
      const assigned = demoUsers.find((user) => user.id === row.id);
      return {
        ...row,
        scope: assigned?.site === "All sites" || row.role === "Organisation admin" || row.role === "Head admin" ? "All sites" : site.name,
      };
    });
  const lastUserActivityAt =
    users
      .map((row) => row.lastActiveAt)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null;
  const createdAt = harbour?.activatedAt ?? profile.joinedAt;
  const recentSource = [...outbound, ...inbound]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .filter((row) => inDateRange(row.occurredAt, startDate, endDate))
    .slice(0, 5);
  const recent = recentSource.length
    ? recentSource.map((row) => ({
        id: row.id,
        date: new Date(row.occurredAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
        activity: PATHWAY_LABEL[row.pathway],
        food: row.food,
        quantity: formatKg(row.quantityKg),
        recipient: row.recipientName,
        status: row.status === "completed" ? "Completed" : row.status.replaceAll("_", " "),
        href: `/admin/collections/${row.id}`,
      }))
    : harbourRows.slice(0, 5).map((row) => ({
        id: row.id,
        date: new Date(row.occurredAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
        activity: PATHWAY_LABEL[row.pathway],
        food: foodCategoryFor(row),
        quantity: formatKg(row.kg),
        recipient: row.recipientName,
        status: formatLastActivity(row.occurredAt) === "Today" || formatLastActivity(row.occurredAt) === "Yesterday" ? "Claimed" : "Completed",
        href: `/admin/collections`,
      }));
  const audit = listAdminAudit({ q: "", period: "all", organisationId: org.id, page: 1 }).filter(
    (row) => row.siteId === site.id || row.entity === site.name,
  );
  const activityFeed = harbour
    ? [
        ...activityForSite(site.id).map((row) => ({
          id: row.id,
          type: row.type,
          time: row.time,
          title: row.title,
          body: row.body,
          href: row.type === "Collection" ? `/admin/collections` : `/admin/audit`,
        })),
        ...audit.slice(0, 4).map((row) => ({
          id: `audit-${row.id}`,
          type: "Alert" as const,
          time: formatLastActivity(row.at),
          title: row.action,
          body: row.detail,
          href: `/admin/audit`,
        })),
      ]
    : [
        ...[...outbound, ...inbound].slice(0, 12).map((row) => ({
          id: `col-${row.id}`,
          type: "Collection" as const,
          time: formatLastActivity(row.occurredAt),
          title: `${site.name} collection ${row.status === "completed" ? "completed" : row.status.replaceAll("_", " ")}`,
          body: `${row.food} · ${formatKg(row.quantityKg)} went to ${row.recipientName}.`,
          href: `/admin/collections/${row.id}`,
        })),
        ...listings.slice(0, 8).map((row) => ({
          id: `list-${row.id}`,
          type: "Listing" as const,
          time: formatLastActivity(row.createdAt),
          title: `${row.code} ${row.status.replaceAll("_", " ")}`,
          body: `${row.food} listed from ${site.name}.`,
          href: `/admin/listings/${row.id}`,
        })),
        ...audit.slice(0, 6).map((row) => ({
          id: `audit-${row.id}`,
          type: "Alert" as const,
          time: formatLastActivity(row.at),
          title: row.action,
          body: row.detail,
          href: `/admin/audit`,
        })),
      ].slice(0, 20);
  const notifications = [
    directory.activity === "never_activated" ? "Site created but has not gone live on Saveful." : null,
    directory.activity === "none_in_period" ? "No listing or collection activity in the selected period." : null,
    directory.siteStatus === "deactivated" ? "Site is deactivated. Historical recovery records stay unchanged." : null,
    harbour && !harbour.hasManager ? "No site manager assigned." : null,
  ].filter((value): value is string => Boolean(value));

  return {
    site,
    org,
    profile,
    directory,
    harbour,
    participation,
    createdAt,
    lastActivityAt: directory.lastActivityAt,
    lastUserActivityAt,
    users,
    listings,
    collections: [...outbound, ...inbound].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    impact: {
      foodKg,
      mealsCreated: impact.mealsCreated,
      co2AvoidedKg: impact.co2AvoidedKg,
      foodValue: impact.foodValue,
      collections: currentRows.length,
      organisations: new Set(currentRows.map((row) => row.recipientName)).size,
    },
    pathways,
    foods: foodInsights(currentRows),
    organisations: organisationInsights(currentRows),
    series: impactOverTime(currentRows.length ? currentRows : allRows, period),
    recent,
    activityFeed,
    notifications,
    audit,
    ops: harbour
      ? {
          primaryContact: harbour.primaryContact || (harbour.hasManager ? harbour.managerName : profile.contactName),
          siteAdmin: harbour.hasManager ? harbour.managerName : profile.contactName,
          collectionHours: "Mon–Fri 2:00 pm – 5:00 pm",
          collectionInstructions:
            harbour.collectionInstructions ||
            "Ask for the kitchen manager on arrival. Historical recovery records stay unchanged if this site is reassigned.",
          phone: harbour.mobile && harbour.mobile !== "-" ? harbour.mobile : "",
        }
      : {
          primaryContact: profile.contactName,
          siteAdmin: users[0]?.name ?? profile.contactName,
          collectionHours: "As arranged with the organisation",
          collectionInstructions: "Ask for the site contact on arrival.",
          phone: profile.contactPhone,
        },
  };
}

export function roleShortLabel(roles: ParticipationRoleId[]) {
  const label = participationLabel(roles);
  if (label === "Surplus provider") return "Provider";
  if (label === "Surplus receiver") return "Receiver";
  return label;
}

export function pathwayLabel(pathway: RecoveryPathway) {
  return PATHWAY_LABEL[pathway];
}

export { ORG_TYPES as ADMIN_ORG_TYPES };
