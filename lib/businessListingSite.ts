import { getBusinessOrganisation, getBusinessProfile } from "@/lib/businessApi";
import {
  ensureDefaultHqSite,
  isBusinessMultiHeadOffice,
  isVirtualHqSiteId,
  pickDefaultSite,
  pickDefaultSiteId,
  sitesFromOrganisationPayload,
  type BusinessSiteRow,
} from "@/lib/businessHqSite";
import type { BusinessUser } from "@/lib/businessTypes";

let hqSites: BusinessSiteRow[] | null = null;

function parseCoordinate(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const lowered = trimmed.toLowerCase();
    if (lowered === "null" || lowered === "undefined" || lowered === "nan") return null;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readLatLng(source: any): { latitude: unknown; longitude: unknown } {
  if (!source || typeof source !== "object") {
    return { latitude: undefined, longitude: undefined };
  }
  return {
    latitude: source.latitude ?? source.lat,
    longitude: source.longitude ?? source.lng,
  };
}

function normalizeAuthProfile(authUser: any): any {
  if (!authUser) return null;
  const nested = authUser.profile;
  if (nested?.organisation || nested?.organization || nested?.sites || nested?.site) {
    return nested;
  }
  if (authUser.organisation || authUser.organization || authUser.sites || authUser.site) {
    return authUser;
  }
  return nested ?? null;
}

function collectCoordinateCandidates(
  profile: any,
  options?: { preferOrganisation?: boolean },
): Array<{ latitude: unknown; longitude: unknown }> {
  if (!profile) return [];
  const candidates: Array<{ latitude: unknown; longitude: unknown }> = [];
  const sites = Array.isArray(profile.sites) ? profile.sites : profile.site ? [profile.site] : [];
  const org = profile.organisation ?? profile.organization;
  const orgCandidates: Array<{ latitude: unknown; longitude: unknown }> = [];
  if (org) {
    orgCandidates.push(readLatLng(org));
    if (org.location && typeof org.location === "object") {
      orgCandidates.push(readLatLng(org.location));
    }
  }
  const siteCandidates = sites.map((site: any) => readLatLng(site));
  if (options?.preferOrganisation) {
    candidates.push(...orgCandidates, ...siteCandidates);
  } else {
    candidates.push(...siteCandidates, ...orgCandidates);
  }
  return candidates;
}

function resolveProfileCoordinates(
  profile: any,
  options?: { preferOrganisation?: boolean },
): { lat: number; lng: number } | null {
  for (const candidate of collectCoordinateCandidates(profile, {
    preferOrganisation: options?.preferOrganisation === true,
  })) {
    const lat = parseCoordinate(candidate.latitude);
    const lng = parseCoordinate(candidate.longitude);
    if (lat !== null && lng !== null) return { lat, lng };
  }
  return null;
}

function isHqUser(authUser: BusinessUser | null | undefined) {
  return isBusinessMultiHeadOffice(authUser) || authUser?.role === "restaurant_multi";
}

function getListingSiteId(authUser: any): number | null {
  const profile = normalizeAuthProfile(authUser);
  if (isHqUser(authUser)) {
    const fromProfile = pickDefaultSiteId(profile?.sites);
    if (fromProfile) return fromProfile;
  }
  const site = profile?.sites?.[0] ?? profile?.site;
  const id = site?.id;
  if (id === null || id === undefined || id === "") return null;
  const parsed = Number(id);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export async function listingAuthUser(user: BusinessUser | null): Promise<BusinessUser | null> {
  if (!user) return null;
  const profile = normalizeAuthProfile(user);
  if (profile?.sites?.length || profile?.site || profile?.organisation) return user;
  const fetched = await getBusinessProfile().catch(() => null);
  return fetched ? { ...user, profile: fetched } : user;
}

export async function resolveListingSiteId(authUser: any): Promise<number | null> {
  if (isHqUser(authUser)) {
    hqSites = await ensureDefaultHqSite(authUser);
    const hqId = pickDefaultSiteId(hqSites);
    if (hqId && !isVirtualHqSiteId(hqId)) return hqId;
  }

  const fromProfile = getListingSiteId(authUser);
  if (fromProfile) return fromProfile;

  const payload = await getBusinessOrganisation().catch(() => null);
  const sites = sitesFromOrganisationPayload(payload);
  const fromOrg = pickDefaultSiteId(sites);
  if (fromOrg) return fromOrg;

  const site = Array.isArray(sites) ? sites[0] : null;
  const id = site?.id;
  if (id === null || id === undefined || id === "") return null;
  const parsed = Number(id);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function getSitePickupCoords(authUser: any): { lat: number; lng: number } | null {
  const profile = normalizeAuthProfile(authUser);
  if (isBusinessMultiHeadOffice(authUser)) {
    const hqSite = pickDefaultSite(hqSites) || pickDefaultSite(profile?.sites);
    const lat = Number(hqSite?.latitude ?? (hqSite as { lat?: unknown } | null)?.lat);
    const lng = Number(hqSite?.longitude ?? (hqSite as { lng?: unknown } | null)?.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  return resolveProfileCoordinates(profile);
}

export function getSitePostcode(authUser: any): string | undefined {
  const profile = normalizeAuthProfile(authUser);
  const org = profile?.organisation ?? profile?.organization;
  const hqSite = isBusinessMultiHeadOffice(authUser)
    ? pickDefaultSite(hqSites) || pickDefaultSite(profile?.sites)
    : null;
  const site = hqSite ?? profile?.sites?.[0] ?? profile?.site;
  return site?.postcode ?? site?.postCode ?? org?.postcode ?? undefined;
}
