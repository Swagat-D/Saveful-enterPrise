import type { ApiFoodListing } from "@/lib/api";
import { estimateCo2AvoidedKg, estimateMealsSaved, getListingAudience } from "@/lib/businessListings";

export type UpdateAudience = "people" | "animals";
export type UpdateSection = "TODAY" | "YESTERDAY" | "EARLIER";
export type UpdateCardType = "claimed" | "collected" | "feedback";

export type UpdateFoodItem = {
  name: string;
  qty: string;
};

export type RestaurantUpdate = {
  id: string;
  claimId: number;
  listingId: number;
  audience: UpdateAudience;
  cardType: UpdateCardType;
  section: UpdateSection;
  claimerName: string;
  location: string | null;
  assigneeLabel: string;
  assigneeName: string | null;
  assigneeStatus: string;
  pickupFrom: string | null;
  pickupTo: string | null;
  quantityKg: number;
  items: UpdateFoodItem[];
  claimerPhone: string | null;
  assigneePhone: string | null;
  collectedDate: string | null;
  mealsCreated: number;
  co2Avoided: number;
  needsProviderFeedback?: boolean;
  providerConfirmed?: boolean;
  providerRating?: number | null;
  claimantRating?: number | null;
  ratingNote?: string | null;
};

export function parseStarRating(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.min(5, Math.round(n));
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function sectionForDate(iso: string | null | undefined): UpdateSection {
  if (!iso) return "EARLIER";
  const when = new Date(iso).getTime();
  if (!Number.isFinite(when)) return "EARLIER";

  const today = startOfDay(new Date());
  const day = startOfDay(new Date(when));
  const dayMs = 24 * 60 * 60 * 1000;

  if (day === today) return "TODAY";
  if (day === today - dayMs) return "YESTERDAY";
  return "EARLIER";
}

function isFarmOrgType(type?: string | null) {
  const t = String(type || "").toUpperCase();
  return t.includes("FARM");
}

function formatQty(kg: number) {
  const rounded = Math.round(kg * 100) / 100;
  return `${rounded}kg`;
}

function claimQuantityKg(claim: Record<string, unknown>, listing: Record<string, unknown>): number {
  const items = Array.isArray(claim.claimItems) ? claim.claimItems : [];
  const fromItems = items.reduce((sum: number, item) => {
    const row = item as { qtyKg?: number };
    return sum + Number(row?.qtyKg || 0);
  }, 0);
  if (fromItems > 0) return fromItems;
  if (Number.isFinite(Number(claim.qtyKg))) return Number(claim.qtyKg);
  const foodItems = Array.isArray(listing.foodItems) ? listing.foodItems : [];
  return foodItems.reduce((sum: number, item) => {
    const row = item as { totalQtyKg?: number; remainingQtyKg?: number };
    return sum + Number(row.totalQtyKg || row.remainingQtyKg || 0);
  }, 0);
}

function claimItems(claim: Record<string, unknown>, listing: Record<string, unknown>): UpdateFoodItem[] {
  const fromClaim = Array.isArray(claim.claimItems) ? claim.claimItems : [];
  if (fromClaim.length > 0) {
    return fromClaim
      .map((item) => {
        const row = item as { qtyKg?: number; name?: string; foodItem?: { name?: string } };
        const kg = Number(row?.qtyKg || 0);
        const name = row?.foodItem?.name || row?.name || "Food item";
        return { name: String(name), qty: formatQty(kg) };
      })
      .filter((item) => item.name);
  }

  const foodItems = Array.isArray(listing.foodItems) ? listing.foodItems : [];
  return foodItems.map((item) => {
    const row = item as { name?: string; totalQtyKg?: number; remainingQtyKg?: number };
    return {
      name: String(row?.name || "Food item"),
      qty: formatQty(Number(row?.totalQtyKg || row?.remainingQtyKg || 0)),
    };
  });
}

function locationLabel(claim: Record<string, unknown>, listing: Record<string, unknown>): string | null {
  const site = claim.claimantSite as { address?: string; postcode?: string } | undefined;
  if (site?.address) {
    return [site.address, site.postcode].filter(Boolean).join(", ");
  }
  const org = claim.claimantOrg as { address?: string } | undefined;
  if (org?.address) return String(org.address);
  if (typeof listing.pickupAddress === "string" && listing.pickupAddress) {
    return [listing.pickupAddress, listing.pickupPostcode].filter(Boolean).join(", ");
  }
  return null;
}

function driverName(pickup: Record<string, unknown> | null): string | null {
  const driver = pickup?.driver as { firstName?: string; lastName?: string } | undefined;
  if (!driver) return null;
  const name = [driver.firstName, driver.lastName].filter(Boolean).join(" ").trim();
  return name || null;
}

function assigneeStatusLabel(claim: Record<string, unknown>, isAnimals: boolean): string {
  const status = String(claim.status || "").toUpperCase();
  const pickups = Array.isArray(claim.driverPickups) ? claim.driverPickups : [];
  const pickup = pickups[0] as { status?: string } | undefined;
  const pickupStatus = String(pickup?.status || "").toUpperCase();

  if (status === "COLLECTED" || pickupStatus === "COLLECTED") return "collected";
  if (pickupStatus === "ARRIVED") return "arrived";
  if (pickupStatus === "EN_ROUTE") return "en_route";
  if (pickupStatus === "ACCEPTED" || pickupStatus === "ASSIGNED") {
    return isAnimals ? "farmer_assigned" : "driver_assigned";
  }
  if (status === "CONFIRMED") return "confirmed";
  return "pending";
}

function isClaimCollected(claim: Record<string, unknown>): boolean {
  const status = String(claim.status || "").toUpperCase();
  if (status === "COLLECTED" || status === "COMPLETED") return true;
  if (claim.collectedAt) return true;

  const pickups = Array.isArray(claim.driverPickups) ? claim.driverPickups : [];
  const pickup = pickups[0] as { status?: string } | undefined;
  return String(pickup?.status || "").toUpperCase() === "COLLECTED";
}

function isProviderFeedbackComplete(claim: Record<string, unknown>): boolean {
  if (parseStarRating(claim.providerRating ?? claim.provider_rating) != null) return true;
  if (typeof claim.providerDidCollect === "boolean") return true;
  if (typeof claim.didCollect === "boolean") return true;
  return false;
}

function claimRatings(claim: Record<string, unknown>) {
  return {
    providerRating: parseStarRating(claim.providerRating ?? claim.provider_rating),
    claimantRating: parseStarRating(claim.rating),
    ratingNote: (claim.providerRatingNote ??
      claim.provider_rating_note ??
      claim.ratingNote ??
      null) as string | null,
  };
}

export function mapListingsToRestaurantUpdates(listings: unknown[]): RestaurantUpdate[] {
  const updates: RestaurantUpdate[] = [];

  for (const raw of listings || []) {
    const listing = (raw ?? {}) as Record<string, unknown>;
    const claims = Array.isArray(listing.foodClaims) ? listing.foodClaims : [];
    if (claims.length === 0) continue;

    const audience: UpdateAudience = getListingAudience(listing as ApiFoodListing) === "animal" ? "animals" : "people";
    const isAnimals = audience === "animals";

    for (const rawClaim of claims) {
      const claim = (rawClaim ?? {}) as Record<string, unknown>;
      const status = String(claim.status || "").toUpperCase();
      if (status === "CANCELLED") continue;

      const quantityKg = claimQuantityKg(claim, listing);
      const pickups = Array.isArray(claim.driverPickups) ? claim.driverPickups : [];
      const pickup = (pickups[0] ?? null) as Record<string, unknown> | null;
      const claimantOrg = claim.claimantOrg as { name?: string; organizationType?: string } | undefined;
      const claimantSite = claim.claimantSite as {
        organisationName?: string;
        contactName?: string;
        contactMobile?: string;
      } | undefined;
      const farmClaimant = isFarmOrgType(claimantOrg?.organizationType) || isAnimals;
      const claimerName =
        claimantSite?.organisationName ||
        claimantOrg?.name ||
        (farmClaimant ? "Farm partner" : "Charity partner");

      const assigneeFromDriver = driverName(pickup);
      const siteContact = claimantSite?.contactName || null;
      const collected = isClaimCollected(claim);
      const providerDone = isProviderFeedbackComplete(claim);
      const needsProviderFeedback = collected && !providerDone;
      const pickupRecord = pickup as { collectedAt?: string; driver?: { phoneNumber?: string } } | null;

      const sectionDate = collected
        ? (claim.collectedAt as string) || pickupRecord?.collectedAt || (claim.updatedAt as string) || (claim.createdAt as string)
        : (claim.createdAt as string) || (claim.confirmedAt as string);

      if (needsProviderFeedback) {
        updates.push({
          id: `feedback-${claim.id}`,
          claimId: Number(claim.id),
          listingId: Number(listing.id),
          audience,
          cardType: "feedback",
          section: sectionForDate(sectionDate),
          claimerName,
          location: locationLabel(claim, listing),
          assigneeLabel: farmClaimant ? "Farmer" : "Driver",
          assigneeName: assigneeFromDriver || siteContact,
          assigneeStatus: "collected",
          pickupFrom: (listing.pickupFromTime as string) || (listing.pickupFrom as string) || null,
          pickupTo: (listing.pickupByTime as string) || (listing.pickupTo as string) || null,
          quantityKg,
          items: claimItems(claim, listing),
          claimerPhone: claimantSite?.contactMobile || null,
          assigneePhone: pickupRecord?.driver?.phoneNumber || claimantSite?.contactMobile || null,
          collectedDate: (claim.collectedAt as string) || pickupRecord?.collectedAt || null,
          mealsCreated: estimateMealsSaved(quantityKg),
          co2Avoided: estimateCo2AvoidedKg(quantityKg),
          needsProviderFeedback: true,
          providerConfirmed: false,
          ...claimRatings(claim),
        });
      }

      updates.push({
        id: String(claim.id ?? `${listing.id}-${claim.createdAt}`),
        claimId: Number(claim.id),
        listingId: Number(listing.id),
        audience,
        cardType: collected ? "collected" : "claimed",
        section: sectionForDate(sectionDate),
        claimerName,
        location: locationLabel(claim, listing),
        assigneeLabel: farmClaimant ? "Farmer" : "Driver",
        assigneeName: assigneeFromDriver || siteContact,
        assigneeStatus: assigneeStatusLabel(claim, farmClaimant),
        pickupFrom: (listing.pickupFromTime as string) || (listing.pickupFrom as string) || null,
        pickupTo: (listing.pickupByTime as string) || (listing.pickupTo as string) || null,
        quantityKg,
        items: claimItems(claim, listing),
        claimerPhone: claimantSite?.contactMobile || null,
        assigneePhone: pickupRecord?.driver?.phoneNumber || claimantSite?.contactMobile || null,
        collectedDate: (claim.collectedAt as string) || pickupRecord?.collectedAt || null,
        mealsCreated: estimateMealsSaved(quantityKg),
        co2Avoided: estimateCo2AvoidedKg(quantityKg),
        needsProviderFeedback,
        providerConfirmed: providerDone,
        ...claimRatings(claim),
      });
    }
  }

  return updates.sort((a, b) => {
    if (a.cardType === "feedback" && b.cardType !== "feedback") return -1;
    if (b.cardType === "feedback" && a.cardType !== "feedback") return 1;
    const aDate = a.collectedDate || a.pickupFrom || "";
    const bDate = b.collectedDate || b.pickupFrom || "";
    const aMs = new Date(aDate).getTime() || 0;
    const bMs = new Date(bDate).getTime() || 0;
    if (bMs !== aMs) return bMs - aMs;
    return b.claimId - a.claimId;
  });
}

export function prettyStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatCollectionDate(from: string) {
  const date = new Date(from);
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

export function formatCollectionTimeRange(from: string, to: string) {
  const fmt = (value: string) =>
    new Date(value)
      .toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true })
      .replace(" ", "")
      .toLowerCase();
  return `${fmt(from)} – ${fmt(to)}`;
}

export function formatCollectedDate(value: string) {
  const date = new Date(value);
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}
