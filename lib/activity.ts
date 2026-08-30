"use client";

import { useSyncExternalStore } from "react";
import type { ApiFoodListing } from "@/lib/api";
import { daysAgoIso, inDateRange, liveToday, periodRange } from "@/lib/dates";
import { formatKg } from "@/lib/impact";
import { demoNetworkSites } from "@/lib/network";
import { PATHWAY_LABEL } from "@/lib/networkQuery";
import { getUnit, listUnits, resolveSite } from "@/lib/orgStructure";
import { siteInScope } from "@/lib/scope";
import { listUsers, roleLabel } from "@/lib/users";
import type {
  AccessScope,
  ActivityCollection,
  ActivityCollectionStatus,
  ActivityListing,
  ActivityListingStatus,
  PeriodKey,
  RecoveryPathway,
} from "@/types/enterprise";

export const LISTING_STATUSES: { id: ActivityListingStatus; label: string }[] = [
  { id: "published", label: "Published" },
  { id: "claimed", label: "Claimed" },
  { id: "driver_assigned", label: "Driver assigned" },
  { id: "collected", label: "Collected" },
  { id: "completed", label: "Completed" },
  { id: "expired", label: "Expired" },
  { id: "cancelled", label: "Cancelled" },
];

export const COLLECTION_STATUSES: { id: ActivityCollectionStatus; label: string }[] = [
  { id: "scheduled", label: "Scheduled" },
  { id: "in_progress", label: "In progress" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

export const ACTIVITY_PATHWAYS: { id: RecoveryPathway; label: string }[] = [
  { id: "people", label: PATHWAY_LABEL.people },
  { id: "livestock", label: PATHWAY_LABEL.livestock },
  { id: "circular", label: PATHWAY_LABEL.circular },
  { id: "bioenergy", label: PATHWAY_LABEL.bioenergy },
];

const FOOD: Record<RecoveryPathway, string[]> = {
  people: ["Prepared meals", "Bread and pastries", "Fresh produce", "Dairy surplus"],
  livestock: ["Vegetable trimmings", "Food scraps", "Bakery leftovers"],
  circular: ["Used cooking oil", "Coffee grounds"],
  bioenergy: ["Mixed surplus", "Organic waste"],
};

const RECIPIENTS = [
  "OzHarvest Sydney",
  "Foodbank NSW",
  "Inner West Community Kitchen",
  "Western Sydney Farm Rescue",
  "Livestock Feed Co-op",
  "Circular Food Lab",
  "Sydney Bioenergy",
];

const DRIVERS = ["Priya Nair", "Jamie Chen", "Sam Reid", "Morgan Hale", "Chris Adeyemi"];

const SITES = demoNetworkSites.filter((site) => site.activatedAt && site.status === "active");

function siteOrg(siteId: string) {
  const site = demoNetworkSites.find((item) => item.id === siteId);
  if (!site) {
    return {
      siteId,
      siteName: "Unknown site",
      groupId: "",
      groupName: "",
      territoryId: "",
      territoryName: "",
      clusterId: "",
      clusterName: "",
    };
  }
  const current = resolveSite(site);
  return {
    siteId: current.id,
    siteName: current.name,
    groupId: current.groupId ?? "",
    groupName: getUnit("group", current.groupId)?.name ?? "",
    territoryId: current.territoryId ?? "",
    territoryName: getUnit("territory", current.territoryId)?.name ?? "",
    clusterId: current.clusterId ?? "",
    clusterName: getUnit("cluster", current.clusterId)?.name ?? "",
  };
}

function foodCategory(food: string, pathway: RecoveryPathway) {
  if (food.toLowerCase().includes("meal")) return "Prepared food";
  if (food.toLowerCase().includes("bread") || food.toLowerCase().includes("pastr") || food.toLowerCase().includes("bakery")) {
    return "Bakery";
  }
  if (food.toLowerCase().includes("produce")) return "Produce";
  if (food.toLowerCase().includes("dairy")) return "Dairy";
  if (pathway === "circular") return "Circular recovery";
  if (pathway === "bioenergy") return "Organic waste";
  if (pathway === "livestock") return "Livestock feed";
  return "Surplus food";
}

function listingNotes(food: string, pathway: RecoveryPathway) {
  if (pathway === "people" && food.toLowerCase().includes("meal")) {
    return "Meals packed in sealed containers. Ready to eat.";
  }
  if (pathway === "people") return "Surplus packed and labelled for food rescue collection.";
  if (pathway === "livestock") return "Separated food scraps ready for livestock feed collection.";
  if (pathway === "circular") return "Stored for higher-value / circular recovery.";
  return "Organic surplus ready for collection.";
}

function listing(
  index: number,
  siteId: string,
  daysBack: number,
  pathway: RecoveryPathway,
  status: ActivityListingStatus,
  quantityKg: number,
  claimedKg = 0,
  collectionIds: string[] = [],
): ActivityListing {
  const org = siteOrg(siteId);
  const foods = FOOD[pathway];
  const food = foods[index % foods.length];
  const createdAt = daysAgoIso(daysBack);
  const day = createdAt.slice(0, 10);
  return {
    id: `lst-${index}`,
    code: `SF${12400 + index}`,
    ...org,
    food,
    category: foodCategory(food, pathway),
    pathway,
    quantityKg,
    claimedKg,
    status,
    createdAt,
    pickupFrom: `${day}T14:00:00+10:00`,
    pickupTo: `${day}T17:00:00+10:00`,
    notes: listingNotes(food, pathway),
    collectionIds,
  };
}

function collection(
  index: number,
  listingId: string,
  listingCode: string,
  siteId: string,
  daysBack: number,
  pathway: RecoveryPathway,
  status: ActivityCollectionStatus,
  quantityKg: number,
  food: string,
): ActivityCollection {
  const org = siteOrg(siteId);
  const site = demoNetworkSites.find((item) => item.id === siteId);
  const confirmer = site?.managerName && site.managerName !== "Head office" ? `${site.managerName} — ${site.name}` : site?.name ?? null;
  return {
    id: `col-${index}`,
    code: `CL${8300 + index}`,
    listingId,
    listingCode,
    ...org,
    food,
    pathway,
    quantityKg,
    recipientName: RECIPIENTS[index % RECIPIENTS.length],
    driverName: status === "scheduled" ? null : DRIVERS[index % DRIVERS.length],
    confirmedBy: status === "completed" ? confirmer : null,
    notes: listingNotes(food, pathway),
    status,
    occurredAt: daysAgoIso(daysBack),
  };
}

const seeds: { listing: ActivityListing; collections: ActivityCollection[] }[] = [];

function add(
  listingRow: ActivityListing,
  collectionRows: ActivityCollection[] = [],
) {
  listingRow.collectionIds = collectionRows.map((row) => row.id);
  seeds.push({ listing: listingRow, collections: collectionRows });
}

const siteIds = SITES.map((site) => site.id);
const pickSite = (index: number) => siteIds[index % siteIds.length] ?? "";

export let activityListings: ActivityListing[] = seeds.map((item) => item.listing);
export let activityCollections: ActivityCollection[] = seeds.flatMap((item) => item.collections);

const listeners = new Set<() => void>();
let version = 0;
const statusOverrides = new Map<string, ActivityListingStatus>();
const collectionOverrides = new Map<string, ActivityCollectionStatus>();

function emit() {
  version += 1;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useActivityVersion() {
  return useSyncExternalStore(subscribe, () => version, () => 0);
}

function livePathway(row: ApiFoodListing): RecoveryPathway {
  const pathway = (row.recoveryPathway || "").toUpperCase();
  if (pathway === "LIVESTOCK_FEED") return "livestock";
  if (pathway === "CIRCULAR_RECOVERY") return "circular";
  if (pathway === "BIOENERGY") return "bioenergy";
  const type = (row.listingType || "").toUpperCase();
  if (type === "ANIMAL") return "livestock";
  return "people";
}

function liveListingStatus(row: ApiFoodListing): ActivityListingStatus {
  const status = (row.status || "").toUpperCase();
  const claims = row.foodClaims ?? [];
  const hasDriver = claims.some((claim) => (claim.driverPickups ?? []).some((pickup) => pickup.status !== "CANCELLED"));
  const hasCollected = claims.some((claim) => (claim.status || "").toUpperCase() === "COLLECTED");
  if (status === "CANCELLED") return "cancelled";
  if (status === "EXPIRED") return "expired";
  if (hasCollected) return claims.every((claim) => (claim.status || "").toUpperCase() === "COLLECTED") ? "completed" : "collected";
  if (status === "CLAIMED" || status === "PARTIAL") return hasDriver ? "driver_assigned" : "claimed";
  if (hasDriver) return "driver_assigned";
  return "published";
}

function liveCollectionStatus(status: string): ActivityCollectionStatus {
  const value = status.toUpperCase();
  if (value === "COLLECTED") return "completed";
  if (value === "CONFIRMED") return "in_progress";
  if (value === "CANCELLED") return "cancelled";
  return "scheduled";
}

function liveFoodLabel(row: ApiFoodListing) {
  const names = (row.foodItems ?? []).map((item) => item.name?.trim()).filter(Boolean);
  return names.join(", ") || "Food listing";
}

function liveDriverName(claim: NonNullable<ApiFoodListing["foodClaims"]>[number]) {
  const driver = claim.driverPickups?.[0]?.driver;
  if (!driver) return null;
  const name = [driver.firstName, driver.lastName].filter(Boolean).join(" ").trim();
  return name || null;
}

export function replaceActivityFromListings(rows: ApiFoodListing[]) {
  const listings: ActivityListing[] = [];
  const collections: ActivityCollection[] = [];
  for (const row of rows) {
    const org = siteOrg(String(row.siteId));
    const food = liveFoodLabel(row);
    const pathway = livePathway(row);
    const listingId = String(row.id);
    const claimIds = (row.foodClaims ?? [])
      .filter((claim) => (claim.status || "").toUpperCase() !== "CANCELLED")
      .map((claim) => String(claim.id));
    listings.push({
      id: listingId,
      code: `LST-${String(row.id).padStart(5, "0")}`,
      siteId: org.siteId,
      siteName: org.siteName,
      groupId: org.groupId,
      groupName: org.groupName,
      territoryId: org.territoryId,
      territoryName: org.territoryName,
      clusterId: org.clusterId,
      clusterName: org.clusterName,
      food,
      category: row.foodItems?.[0]?.category || foodCategory(food, pathway),
      pathway,
      quantityKg: row.totalQtyKg ?? 0,
      claimedKg: (row.foodClaims ?? []).reduce(
        (sum, claim) => sum + (claim.claimItems ?? []).reduce((inner, item) => inner + (item.qtyKg ?? 0), 0),
        0,
      ),
      status: liveListingStatus(row),
      createdAt: row.createdAt,
      pickupFrom: row.pickupFromTime ?? row.createdAt,
      pickupTo: row.pickupByTime ?? row.createdAt,
      notes: "",
      collectionIds: claimIds,
    });
    for (const claim of row.foodClaims ?? []) {
      if ((claim.status || "").toUpperCase() === "CANCELLED") continue;
      const kg = (claim.claimItems ?? []).reduce((sum, item) => sum + (item.qtyKg ?? 0), 0);
      collections.push({
        id: String(claim.id),
        code: `COL-${String(claim.id).padStart(5, "0")}`,
        listingId,
        listingCode: `LST-${String(row.id).padStart(5, "0")}`,
        siteId: org.siteId,
        siteName: org.siteName,
        groupId: org.groupId,
        groupName: org.groupName,
        territoryId: org.territoryId,
        territoryName: org.territoryName,
        clusterId: org.clusterId,
        clusterName: org.clusterName,
        food,
        pathway,
        quantityKg: kg || row.totalQtyKg || 0,
        recipientName: claim.claimantOrg?.name || "Recipient",
        driverName: liveDriverName(claim),
        confirmedBy: claim.confirmedAt ? claim.claimantOrg?.name || null : null,
        notes: "",
        status: liveCollectionStatus(claim.status),
        occurredAt: claim.collectedAt || claim.confirmedAt || claim.createdAt || row.createdAt,
      });
    }
  }
  activityListings = listings;
  activityCollections = collections;
  emit();
}

function listingRecord(row: ActivityListing): ActivityListing {
  const status = statusOverrides.get(row.id);
  return status ? { ...row, status } : row;
}

export const OPEN_LISTING_STATUSES: ActivityListingStatus[] = ["published", "claimed", "driver_assigned"];

export function cancelListing(id: string) {
  const row = activityListings.find((item) => item.id === id);
  if (!row || !OPEN_LISTING_STATUSES.includes(listingRecord(row).status)) {
    return { ok: false as const, error: "Only open listings can be cancelled." };
  }
  statusOverrides.set(id, "cancelled");
  emit();
  return { ok: true as const };
}

function collectionRecord(row: ActivityCollection): ActivityCollection {
  const status = collectionOverrides.get(row.id);
  return status ? { ...row, status } : row;
}

export const OPEN_COLLECTION_STATUSES: ActivityCollectionStatus[] = ["scheduled", "in_progress"];

export function cancelCollection(id: string) {
  const row = activityCollections.find((item) => item.id === id);
  if (!row || !OPEN_COLLECTION_STATUSES.includes(collectionRecord(row).status)) {
    return { ok: false as const, error: "Only open collections can be cancelled." };
  }
  collectionOverrides.set(id, "cancelled");
  emit();
  return { ok: true as const };
}

export type ActivityTab = "listings" | "collections";

export type ActivityFilters = {
  tab: ActivityTab;
  q: string;
  period: PeriodKey;
  groupId: string;
  territoryId: string;
  clusterId: string;
  siteId: string;
  pathway: "all" | RecoveryPathway;
  status: string;
  summary: string;
  page: number;
  pageSize: 10 | 25 | 50;
};

export const EMPTY_ACTIVITY_FILTERS: ActivityFilters = {
  tab: "listings",
  q: "",
  period: "30",
  groupId: "all",
  territoryId: "all",
  clusterId: "all",
  siteId: "all",
  pathway: "all",
  status: "all",
  summary: "all",
  page: 1,
  pageSize: 10,
};

export function parseActivityFilters(params: URLSearchParams): ActivityFilters {
  const page = Number(params.get("page"));
  const pageSize = Number(params.get("pageSize"));
  return {
    tab: params.get("tab") === "collections" ? "collections" : "listings",
    q: params.get("q") ?? "",
    period: (params.get("period") as PeriodKey) || "30",
    groupId: params.get("group") || "all",
    territoryId: params.get("territory") || "all",
    clusterId: params.get("cluster") || "all",
    siteId: params.get("site") || "all",
    pathway: (params.get("pathway") as ActivityFilters["pathway"]) || "all",
    status: params.get("status") || "all",
    summary: params.get("summary") || "all",
    page: page > 0 ? page : 1,
    pageSize: pageSize === 25 || pageSize === 50 ? pageSize : 10,
  };
}

export function activityFiltersToQuery(filters: ActivityFilters) {
  const params = new URLSearchParams();
  if (filters.tab !== "listings") params.set("tab", filters.tab);
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.period !== "30") params.set("period", filters.period);
  if (filters.groupId !== "all") params.set("group", filters.groupId);
  if (filters.territoryId !== "all") params.set("territory", filters.territoryId);
  if (filters.clusterId !== "all") params.set("cluster", filters.clusterId);
  if (filters.siteId !== "all") params.set("site", filters.siteId);
  if (filters.pathway !== "all") params.set("pathway", filters.pathway);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.summary !== "all") params.set("summary", filters.summary);
  if (filters.page > 1) params.set("page", String(filters.page));
  if (filters.pageSize !== 10) params.set("pageSize", String(filters.pageSize));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function hasActiveActivityFilters(filters: ActivityFilters) {
  return (
    Boolean(filters.q.trim()) ||
    filters.period !== "30" ||
    filters.groupId !== "all" ||
    filters.territoryId !== "all" ||
    filters.clusterId !== "all" ||
    filters.siteId !== "all" ||
    filters.pathway !== "all" ||
    filters.status !== "all" ||
    filters.summary !== "all"
  );
}

function matchesOrg(
  row: { siteId: string; groupId: string; territoryId: string; clusterId: string },
  filters: ActivityFilters,
  scope: AccessScope,
) {
  const site = demoNetworkSites.find((item) => item.id === row.siteId);
  if (site && !siteInScope(site, scope)) return false;
  if (!site) {
    if (scope.siteIds && !scope.siteIds.includes(row.siteId)) return false;
    if (scope.groupIds && row.groupId && !scope.groupIds.includes(row.groupId)) return false;
    if (scope.territoryIds && row.territoryId && !scope.territoryIds.includes(row.territoryId)) return false;
    if (scope.clusterIds && row.clusterId && !scope.clusterIds.includes(row.clusterId)) return false;
  }
  if (filters.groupId !== "all" && row.groupId !== filters.groupId) return false;
  if (filters.territoryId !== "all" && row.territoryId !== filters.territoryId) return false;
  if (filters.clusterId !== "all" && row.clusterId !== filters.clusterId) return false;
  if (filters.siteId !== "all" && row.siteId !== filters.siteId) return false;
  return true;
}

function matchesPathwayAndPeriod(
  pathway: RecoveryPathway,
  iso: string,
  filters: ActivityFilters,
) {
  if (filters.pathway !== "all" && pathway !== filters.pathway) return false;
  const { startDate, endDate } = periodRange(filters.period, liveToday());
  return inDateRange(iso, startDate, endDate);
}

function listingStatusMatch(status: ActivityListingStatus, filters: ActivityFilters) {
  const key = filters.summary !== "all" ? filters.summary : filters.status;
  if (key === "all") return true;
  if (key === "claimed") return status === "claimed" || status === "driver_assigned";
  return status === key;
}

function collectionStatusMatch(status: ActivityCollectionStatus, filters: ActivityFilters) {
  const key = filters.summary !== "all" ? filters.summary : filters.status;
  if (key === "all") return true;
  return status === key;
}

export function filterActivityListings(filters: ActivityFilters, scope: AccessScope) {
  const query = filters.q.trim().toLowerCase();
  return activityListings
    .map(listingRecord)
    .filter((row) => {
    if (!matchesOrg(row, filters, scope)) return false;
    if (!matchesPathwayAndPeriod(row.pathway, row.createdAt, filters)) return false;
    if (!listingStatusMatch(row.status, filters)) return false;
    if (query && !`${row.code} ${row.food} ${row.siteName}`.toLowerCase().includes(query)) return false;
    return true;
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function filterActivityCollections(filters: ActivityFilters, scope: AccessScope) {
  const query = filters.q.trim().toLowerCase();
  return activityCollections.map(collectionRecord).filter((row) => {
    if (!matchesOrg(row, filters, scope)) return false;
    if (!matchesPathwayAndPeriod(row.pathway, row.occurredAt, filters)) return false;
    if (!collectionStatusMatch(row.status, filters)) return false;
    if (query && !`${row.code} ${row.food} ${row.siteName} ${row.recipientName}`.toLowerCase().includes(query)) return false;
    return true;
  }).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

export function listingSummaryCounts(filters: ActivityFilters, scope: AccessScope) {
  const base = { ...filters, status: "all", summary: "all" };
  const rows = filterActivityListings(base, scope);
  return {
    total: rows.length,
    published: rows.filter((row) => row.status === "published").length,
    claimed: rows.filter((row) => row.status === "claimed" || row.status === "driver_assigned").length,
    completed: rows.filter((row) => row.status === "completed").length,
  };
}

export function collectionSummaryCounts(filters: ActivityFilters, scope: AccessScope) {
  const base = { ...filters, status: "all", summary: "all" };
  const rows = filterActivityCollections(base, scope);
  return {
    total: rows.length,
    scheduled: rows.filter((row) => row.status === "scheduled").length,
    inProgress: rows.filter((row) => row.status === "in_progress").length,
    completed: rows.filter((row) => row.status === "completed").length,
  };
}

export function activityFilterOptions(scope: AccessScope) {
  const sites = demoNetworkSites.filter((site) => siteInScope(site, scope));
  return {
    groups: listUnits("group").filter((unit) => sites.some((site) => resolveSite(site).groupId === unit.id)),
    territories: listUnits("territory").filter((unit) => sites.some((site) => resolveSite(site).territoryId === unit.id)),
    clusters: listUnits("cluster").filter((unit) => sites.some((site) => resolveSite(site).clusterId === unit.id)),
    sites: sites.map((site) => ({ id: site.id, name: site.name })),
  };
}

export function getListing(id: string) {
  const row = activityListings.find((item) => item.id === id);
  return row ? listingRecord(row) : null;
}

export type EnterpriseActivityEvent = {
  id: string;
  at: string;
  kind: string;
  detail: string;
  type: string;
  href: string;
};

function listingEventKind(status: ActivityListingStatus) {
  if (status === "claimed") return "Listing claimed";
  if (status === "published") return "Listing published";
  if (status === "collected" || status === "completed") return "Listing collected";
  if (status === "driver_assigned") return "Driver assigned";
  return `Listing ${status.replaceAll("_", " ")}`;
}

export function listEnterpriseActivity(filters: ActivityFilters, scope: AccessScope): EnterpriseActivityEvent[] {
  const { startDate, endDate } = periodRange(filters.period, liveToday());
  const inPeriod = (iso: string) => Boolean(iso) && (filters.period === "all" || inDateRange(iso, startDate, endDate));
  const items: EnterpriseActivityEvent[] = [];

  for (const site of demoNetworkSites) {
    if (!siteInScope(site, scope)) continue;
    if (filters.siteId !== "all" && site.id !== filters.siteId) continue;
    const at = site.createdAt || site.activatedAt || "";
    if (!inPeriod(at)) continue;
    items.push({
      id: `site-${site.id}`,
      at,
      kind: "Site added",
      detail: site.address ? `${site.name} · ${site.address}` : site.name,
      type: "Site",
      href: `/sites/${site.id}`,
    });
  }

  for (const user of listUsers()) {
    const isSuper = user.role === "enterprise_super_admin";
    if (inPeriod(user.invitedAt || user.lastActiveAt || "")) {
      items.push({
        id: `user-${user.id}`,
        at: user.invitedAt || user.lastActiveAt || "",
        kind:
          user.status === "invited"
            ? isSuper
              ? "Super Admin invited"
              : "User invited"
            : isSuper
              ? "Super Admin added"
              : "User added",
        detail: `${user.name} · ${roleLabel(user.role)}`,
        type: "User",
        href: "/users",
      });
    }
    if (user.lastActiveAt && user.status !== "invited" && inPeriod(user.lastActiveAt)) {
      items.push({
        id: `login-${user.id}`,
        at: user.lastActiveAt,
        kind: "User signed in",
        detail: `${user.name} · ${roleLabel(user.role)}`,
        type: "User",
        href: "/users",
      });
    }
  }

  for (const listing of activityListings.map(listingRecord)) {
    if (!listingInScope(listing, scope)) continue;
    if (!matchesOrg(listing, filters, scope)) continue;
    if (!inPeriod(listing.createdAt)) continue;
    items.push({
      id: `list-${listing.id}`,
      at: listing.createdAt,
      kind: listingEventKind(listing.status),
      detail: `${listing.siteName} · ${listing.food}`,
      type: "Listing",
      href: `/activity/listings/${listing.id}`,
    });
  }

  for (const collection of activityCollections.map(collectionRecord)) {
    if (!matchesOrg(collection, filters, scope)) continue;
    if (!inPeriod(collection.occurredAt)) continue;
    items.push({
      id: `col-${collection.id}`,
      at: collection.occurredAt,
      kind: collection.status === "completed" ? "Collection completed" : `Collection ${collection.status.replaceAll("_", " ")}`,
      detail: `${collection.siteName} · ${collection.food}`,
      type: "Collection",
      href: `/activity/collections/${collection.id}`,
    });
  }

  return items.sort((left, right) => right.at.localeCompare(left.at));
}

export function listingInScope(listing: ActivityListing, scope: AccessScope) {
  const site = demoNetworkSites.find((item) => item.id === listing.siteId);
  if (site) return siteInScope(site, scope);
  if (scope.siteIds) return scope.siteIds.includes(listing.siteId);
  return scope.groupIds == null && scope.territoryIds == null && scope.clusterIds == null && scope.siteIds == null;
}

export const LISTING_JOURNEY_STEPS = [
  { id: "published", label: "Published" },
  { id: "claimed", label: "Claimed" },
  { id: "driver_assigned", label: "Driver assigned" },
  { id: "collected", label: "Collected" },
  { id: "completed", label: "Completed" },
] as const;

const JOURNEY_RANK: Record<ActivityListingStatus, number> = {
  published: 0,
  claimed: 1,
  driver_assigned: 2,
  collected: 3,
  completed: 4,
  expired: 0,
  cancelled: 0,
};

function plusMinutes(iso: string, minutes: number) {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

export function listingJourney(listing: ActivityListing, collections: ActivityCollection[]) {
  const rank = JOURNEY_RANK[listing.status];
  const terminal = listing.status === "expired" || listing.status === "cancelled";
  const completed = collections
    .filter((row) => row.status === "completed")
    .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));
  const collectedAt =
    completed[0]?.occurredAt ?? (rank >= 3 && !terminal ? plusMinutes(listing.createdAt, 5 * 60 + 42) : null);
  const completedAt = completed.length
    ? plusMinutes(completed[completed.length - 1].occurredAt, 6)
    : listing.status === "completed"
      ? plusMinutes(listing.createdAt, 6 * 60)
      : null;

  const at: Record<(typeof LISTING_JOURNEY_STEPS)[number]["id"], string | null> = {
    published: listing.createdAt,
    claimed: !terminal && rank >= 1 ? plusMinutes(listing.createdAt, 26) : null,
    driver_assigned: !terminal && rank >= 2 ? plusMinutes(listing.createdAt, 160) : null,
    collected: collectedAt,
    completed: completedAt,
  };

  return LISTING_JOURNEY_STEPS.map((step, index) => ({
    ...step,
    at: at[step.id],
    reached: terminal ? step.id === "published" : rank >= index,
  }));
}

export function listingCollectedKg(listing: ActivityListing, collections: ActivityCollection[]) {
  const completed = collections.filter((row) => row.status === "completed").reduce((sum, row) => sum + row.quantityKg, 0);
  if (completed > 0) return completed;
  if (listing.status === "collected" || listing.status === "completed") return listing.claimedKg;
  return 0;
}

export function listingImpactKg(collections: ActivityCollection[]) {
  return collections.filter((row) => row.status === "completed").reduce((sum, row) => sum + row.quantityKg, 0);
}

export function listingOrgLabel(listing: Pick<ActivityListing, "groupName" | "territoryName" | "clusterName">) {
  const parts = [
    listing.groupName || null,
    listing.territoryName ? `Territory: ${listing.territoryName}` : null,
    listing.clusterName || null,
  ].filter(Boolean);
  return parts.join(" · ") || "Unassigned";
}

export function getCollection(id: string) {
  const row = activityCollections.find((item) => item.id === id);
  return row ? collectionRecord(row) : null;
}

export function collectionsForListing(listingId: string) {
  return activityCollections.filter((row) => row.listingId === listingId).map(collectionRecord);
}

export function collectionInScope(collection: ActivityCollection, scope: AccessScope) {
  const site = demoNetworkSites.find((item) => item.id === collection.siteId);
  return Boolean(site && siteInScope(site, scope));
}

export const COLLECTION_JOURNEY_STEPS = [
  { id: "claimed", label: "Claimed" },
  { id: "driver_assigned", label: "Driver assigned" },
  { id: "collected", label: "Collected" },
  { id: "completed", label: "Completed" },
] as const;

const COLLECTION_RANK: Record<ActivityCollectionStatus, number> = {
  scheduled: 0,
  in_progress: 1,
  completed: 3,
  cancelled: 0,
};

export function collectionJourney(collection: ActivityCollection) {
  const rank = COLLECTION_RANK[collection.status];
  const cancelled = collection.status === "cancelled";
  const at: Record<(typeof COLLECTION_JOURNEY_STEPS)[number]["id"], string | null> = {
    claimed: collection.occurredAt,
    driver_assigned: null,
    collected: null,
    completed: null,
  };
  if (collection.status === "in_progress") {
    at.claimed = plusMinutes(collection.occurredAt, -90);
    at.driver_assigned = collection.occurredAt;
  }
  if (collection.status === "completed") {
    at.claimed = plusMinutes(collection.occurredAt, -274);
    at.driver_assigned = plusMinutes(collection.occurredAt, -140);
    at.collected = collection.occurredAt;
    at.completed = plusMinutes(collection.occurredAt, 6);
  }

  return COLLECTION_JOURNEY_STEPS.map((step, index) => ({
    ...step,
    at: at[step.id],
    reached: cancelled ? step.id === "claimed" : rank >= index,
  }));
}

export function listingRemainingKg(listing: ActivityListing, collections: ActivityCollection[]) {
  const allocated = collections
    .filter((row) => row.status !== "cancelled")
    .reduce((sum, row) => sum + row.quantityKg, 0);
  return Math.max(0, listing.quantityKg - allocated);
}

export function listingStatusLabel(status: ActivityListingStatus) {
  return LISTING_STATUSES.find((item) => item.id === status)?.label ?? status;
}

export function collectionStatusLabel(status: ActivityCollectionStatus) {
  return COLLECTION_STATUSES.find((item) => item.id === status)?.label ?? status;
}

export function exportActivityCsv(kind: ActivityTab, rows: ActivityListing[] | ActivityCollection[]) {
  const header =
    kind === "listings"
      ? ["Listing", "Site", "Food", "Pathway", "Quantity", "Status", "Created", "Collections"]
      : ["Collection", "Listing", "Site", "Food", "Pathway", "Quantity", "Recipient", "Status", "Date"];
  const body =
    kind === "listings"
      ? (rows as ActivityListing[]).map((row) => [
          row.code,
          row.siteName,
          row.food,
          PATHWAY_LABEL[row.pathway],
          formatKg(row.quantityKg),
          listingStatusLabel(row.status),
          row.createdAt.slice(0, 10),
          String(row.collectionIds.length),
        ])
      : (rows as ActivityCollection[]).map((row) => [
          row.code,
          row.listingCode,
          row.siteName,
          row.food,
          PATHWAY_LABEL[row.pathway],
          formatKg(row.quantityKg),
          row.recipientName,
          collectionStatusLabel(row.status),
          row.occurredAt.slice(0, 10),
        ]);
  const csv = [header, ...body].map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = kind === "listings" ? "saveful-listings.csv" : "saveful-collections.csv";
  link.click();
  URL.revokeObjectURL(url);
}
