import type { ApiFoodListing } from "@/lib/api";

export type ListingStatus = "ACTIVE" | "PARTIAL" | "CLAIMED" | "COLLECTED" | "EXPIRED" | "CANCELLED";
export type ListingAudience = "human" | "animal" | "both";
export type ListingStatusFilter = "all" | "active" | "expired" | "claimed" | "collected" | "cancelled";
export type ListingAudienceFilter = "all" | "people" | "animals";

export const PEOPLE_FOOD_ITEMS = [
  "Prepared meals",
  "Bread",
  "Baked Goods",
  "Fresh fruit & veg",
  "Meat",
  "Dairy",
] as const;

export const FARM_FOOD_ITEMS = [
  "Baked goods",
  "Fruit & veg",
  "Grain / cereal",
  "Dairy",
  "Food scraps – no meat",
  "Food scraps – with meat",
] as const;

export const ALLERGEN_OPTIONS = [
  "Gluten",
  "Dairy",
  "Eggs",
  "Fish",
  "Shellfish",
  "Peanuts",
  "Tree nuts",
  "Soy",
  "Sesame",
  "Mustard",
  "Celery",
  "Lupin",
  "Molluscs",
  "Sulphites",
] as const;

export const PEOPLE_STORAGE = ["Fridge", "Freezer", "Ambient", "Hot"] as const;
export const FARM_STORAGE = [
  "Fridge",
  "Freezer",
  "Ambient",
  "Dry storage",
  "Boxed",
  "Bulk Bin",
  "Pallet",
  "Other",
] as const;
export const REHEATING_OPTIONS = ["Yes", "No", "Not sure"] as const;
export const CONTAMINANT_OPTIONS = [
  "Contains Packaging",
  "Contains meat/bone",
  "Contains plastic risk",
  "Mixed materials",
  "Contains Dairy",
  "Other (please specify)",
] as const;

export const PAST_COLLECTION_WINDOW_MESSAGE =
  "You can't set up a collection window in the past. Choose a pickup window that hasn't ended yet.";

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  ACTIVE: "Active",
  PARTIAL: "Partial",
  CLAIMED: "Claimed",
  COLLECTED: "Collected",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};

export const LISTING_STATUS_PRIORITY: Record<ListingStatus, number> = {
  ACTIVE: 0,
  PARTIAL: 1,
  CLAIMED: 2,
  COLLECTED: 3,
  EXPIRED: 4,
  CANCELLED: 5,
};

export function listingsFromPayload(payload: unknown): ApiFoodListing[] {
  if (Array.isArray(payload)) return payload as ApiFoodListing[];
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.listings)) return record.listings as ApiFoodListing[];
    if (Array.isArray(record.response)) return record.response as ApiFoodListing[];
    if (Array.isArray(record.data)) return record.data as ApiFoodListing[];
    if (record.data && typeof record.data === "object") {
      return listingsFromPayload(record.data);
    }
  }
  return [];
}

export function listingFromPayload(payload: unknown): ApiFoodListing | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  if (record.id != null || record.foodItems != null) return record as ApiFoodListing;
  if (record.listing && typeof record.listing === "object") return record.listing as ApiFoodListing;
  if (record.data && typeof record.data === "object") return listingFromPayload(record.data);
  return null;
}

export function listingTitle(row: ApiFoodListing) {
  const names = (row.foodItems ?? []).map((item) => item.name).filter(Boolean);
  return names.join(", ") || `Listing ${row.id}`;
}

export function estimateMealsSaved(totalKg: number) {
  return Math.floor((Math.max(0, totalKg || 0) * 1000) / 420);
}

export function estimateCo2AvoidedKg(totalKg: number) {
  return Math.round(Math.max(0, totalKg || 0) * 2.1 * 10) / 10;
}

export function formatCo2AvoidedKg(totalKg: number) {
  const value = estimateCo2AvoidedKg(totalKg);
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function getListingAudience(listing: ApiFoodListing): ListingAudience {
  const type = String(listing.listingType || "").toUpperCase();
  if (type === "ANIMAL") return "animal";
  if (type === "HUMAN") return "human";
  if (type === "BOTH") return "both";
  return listing.isSafeForDonation === false ? "animal" : "human";
}

export function isAnimalListing(listing: ApiFoodListing) {
  const audience = getListingAudience(listing);
  return audience === "animal" || audience === "both";
}

export function isPeopleListing(listing: ApiFoodListing) {
  const audience = getListingAudience(listing);
  return audience === "human" || audience === "both";
}

export function listingHasCollectedClaim(listing: ApiFoodListing) {
  const claims = listing.foodClaims ?? [];
  if (claims.some((claim) => String(claim.status || "").toUpperCase() === "COLLECTED")) return true;
  const claimStatus = String(listing.claimStatus || "").toUpperCase();
  return claimStatus === "COLLECTED" || claimStatus === "COMPLETED";
}

function isListingTimeWindowClosed(listing: ApiFoodListing) {
  const now = Date.now();
  const bestBefore = listing.bestBefore ? new Date(listing.bestBefore).getTime() : NaN;
  const pickupByTime = listing.pickupByTime ? new Date(listing.pickupByTime).getTime() : NaN;
  if (Number.isFinite(bestBefore) && bestBefore <= now) return true;
  if (Number.isFinite(pickupByTime) && pickupByTime <= now) return true;
  return false;
}

export function resolveListingStatus(listing: ApiFoodListing): ListingStatus {
  const status = String(listing.status || "").toUpperCase();
  const claimStatus = String(listing.claimStatus || "").toLowerCase();
  let resolved: ListingStatus = "ACTIVE";
  if (status === "ACTIVE" || status === "AVAILABLE") resolved = "ACTIVE";
  else if (status === "PARTIAL") resolved = "PARTIAL";
  else if (status === "EXPIRED") resolved = "EXPIRED";
  else if (status === "CANCELLED") resolved = "CANCELLED";
  else if (status === "COLLECTED" || status === "COMPLETED") resolved = "COLLECTED";
  else if (status === "CLAIMED") resolved = listingHasCollectedClaim(listing) ? "COLLECTED" : "CLAIMED";
  else if (["collected", "completed", "verified"].includes(claimStatus)) resolved = "COLLECTED";
  else if (["pending", "confirmed", "claimed"].includes(claimStatus)) resolved = "CLAIMED";

  if ((resolved === "ACTIVE" || resolved === "PARTIAL") && isListingTimeWindowClosed(listing)) {
    return "EXPIRED";
  }
  return resolved;
}

export function getListingStatusLabel(listing: ApiFoodListing) {
  return LISTING_STATUS_LABELS[resolveListingStatus(listing)];
}

export function isListingExpired(listing: ApiFoodListing) {
  return resolveListingStatus(listing) === "EXPIRED";
}
export function isListingActive(listing: ApiFoodListing) {
  const status = resolveListingStatus(listing);
  return status === "ACTIVE" || status === "PARTIAL";
}
export function isListingClaimed(listing: ApiFoodListing) {
  return resolveListingStatus(listing) === "CLAIMED";
}
export function isListingCollected(listing: ApiFoodListing) {
  return resolveListingStatus(listing) === "COLLECTED";
}
export function isListingCancelled(listing: ApiFoodListing) {
  return resolveListingStatus(listing) === "CANCELLED";
}

export function getTotalKg(listing: ApiFoodListing) {
  if (listing.totalQtyKg != null) return Number(listing.totalQtyKg);
  return (listing.foodItems ?? []).reduce((sum, item) => sum + Number(item.totalQtyKg || 0), 0);
}

export function getRemainingKg(listing: ApiFoodListing) {
  if (listing.remainingQtyKg != null) return Number(listing.remainingQtyKg);
  return (listing.foodItems ?? []).reduce(
    (sum, item) => sum + Number(item.remainingQtyKg ?? item.totalQtyKg ?? 0),
    0,
  );
}

export function getClaimedKg(listing: ApiFoodListing) {
  return Math.max(0, getTotalKg(listing) - getRemainingKg(listing));
}

export function getCollectedClaimKg(listing: ApiFoodListing) {
  const collected = (listing.foodClaims ?? []).filter(
    (claim) => String(claim.status || "").toUpperCase() === "COLLECTED",
  );
  if (collected.length === 0) return 0;
  const fromClaims = collected.reduce((sum, claim) => {
    const items = claim.claimItems ?? [];
    const itemKg = items.reduce((itemSum, item) => itemSum + Number(item.qtyKg || 0), 0);
    return sum + itemKg;
  }, 0);
  return fromClaims > 0 ? fromClaims : getTotalKg(listing);
}

export function formatKg(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function compareListingsByNewest(a: ApiFoodListing, b: ApiFoodListing) {
  const aMs = new Date(a.createdAt || a.updatedAt || 0).getTime();
  const bMs = new Date(b.createdAt || b.updatedAt || 0).getTime();
  if (bMs !== aMs) return bMs - aMs;
  return Number(b.id || 0) - Number(a.id || 0);
}

export function sortListingsByNewest(listings: ApiFoodListing[]) {
  return [...listings].sort(compareListingsByNewest);
}

export function matchesStatusFilter(listing: ApiFoodListing, filter: ListingStatusFilter) {
  if (filter === "all") return true;
  if (filter === "active") return isListingActive(listing);
  if (filter === "claimed") return isListingClaimed(listing);
  if (filter === "expired") return isListingExpired(listing);
  if (filter === "collected") return isListingCollected(listing);
  if (filter === "cancelled") return isListingCancelled(listing);
  return true;
}

export function formatListingDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatListingDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date
    .toLocaleString("en-GB", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .replace(",", "");
}

export function formatPickupDateRange(from?: string | null, to?: string | null) {
  const start = formatListingDate(from);
  const end = formatListingDate(to);
  if (start === "—" && end === "—") return "—";
  if (start === end || end === "—") return start;
  if (start === "—") return end;
  return `${start} – ${end}`;
}

export function formatPickupTime(from?: string | null, to?: string | null) {
  if (!from || !to) return "—";
  const fmt = (value: string) =>
    new Date(value)
      .toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true })
      .replace(" ", "")
      .toLowerCase();
  return `${fmt(from)} – ${fmt(to)}`;
}

export function formatCollectedOn(listing: ApiFoodListing) {
  const claims = listing.foodClaims ?? [];
  const collected = claims.find(
    (claim) => String(claim.status || "").toUpperCase() === "COLLECTED" && claim.collectedAt,
  );
  return formatListingDateTime(
    collected?.collectedAt || listing.collectedAt || listing.updatedAt || listing.pickupFromTime || listing.createdAt,
  );
}

export function formatClaimedOn(listing: ApiFoodListing) {
  const claims = listing.foodClaims ?? [];
  const open = claims.find((claim) => {
    const status = String(claim.status || "").toUpperCase();
    return status === "PENDING" || status === "CONFIRMED";
  });
  return formatListingDateTime(
    open?.confirmedAt || open?.createdAt || claims[0]?.createdAt || listing.updatedAt || listing.createdAt,
  );
}

export function formatExpiredOn(listing: ApiFoodListing) {
  return formatListingDateTime(listing.updatedAt || listing.pickupByTime || listing.pickupFromTime);
}

export function getCollectorLabel(listing: ApiFoodListing) {
  if (isListingExpired(listing) || isListingCancelled(listing) || !listingHasCollectedClaim(listing)) {
    return null;
  }
  const claims = listing.foodClaims ?? [];
  const preferred =
    claims.find((claim) => String(claim.status || "").toUpperCase() === "COLLECTED") || claims[0];
  const name = preferred?.claimantOrg?.name;
  return name?.trim() ? `Collected by ${name.trim()}` : null;
}

export function buildInstructions(listing: ApiFoodListing) {
  const parts = [
    listing.needsRefrigeration && "Needs refrigeration",
    listing.needsReheating && "Needs reheating",
    ((listing.allergens?.length ?? 0) > 0) && "Contains allergens",
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "No special instructions";
}

export function getImpactText(listing: ApiFoodListing) {
  const totalKg = getTotalKg(listing);
  if (getListingAudience(listing) === "animal") {
    return `${Math.round(totalKg)} kg feed diverted from landfill`;
  }
  return `~${estimateMealsSaved(totalKg)} meals created`;
}

export type ListingDateFieldErrors = {
  bestBefore?: string;
  pickupFrom?: string;
  pickupTo?: string;
};

function calendarDayMs(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.getTime();
}

export function getListingFoodItemsError(totalQty: number) {
  if (totalQty <= 0) return "Add at least one food item with quantity greater than 0.";
  return undefined;
}

export function getListingDateErrors(
  bestBefore: Date | null,
  pickupFrom: Date | null,
  pickupTo: Date | null,
  now = new Date(),
): ListingDateFieldErrors {
  const errors: ListingDateFieldErrors = {};
  if (!bestBefore) errors.bestBefore = "Please select a best before date.";
  if (!pickupFrom) errors.pickupFrom = "Please select a pickup start time.";
  if (!pickupTo) errors.pickupTo = "Please select a pickup end time.";
  if (pickupFrom && pickupTo && pickupTo <= pickupFrom) {
    errors.pickupTo = "Pickup end time must be after pickup start time.";
  }
  if (bestBefore) {
    if (pickupFrom && calendarDayMs(pickupFrom) > calendarDayMs(bestBefore)) {
      errors.pickupFrom = "Pickup start must be on or before the best before date.";
    }
    if (pickupTo && calendarDayMs(pickupTo) > calendarDayMs(bestBefore)) {
      errors.pickupTo = "Pickup end must be on or before the best before date.";
    }
  }
  if (pickupTo && pickupTo.getTime() <= now.getTime()) {
    errors.pickupTo = PAST_COLLECTION_WINDOW_MESSAGE;
  }
  return errors;
}

export function hasListingDateErrors(errors: ListingDateFieldErrors) {
  return Object.values(errors).some(Boolean);
}

export function toDateTimeLocal(date: Date | null) {
  if (!date || Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function toDateInput(date: Date | null) {
  if (!date || Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromDateInput(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T23:59:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function fromDateTimeLocal(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
