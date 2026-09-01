"use client";

import { useSyncExternalStore } from "react";
import { ApiError } from "@/lib/api";
import {
  businessLogin,
  getBusinessProfile,
  onBusinessUnauthorized,
  type BusinessLoginSiteAccess,
} from "@/lib/businessApi";
import {
  ACCESS_TOKEN_KEY,
  clearSessionKeys,
  notifyPortalSession,
  persistSessionRecord,
  readAccessToken,
  readSessionUserRaw,
  subscribePortalSession,
} from "@/lib/portalSession";
import {
  isBusinessOrgType,
  isCharityOrgType,
  isHeadOfficeOrgRole,
  roleFromOrgType,
  type BusinessProfile,
  type BusinessUser,
} from "@/lib/businessTypes";

const listeners = new Set<() => void>();
let liveCheck: Promise<BusinessUser | null> | null = null;
let liveCheckedId: string | null = null;

function emit() {
  listeners.forEach((listener) => listener());
  notifyPortalSession();
}

function clearStored() {
  liveCheck = null;
  liveCheckedId = null;
  clearSessionKeys();
  cachedUser = null;
  cachedRaw = null;
}

export function getBusinessStoredToken() {
  return readAccessToken();
}

let cachedUser: BusinessUser | null = null;
let cachedRaw: string | null = null;

function assignedSiteFromProfile(profile: BusinessProfile, access?: BusinessLoginSiteAccess | null) {
  const sites = Array.isArray(profile.sites) ? [...profile.sites] : [];
  const accessId = Number(access?.siteId);
  if (Number.isFinite(accessId) && accessId > 0) {
    const match = sites.find((site) => Number(site.id) === accessId);
    if (match) return match;
    if (sites.length === 0) {
      return {
        id: accessId,
        locationName: access?.siteName,
        name: access?.siteName,
        address: access?.address,
      } satisfies BusinessProfile["sites"][number];
    }
  }
  return sites[0] ?? null;
}

function userFromProfile(
  profile: BusinessProfile,
  fallbackName?: string,
  access?: BusinessLoginSiteAccess | null,
): BusinessUser {
  const org = profile.organisation;
  const orgType = orgTypeFrom(org);
  if (!org || !isBusinessOrgType(orgType)) {
    throw new Error("This account is not a restaurant or farm provider organisation.");
  }
  const name =
    [profile.user.firstName, profile.user.lastName].filter(Boolean).join(" ") ||
    fallbackName ||
    profile.user.email;
  const orgRole = profile.role.orgRole;
  const siteRole = profile.role.siteRole ?? access?.siteRole ?? null;
  const role = roleFromOrgType(orgType, orgRole, siteRole);
  const assigned = assignedSiteFromProfile(profile, access);
  const locationUser = orgType === "BUSINESS_MULTI" && role === "restaurant_single";
  return {
    id: String(profile.user.id),
    email: profile.user.email,
    name,
    firstName: profile.user.firstName,
    lastName: profile.user.lastName,
    organization: locationUser
      ? assigned?.locationName || assigned?.name || assigned?.organisationName || org.name
      : org.name,
    organisationId: org.id,
    orgType,
    orgRole,
    siteRole,
    role,
    isSuperAdmin: isHeadOfficeOrgRole(orgRole),
    logoUrl: org.logoUrl,
    address:
      assigned?.address ||
      (locationUser ? null : org.businessAddress || org.address) ||
      null,
    phoneNumber: profile.user.phoneNumber,
    venueType: org.venueType,
    brandName: org.brandName,
    registrationNumber: org.registrationNumber,
    createdAt: org.createdAt,
    siteId: assigned?.id ?? null,
    profile,
    portal: "business",
  };
}

function isEnterpriseAccount(input: {
  enterpriseRole?: string | null;
  planName?: string | null;
}) {
  if ((input.planName ?? "").toUpperCase() === "ENTERPRISE") return true;
  return Boolean((input.enterpriseRole ?? "").trim());
}

function orgTypeFrom(value?: { type?: string | null; organizationType?: string | null } | null) {
  return value?.type || value?.organizationType || null;
}

function businessPortalError(
  profile: {
    orgType?: string | null;
    enterpriseRole?: string | null;
    planName?: string | null;
    platformRole?: string | null;
  },
  requireOrgType: boolean,
) {
  if (profile.platformRole === "PLATFORM_ADMIN") {
    return "This is a Saveful admin account. Sign in through the Admin portal.";
  }
  if (isEnterpriseAccount({ enterpriseRole: profile.enterpriseRole, planName: profile.planName })) {
    return "Enterprise accounts sign in through the Enterprise portal.";
  }
  if (isCharityOrgType(profile.orgType)) {
    return "Charity and consumer accounts sign in through the Saveful app.";
  }
  if (profile.orgType && !isBusinessOrgType(profile.orgType)) {
    return "Only single-site, multi-site and farm provider accounts can sign in here.";
  }
  if (requireOrgType && !isBusinessOrgType(profile.orgType)) {
    return "Only single-site, multi-site and farm provider accounts can sign in here.";
  }
  return null;
}

function requireBusinessPortal(profile: BusinessProfile) {
  return businessPortalError(
    {
      orgType: orgTypeFrom(profile.organisation),
      enterpriseRole: profile.role?.enterpriseRole,
      planName: profile.subscription?.plan?.name,
      platformRole: profile.user?.platformRole,
    },
    true,
  );
}

function sameBusinessUser(a: BusinessUser, b: BusinessUser) {
  return (
    a.id === b.id &&
    a.email === b.email &&
    a.name === b.name &&
    a.organization === b.organization &&
    a.organisationId === b.organisationId &&
    a.orgRole === b.orgRole &&
    a.siteRole === b.siteRole &&
    a.role === b.role &&
    a.logoUrl === b.logoUrl &&
    a.address === b.address &&
    a.phoneNumber === b.phoneNumber &&
    a.siteId === b.siteId &&
    a.venueType === b.venueType &&
    a.brandName === b.brandName &&
    a.registrationNumber === b.registrationNumber &&
    a.profile?.sites?.[0]?.id === b.profile?.sites?.[0]?.id &&
    a.profile?.sites?.[0]?.latitude === b.profile?.sites?.[0]?.latitude &&
    a.profile?.sites?.[0]?.longitude === b.profile?.sites?.[0]?.longitude
  );
}

function persist(user: BusinessUser, token: string, force = false) {
  const next = { ...user, portal: "business" as const };
  if (!force && cachedUser && sameBusinessUser(cachedUser, next)) return cachedUser;
  persistSessionRecord(next, token);
  cachedUser = next;
  cachedRaw = JSON.stringify(next);
  liveCheckedId = next.id;
  emit();
  return next;
}

function isBusinessStoredUser(value: unknown): value is BusinessUser {
  if (!value || typeof value !== "object") return false;
  const row = value as { portal?: string; orgType?: string; organisationId?: number };
  if (row.portal === "admin" || row.portal === "enterprise") return false;
  if (row.portal === "business") return true;
  return Boolean(row.orgType && row.organisationId);
}

export function getBusinessSession(): BusinessUser | null {
  if (typeof window === "undefined") return null;
  const token = getBusinessStoredToken();
  const raw = readSessionUserRaw();
  if (!token || !raw) {
    cachedUser = null;
    cachedRaw = null;
    return null;
  }
  if (cachedRaw === raw) return cachedUser;
  try {
    const parsed = JSON.parse(raw) as BusinessUser;
    if (!isBusinessStoredUser(parsed)) {
      cachedUser = null;
      cachedRaw = raw;
      return null;
    }
    cachedUser = parsed;
    cachedRaw = raw;
    return cachedUser;
  } catch {
    cachedUser = null;
    cachedRaw = null;
    return null;
  }
}

function businessLoginError(err: unknown) {
  if (!(err instanceof ApiError)) {
    return err instanceof Error ? err.message : "Sign in failed.";
  }
  const message = err.message.toLowerCase();
  if (err.status === 403) {
    if (message.includes("too many")) {
      return "Too many sign-in attempts. Wait 15 minutes, then try again.";
    }
    if (message.includes("verify") || message.includes("not verified")) {
      return err.message || "Verify your email before signing in.";
    }
    return err.message || "Sign in was blocked.";
  }
  if (err.status === 401) {
    if (message.includes("invalid credentials") || message.includes("wrong password")) {
      return "That email or password is incorrect.";
    }
    if (message.includes("user not found") || message.includes("no account")) {
      return "No account for that email. Register your business first, or use the activation email if you were invited.";
    }
    if (message.includes("verify") || message.includes("not verified")) {
      return "Verify your email before signing in.";
    }
    return err.message || "That email or password is incorrect.";
  }
  return err.message || "Sign in failed.";
}

export async function loginBusiness(email: string, password: string) {
  const trimmed = email.trim();
  if (!trimmed || !password) {
    throw new Error("Email and password are required");
  }

  let data;
  try {
    data = await businessLogin(trimmed, password);
  } catch (err) {
    throw new Error(businessLoginError(err));
  }

  const loginMismatch = businessPortalError(
    {
      orgType: orgTypeFrom(data.organisation),
      enterpriseRole: data.role?.enterpriseRole,
      platformRole: data.user?.platformRole,
    },
    false,
  );
  if (loginMismatch) throw new Error(loginMismatch);

  try {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
    const profile = await getBusinessProfile();
    const profileMismatch = requireBusinessPortal(profile);
    if (profileMismatch) throw new Error(profileMismatch);
    const user = userFromProfile(
      profile,
      [data.user.firstName, data.user.lastName].filter(Boolean).join(" "),
      data.siteAccess ?? { siteRole: data.role?.siteRole ?? undefined },
    );
    persist(user, data.accessToken);
    return user;
  } catch (err) {
    clearStored();
    emit();
    if (err instanceof ApiError) throw new Error(businessLoginError(err));
    throw err;
  }
}

export async function completeBusinessSession(accessToken: string) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  try {
    const profile = await getBusinessProfile();
    const mismatch = requireBusinessPortal(profile);
    if (mismatch) throw new Error(mismatch);
    const user = userFromProfile(profile);
    persist(user, accessToken);
    return user;
  } catch (err) {
    clearStored();
    emit();
    throw err;
  }
}

export async function refreshBusinessSession() {
  const token = getBusinessStoredToken();
  if (!token) return null;
  const profile = await getBusinessProfile();
  const mismatch = requireBusinessPortal(profile);
  if (mismatch) {
    logoutBusiness();
    throw new Error(mismatch);
  }
  const previous = getBusinessSession();
  return persist(
    userFromProfile(profile, previous?.name, {
      siteId: previous?.siteId ?? undefined,
      siteRole: previous?.siteRole ?? undefined,
    }),
    token,
    true,
  );
}

/** One background profile check per signed-in user. Network errors keep the session. */
export async function ensureLiveBusinessSession() {
  const user = getBusinessSession();
  if (!user) return null;
  if (liveCheckedId === user.id) return user;
  if (liveCheck) return liveCheck;
  liveCheck = (async () => {
    try {
      const profile = await getBusinessProfile();
      const mismatch = requireBusinessPortal(profile);
      if (mismatch) {
        logoutBusiness();
        return null;
      }
      const token = getBusinessStoredToken();
      if (!token) return user;
      const next =
        persist(
          userFromProfile(profile, user.name, {
            siteId: user.siteId ?? undefined,
            siteRole: user.siteRole ?? undefined,
          }),
          token,
        ) ?? getBusinessSession();
      liveCheckedId = next?.id ?? user.id;
      return next;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        logoutBusiness();
        return null;
      }
      liveCheckedId = user.id;
      return user;
    } finally {
      liveCheck = null;
    }
  })();
  return liveCheck;
}

export function logoutBusiness() {
  if (typeof window === "undefined") return;
  clearStored();
  emit();
}

export function homePathFor(user: BusinessUser | null) {
  if (!user) return "/login?portal=business";
  return "/business/home";
}

if (typeof window !== "undefined") {
  onBusinessUnauthorized(() => logoutBusiness());
}

const subscribe = (onStoreChange: () => void) => {
  listeners.add(onStoreChange);
  const unsub = subscribePortalSession(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
    unsub();
  };
};

export function useBusinessSession() {
  return useSyncExternalStore(subscribe, getBusinessSession, () => null);
}
