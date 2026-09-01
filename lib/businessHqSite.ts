import {
  createBusinessSite,
  getBusinessOrganisation,
  getBusinessProfile,
  updateBusinessSite,
} from "@/lib/businessApi";
import { isHeadOfficeOrgRole, isSiteOnlyRole, type BusinessProfile, type BusinessUser } from "@/lib/businessTypes";

export const VIRTUAL_HQ_SITE_ID = -1;

export type BusinessSiteRow = {
  id: number;
  siteName: string;
  address: string;
  postcode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isActive?: boolean;
  isVirtual?: boolean;
  createdAt?: string;
};

export function isVirtualHqSiteId(id: unknown) {
  const parsed = Number(id);
  return Number.isFinite(parsed) && parsed <= 0;
}

export function parseLiveSiteId(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function extractCreatedSiteId(res: unknown): number | null {
  if (!res || typeof res !== "object") return null;
  const obj = res as Record<string, unknown>;
  const nested = obj.data && typeof obj.data === "object" ? (obj.data as Record<string, unknown>) : null;
  const site = obj.site && typeof obj.site === "object" ? (obj.site as Record<string, unknown>) : null;
  const nestedSite =
    nested?.site && typeof nested.site === "object" ? (nested.site as Record<string, unknown>) : null;
  const candidates = [site?.id, nestedSite?.id, nested?.id, obj.id];
  for (const raw of candidates) {
    const id = parseLiveSiteId(raw);
    if (id) return id;
  }
  return null;
}

export function getHqOwnerContact(user: BusinessUser | null | undefined) {
  const firstName = (user?.firstName ?? "").trim();
  const lastName = (user?.lastName ?? "").trim();
  const name = [firstName, lastName].filter(Boolean).join(" ").trim() || user?.name || "Head office";
  return {
    firstName,
    lastName,
    name,
    email: (user?.email ?? "").trim(),
    mobile: (user?.phoneNumber ?? "").trim(),
  };
}

export function isBusinessMultiHeadOffice(user: BusinessUser | null | undefined) {
  if (!user || user.orgType !== "BUSINESS_MULTI") return false;
  if (isHeadOfficeOrgRole(user.orgRole)) return true;
  if (isSiteOnlyRole(user.siteRole) || isSiteOnlyRole(user.orgRole)) return false;
  return user.role === "restaurant_multi";
}

export function isBusinessLocationUser(user: BusinessUser | null | undefined) {
  return Boolean(user && user.orgType === "BUSINESS_MULTI" && user.role === "restaurant_single");
}

export function pickDefaultSite<T extends { id?: unknown; siteId?: unknown; isActive?: boolean; createdAt?: string }>(
  sites: T[] | null | undefined,
) {
  return (Array.isArray(sites) ? sites : [])
    .filter((site) => site && site.isActive !== false && !isVirtualHqSiteId(site.id ?? site.siteId))
    .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())[0] ?? null;
}

export function pickDefaultSiteId(sites: Array<{ id?: unknown; siteId?: unknown; isActive?: boolean; createdAt?: string }> | null | undefined) {
  const site = pickDefaultSite(sites);
  return parseLiveSiteId(site?.id ?? site?.siteId);
}

export function buildVirtualHqSite(user: BusinessUser): BusinessSiteRow {
  return {
    id: VIRTUAL_HQ_SITE_ID,
    siteName: user.organization || user.brandName || "Head office",
    address: user.address || "",
    isActive: true,
    isVirtual: true,
    createdAt: user.createdAt ?? undefined,
  };
}

export function sitesWithHqFallback(sites: BusinessSiteRow[] | null | undefined, user: BusinessUser | null) {
  const live = (Array.isArray(sites) ? sites : []).filter((site) => site && !isVirtualHqSiteId(site.id));
  if (live.length > 0) return live;
  if (user && isBusinessMultiHeadOffice(user)) return [buildVirtualHqSite(user)];
  return live;
}

function extractPostcode(address: string, region?: string | null) {
  const fromAddress = address.match(/\b\d{6}\b/)?.[0] || address.match(/\b\d{4}\b/)?.[0] || "";
  if (fromAddress) return fromAddress;
  return (region ?? "").toUpperCase() === "IN" ? "000000" : "0000";
}

export function parseCoord(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function sitesFromOrganisationPayload(payload: unknown): BusinessSiteRow[] {
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  const raw = Array.isArray(record.sites)
    ? record.sites
    : record.site && typeof record.site === "object"
      ? [record.site]
      : [];
  const rows: BusinessSiteRow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const site = item as Record<string, unknown>;
    const id = parseLiveSiteId(site.id ?? site.siteId);
    if (!id || isVirtualHqSiteId(id)) continue;
    rows.push({
      id,
      siteName: String(site.siteName || site.locationName || site.name || site.organisationName || `Site ${id}`),
      address: String(site.address || ""),
      postcode: (site.postcode ?? site.postCode ?? null) as string | null,
      latitude: parseCoord(site.latitude ?? site.lat),
      longitude: parseCoord(site.longitude ?? site.lng),
      isActive: site.isActive === false ? false : true,
      createdAt: typeof site.createdAt === "string" ? site.createdAt : undefined,
    });
  }
  return rows;
}

function sitesFromProfile(profile: BusinessProfile | null): BusinessSiteRow[] {
  const rows: BusinessSiteRow[] = [];
  for (const site of profile?.sites ?? []) {
    const id = parseLiveSiteId(site.id);
    if (!id) continue;
    rows.push({
      id,
      siteName: site.locationName || site.name || site.organisationName || `Site ${id}`,
      address: site.address || "",
      postcode: site.postcode ?? null,
      latitude: site.latitude ?? null,
      longitude: site.longitude ?? null,
      isActive: site.isActive,
    });
  }
  return rows;
}

async function geocodeAddress(address: string) {
  const query = address.trim();
  if (!query) return null;
  try {
    const response = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1&lang=en`,
    );
    const data = (await response.json()) as {
      features?: Array<{ geometry?: { coordinates?: number[] } }>;
    };
    const coords = data.features?.[0]?.geometry?.coordinates;
    if (!coords || coords.length < 2) return null;
    const longitude = parseCoord(coords[0]);
    const latitude = parseCoord(coords[1]);
    if (latitude == null || longitude == null) return null;
    return { latitude, longitude };
  } catch {
    return null;
  }
}

export type HqSitePayload = {
  siteName: string;
  address: string;
  postcode: string;
  latitude: number;
  longitude: number;
};

export async function buildDefaultHqSitePayload(
  user: BusinessUser,
  profile?: BusinessProfile | null,
): Promise<HqSitePayload | null> {
  const org = profile?.organisation;
  const defaultSite = pickDefaultSite(sitesFromProfile(profile ?? null));
  const siteName = (
    defaultSite?.siteName ||
    org?.name ||
    user.organization ||
    user.brandName ||
    "Head office"
  ).trim();
  const address = (
    defaultSite?.address ||
    org?.businessAddress ||
    org?.address ||
    user.address ||
    ""
  ).trim();

  let latitude =
    parseCoord(defaultSite?.latitude) ?? parseCoord(org?.latitude) ?? parseCoord((user as { latitude?: number }).latitude);
  let longitude =
    parseCoord(defaultSite?.longitude) ??
    parseCoord(org?.longitude) ??
    parseCoord((user as { longitude?: number }).longitude);

  if ((latitude == null || longitude == null) && address) {
    const geocoded = await geocodeAddress(address);
    if (geocoded) {
      latitude = geocoded.latitude;
      longitude = geocoded.longitude;
    }
  }

  if (!siteName || !address || latitude == null || longitude == null) return null;

  return {
    siteName,
    address,
    postcode: extractPostcode(address, org?.region),
    latitude,
    longitude,
  };
}

let ensurePromise: Promise<BusinessSiteRow[]> | null = null;

export async function ensureDefaultHqSite(user: BusinessUser): Promise<BusinessSiteRow[]> {
  if (ensurePromise) return ensurePromise;

  const run = (async () => {
    const [orgPayload, profile] = await Promise.all([
      getBusinessOrganisation().catch(() => ({ sites: [] as BusinessSiteRow[] })),
      getBusinessProfile().catch(() => null),
    ]);

    const fromOrg = (orgPayload.sites ?? []).filter((site) => parseLiveSiteId(site.id));
    const fromProfile = sitesFromProfile(profile);
    const live = fromOrg.length > 0 ? fromOrg : fromProfile;
    if (live.length > 0) {
      const defaultSite = pickDefaultSite(live);
      if (defaultSite) {
        const owner = getHqOwnerContact(user);
        await updateBusinessSite(defaultSite.id, {
          contactName: owner.name,
          contactEmail: owner.email || undefined,
          phoneNumber: owner.mobile || undefined,
        }).catch(() => undefined);
      }
      return live;
    }

    if (!isBusinessMultiHeadOffice(user)) return live;

    const payload = await buildDefaultHqSitePayload(user, profile);
    if (!payload) return [buildVirtualHqSite(user)];

    try {
      const created = await createBusinessSite(payload);
      const createdId = extractCreatedSiteId(created);
      if (!createdId) return [buildVirtualHqSite(user)];

      const owner = getHqOwnerContact(user);
      await updateBusinessSite(createdId, {
        contactName: owner.name,
        contactEmail: owner.email || undefined,
        phoneNumber: owner.mobile || undefined,
      }).catch(() => undefined);

      const refreshed = await getBusinessOrganisation().catch(() => null);
      const next = (refreshed?.sites ?? []).filter((site) => parseLiveSiteId(site.id));
      if (next.length > 0) return next;
      return [
        {
          id: createdId,
          siteName: payload.siteName,
          address: payload.address,
          postcode: payload.postcode,
          latitude: payload.latitude,
          longitude: payload.longitude,
          isActive: true,
          createdAt: new Date().toISOString(),
        },
      ];
    } catch {
      return [buildVirtualHqSite(user)];
    }
  })();

  ensurePromise = run;
  try {
    return await run;
  } finally {
    ensurePromise = null;
  }
}
