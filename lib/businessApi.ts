import { API_BASE_URL, ApiError } from "@/lib/api";
import { readAccessToken } from "@/lib/portalSession";
import type {
  AvailablePlan,
  BillingCycle,
  BusinessProfile,
  Entitlements,
} from "@/lib/businessTypes";

type FetchOptions = RequestInit & { auth?: boolean; optional?: boolean };

function messageFromBody(body: unknown, fallback: string) {
  if (!body || typeof body !== "object") return fallback;
  const message = (body as { message?: unknown }).message;
  if (Array.isArray(message)) {
    const joined = message.filter((item) => typeof item === "string" && item.trim()).join(". ");
    return joined || fallback;
  }
  if (typeof message === "string" && message.trim()) return message;
  return fallback;
}

export function getBusinessToken() {
  return readAccessToken();
}

let unauthorizedHandler: (() => void) | null = null;

export function onBusinessUnauthorized(handler: () => void) {
  unauthorizedHandler = handler;
}

export async function businessFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { auth = false, optional = false, headers, ...rest } = options;
  const nextHeaders = new Headers(headers);
  if (rest.body && !(rest.body instanceof FormData) && !nextHeaders.has("Content-Type")) {
    nextHeaders.set("Content-Type", "application/json");
  }
  if (auth) {
    const token = getBusinessToken();
    if (token) nextHeaders.set("Authorization", `Bearer ${token}`);
  }

  const requestInit: RequestInit = { ...rest };
  if ([...nextHeaders.keys()].length > 0) {
    requestInit.headers = nextHeaders;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`, requestInit);
  } catch {
    throw new ApiError("Unable to reach Saveful. Check your connection and try again.", 0);
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    if (auth && !optional && response.status === 401) unauthorizedHandler?.();
    const code =
      body && typeof body === "object" && typeof (body as { error?: unknown }).error === "string"
        ? (body as { error: string }).error
        : undefined;
    throw new ApiError(messageFromBody(body, `Request failed (${response.status})`), response.status, code);
  }
  if (body && typeof body === "object" && "data" in body && (body as { data: unknown }).data != null) {
    return (body as { data: T }).data;
  }
  return body as T;
}

export type BusinessLoginSiteAccess = {
  siteId?: number;
  siteRole?: string;
  siteName?: string;
  address?: string;
};

export function businessLogin(email: string, password: string) {
  return businessFetch<{
    accessToken: string;
    user: { id: number; firstName: string; lastName: string; email: string; platformRole: string };
    organisation?: { id: number; name: string; type?: string; organizationType?: string };
    role?: { orgRole?: string | null; siteRole?: string | null; enterpriseRole?: string | null };
    siteAccess?: BusinessLoginSiteAccess | null;
  }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });
}

export async function checkBusinessEmailRegistered(email: string): Promise<boolean> {
  try {
    await businessLogin(email, "__email_availability_probe__");
    return true;
  } catch (err) {
    const message = (err instanceof Error ? err.message : "").toLowerCase();
    if (message.includes("user not found") || message.includes("no account") || message.includes("no user")) {
      return false;
    }
    if (
      message.includes("invalid credentials") ||
      message.includes("wrong password") ||
      message.includes("verify") ||
      message.includes("not verified") ||
      message.includes("already")
    ) {
      return true;
    }
    return false;
  }
}

export function registerBusiness(body: FormData) {
  return businessFetch<{ message: string }>("/auth/register/business", { method: "POST", body });
}

export function registerFarmerProducer(body: FormData) {
  return businessFetch<{ message: string }>("/auth/register/farmer-producer", { method: "POST", body });
}

export function verifyBusinessEmail(email: string, otp: string) {
  return businessFetch<{
    message: string;
    accessToken: string;
    user: { id: number; firstName: string; lastName: string; email: string };
  }>("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ email: email.trim().toLowerCase(), otp }),
  });
}

export function resendBusinessVerification(email: string) {
  return businessFetch<{ message: string }>("/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
}

export function getBusinessProfile() {
  return businessFetch<BusinessProfile>("/auth/profile", { auth: true });
}

export function getAvailablePlans() {
  return businessFetch<{ billingRequired: boolean; currency?: string; plans: AvailablePlan[] }>(
    "/subscriptions/available",
    { auth: true },
  );
}

export function getEntitlements() {
  return businessFetch<Entitlements>("/subscriptions/me", { auth: true, optional: true });
}

export function startBillingTrial(planId: number, billingCycle?: BillingCycle) {
  return businessFetch<{ checkoutUrl: string; sessionId: string; trialDays?: number }>(
    "/billing/trial",
    {
      method: "POST",
      auth: true,
      body: JSON.stringify({ planId, billingCycle }),
    },
  );
}

export function startBillingCheckout(planId: number, billingCycle: BillingCycle) {
  return businessFetch<{ checkoutUrl: string; sessionId: string }>("/billing/checkout", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ planId, billingCycle }),
  });
}

export function previewPlanChange(planId: number, billingCycle?: BillingCycle) {
  return businessFetch<{
    direction: "UPGRADE" | "DOWNGRADE";
    currency: string;
    amountDueToday: number;
    recurringAmount: number;
    effectiveAt: string;
    nextBillingDate: string | null;
    planDisplayName: string;
    billingCycle: BillingCycle;
  }>("/billing/change-plan/preview", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ planId, billingCycle }),
  });
}

export function changeBusinessPlan(planId: number, billingCycle?: BillingCycle) {
  return businessFetch<{
    type: "UPGRADED" | "SCHEDULED";
    planId: number;
    planDisplayName: string;
    billingCycle: BillingCycle;
    effectiveAt: string;
    nextBillingDate: string | null;
    message: string;
  }>("/billing/change-plan", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ planId, billingCycle }),
  });
}

export function cancelPendingPlanChange() {
  return businessFetch<{ message: string }>("/billing/change-plan/pending", {
    method: "DELETE",
    auth: true,
  });
}

export function cancelBusinessSubscription() {
  return businessFetch<{ message: string; accessUntil?: string | null }>("/billing/cancel", {
    method: "POST",
    auth: true,
  });
}

export function resumeBusinessSubscription() {
  return businessFetch<{ message: string; nextBillingDate?: string | null }>("/billing/resume", {
    method: "POST",
    auth: true,
  });
}

export function openBillingPortal() {
  return businessFetch<{ portalUrl: string }>("/billing/portal", { method: "POST", auth: true });
}

export function submitEnterpriseEnquiry(payload: {
  firstName: string;
  lastName: string;
  businessName: string;
  businessType: string;
  mobile: string;
  locationBand: string;
  contactWindow: string;
  message?: string;
}) {
  return businessFetch<{ message: string }>("/billing/enterprise-enquiry", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function getBusinessOrganisation() {
  return businessFetch<{
    sites?: Array<{
      id: number;
      siteName: string;
      locationName?: string;
      name?: string;
      address: string;
      postcode?: string | null;
      postCode?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      isActive?: boolean;
      createdAt?: string;
      contactName?: string | null;
      contactEmail?: string | null;
      phoneNumber?: string | null;
      contactMobile?: string | null;
      managers?: Array<{
        userId: number;
        siteRole?: string;
        user?: { firstName?: string; lastName?: string; email?: string; phoneNumber?: string };
      }>;
      staff?: Array<{
        userId: number;
        siteRole?: string;
        user?: { firstName?: string; lastName?: string; email?: string; phoneNumber?: string };
      }>;
    }>;
    organisation?: { id: number; name: string; address?: string | null; logoUrl?: string | null };
    site?: {
      id: number;
      siteName: string;
      address: string;
      postcode?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      isActive?: boolean;
    };
  }>("/sites/organisation", { auth: true });
}

export function createBusinessSite(input: {
  siteName: string;
  address: string;
  postcode: string;
  latitude: number;
  longitude: number;
}) {
  return businessFetch<unknown>("/sites", {
    method: "POST",
    auth: true,
    body: JSON.stringify({
      siteName: String(input.siteName ?? "").trim(),
      address: String(input.address ?? "").trim(),
      postcode: String(input.postcode ?? "").trim(),
      latitude: Number(input.latitude),
      longitude: Number(input.longitude),
    }),
  });
}

export function listBusinessListings(orgId: number) {
  return businessFetch<unknown>(`/food-listings/org/${orgId}?page=1&limit=200`, { auth: true });
}

export function listBusinessSiteListings() {
  return businessFetch<unknown>("/food-listings/site", { auth: true });
}

export function getBusinessListing(id: number) {
  return businessFetch<unknown>(`/food-listings/${id}`, { auth: true });
}

export function cancelBusinessListing(id: number) {
  return businessFetch<unknown>(`/food-listings/${id}`, { method: "DELETE", auth: true });
}

export type CreateBusinessListingInput = {
  siteId: number;
  listingType: "HUMAN" | "ANIMAL" | "BOTH";
  pickupAddress: string;
  pickupPostcode?: string;
  pickupLat: number;
  pickupLng: number;
  bestBefore: string;
  pickupFromTime?: string;
  pickupByTime?: string;
  foodItems: Array<{ name: string; totalQtyKg: number; unit?: string; category?: string }>;
  needsRefrigeration?: boolean;
  needsAmbient?: boolean;
  needsFreezer?: boolean;
  needsHot?: boolean;
  needsReheating?: boolean;
  isSafeForDonation?: boolean;
  allergens?: string[];
  photos?: File[];
};

function listingFoodItems(input: CreateBusinessListingInput) {
  return input.foodItems.map((item) => ({
    name: String(item.name).trim(),
    totalQtyKg: Number(item.totalQtyKg),
    unit: item.unit?.trim() || "kg",
    category: item.category?.trim() || String(item.name).trim(),
  }));
}

export function createBusinessListing(input: CreateBusinessListingInput) {
  const foodItems = listingFoodItems(input);
  const photos = input.photos?.slice(0, 5) ?? [];
  if (photos.length) {
    const form = new FormData();
    form.append("siteId", String(input.siteId));
    form.append("listingType", input.listingType);
    form.append("pickupAddress", input.pickupAddress);
    if (input.pickupPostcode) form.append("pickupPostcode", input.pickupPostcode);
    form.append("pickupLat", String(input.pickupLat));
    form.append("pickupLng", String(input.pickupLng));
    form.append("bestBefore", input.bestBefore);
    if (input.pickupFromTime) form.append("pickupFromTime", input.pickupFromTime);
    if (input.pickupByTime) form.append("pickupByTime", input.pickupByTime);
    if (typeof input.needsRefrigeration === "boolean") form.append("needsRefrigeration", String(input.needsRefrigeration));
    if (typeof input.needsAmbient === "boolean") form.append("needsAmbient", String(input.needsAmbient));
    if (typeof input.needsFreezer === "boolean") form.append("needsFreezer", String(input.needsFreezer));
    if (typeof input.needsHot === "boolean") form.append("needsHot", String(input.needsHot));
    if (typeof input.needsReheating === "boolean") form.append("needsReheating", String(input.needsReheating));
    if (typeof input.isSafeForDonation === "boolean") form.append("isSafeForDonation", String(input.isSafeForDonation));
    form.append("allergens", JSON.stringify(input.allergens ?? []));
    form.append("photoUrls", JSON.stringify([]));
    form.append("foodItems", JSON.stringify(foodItems));
    photos.forEach((file, index) => {
      form.append("photos", file, file.name || `listing-photo-${index + 1}.jpg`);
    });
    return businessFetch<{ id: number }>("/food-listings", { method: "POST", auth: true, body: form });
  }

  return businessFetch<{ id: number }>("/food-listings", {
    method: "POST",
    auth: true,
    body: JSON.stringify({
      siteId: Number(input.siteId),
      listingType: input.listingType,
      pickupAddress: input.pickupAddress,
      pickupPostcode: input.pickupPostcode,
      pickupLat: Number(input.pickupLat),
      pickupLng: Number(input.pickupLng),
      bestBefore: input.bestBefore,
      pickupFromTime: input.pickupFromTime,
      pickupByTime: input.pickupByTime,
      needsRefrigeration: Boolean(input.needsRefrigeration),
      needsAmbient: Boolean(input.needsAmbient),
      needsFreezer: Boolean(input.needsFreezer),
      needsHot: Boolean(input.needsHot),
      needsReheating: Boolean(input.needsReheating),
      isSafeForDonation: input.isSafeForDonation ?? true,
      allergens: input.allergens ?? [],
      foodItems,
    }),
  });
}

export function inviteSiteManager(
  siteId: number,
  input: { firstName: string; lastName: string; email: string; password: string; phoneNumber?: string },
) {
  return businessFetch<{ message: string }>(`/sites/${siteId}/assign-manager`, {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
}

export function updateBusinessProfile(phoneNumber: string) {
  return businessFetch<{ message?: string }>("/auth/profile", {
    method: "PATCH",
    auth: true,
    body: JSON.stringify({ phoneNumber }),
  });
}

export function updateBusinessOrganisation(orgId: number, body: FormData) {
  return businessFetch<{ organisation?: { logoUrl?: string | null } }>(`/organization/${orgId}`, {
    method: "PATCH",
    auth: true,
    body,
  });
}

export function updateBusinessSite(
  siteId: number,
  input: {
    siteName?: string;
    address?: string;
    postcode?: string;
    latitude?: number;
    longitude?: number;
    contactName?: string;
    contactEmail?: string;
    phoneNumber?: string;
  },
) {
  return businessFetch<{ message?: string }>(`/sites/${siteId}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(input),
  });
}

export function deleteBusinessSite(siteId: number) {
  return businessFetch<{ message?: string }>(`/sites/${siteId}`, {
    method: "DELETE",
    auth: true,
  });
}

export function removeSiteAccess(siteId: number, userId: number) {
  return businessFetch<{ message?: string }>(`/sites/${siteId}/access/${userId}`, {
    method: "DELETE",
    auth: true,
  });
}

export function updateBusinessOrganisationCoordinates(
  orgId: number,
  input: { latitude: number; longitude: number },
) {
  return businessFetch<{ message?: string }>(`/organization/ccordinates/${orgId}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(input),
  });
}

export function listSitePeople(siteId: number) {
  return businessFetch<{
    site?: { id: number; siteName: string };
    managers?: Array<{ userId: number; user?: { firstName?: string; lastName?: string; email?: string } }>;
    staff?: Array<{ userId: number; user?: { firstName?: string; lastName?: string; email?: string } }>;
  }>(`/sites/${siteId}/details`, { auth: true });
}

export type ProviderFeedbackPayload = {
  didCollect: boolean;
  rating?: number;
  ratingNote?: string;
};

export function submitProviderFeedback(claimId: number, payload: ProviderFeedbackPayload) {
  return businessFetch<unknown>(`/claims/${claimId}/provider-feedback`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(payload),
  });
}
