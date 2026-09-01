export type BusinessRole = "restaurant_single" | "restaurant_multi" | "farm_business";

export type BusinessOrgType = "BUSINESS_SINGLE" | "BUSINESS_MULTI" | "FARMER_PRODUCER";

export type BusinessOrgRole = "SUPER_ADMIN" | "ORG_MEMBER" | "ORG_ADMIN" | string;

export type BillingCycle = "MONTHLY" | "ANNUAL";

export type SubscriptionStatus =
  | "TRIALING"
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELLED"
  | "EXPIRED"
  | "INCOMPLETE"
  | string;

export type BusinessUser = {
  portal?: "business";
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  organization: string;
  organisationId: number;
  orgType: BusinessOrgType;
  orgRole: BusinessOrgRole | null;
  siteRole?: string | null;
  role: BusinessRole;
  isSuperAdmin: boolean;
  logoUrl?: string | null;
  address?: string | null;
  phoneNumber?: string | null;
  venueType?: string | null;
  brandName?: string | null;
  registrationNumber?: string | null;
  createdAt?: string | null;
  siteId?: number | null;
  profile?: BusinessProfile;
};

export type BusinessSite = {
  id: number;
  name: string;
  address: string;
  postcode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isActive?: boolean;
  managers?: Array<{
    userId: number;
    user?: { firstName?: string; lastName?: string; email?: string; phoneNumber?: string };
  }>;
  staff?: Array<{
    userId: number;
    user?: { firstName?: string; lastName?: string; email?: string; phoneNumber?: string };
  }>;
};

export type BusinessProfile = {
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string | null;
    platformRole: string;
  };
  organisation: {
    id: number;
    name: string;
    type?: string;
    organizationType?: string;
    registrationNumber?: string | null;
    address?: string | null;
    businessAddress?: string | null;
    brandName?: string | null;
    venueType?: string | null;
    logoUrl?: string | null;
    createdAt?: string | null;
    region?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  role: {
    platformRole: string;
    orgRole: string | null;
    enterpriseRole?: string | null;
    siteRole: string | null;
  };
  subscription?: {
    plan?: { name?: string | null; displayName?: string | null };
    status?: string | null;
  } | null;
  sites: Array<{
    id: number;
    locationName?: string;
    name?: string;
    organisationName?: string;
    address?: string;
    postcode?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    isActive?: boolean;
  }>;
  site?: {
    id: number;
    locationName?: string;
    name?: string;
    organisationName?: string;
    address?: string;
    postcode?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    isActive?: boolean;
  };
};

export type AvailablePlan = {
  id: number;
  name: string;
  displayName: string;
  description: string | null;
  priceMonthly: number | null;
  priceAnnual: number | null;
  currency: string;
  isPerSite: boolean;
  contactSalesOnly: boolean;
  isMostPopular: boolean;
  maxSites: number | null;
  maxUserPerSite: number | null;
  features: string[];
  inheritsFrom?: string | null;
};

export type Entitlements = {
  billingRequired: boolean;
  entitled: boolean;
  status: SubscriptionStatus | null;
  planId: number | null;
  planName: string | null;
  planDisplayName: string | null;
  billingCycle: BillingCycle | null;
  quantity: number | null;
  maxSites: number | null;
  maxUserPerSite: number | null;
  features: string[];
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  freeTrialAvailable: boolean;
  pendingPlanId?: number | null;
  pendingPlanDisplayName?: string | null;
  pendingBillingCycle?: BillingCycle | null;
  pendingChangeEffectiveAt?: string | null;
};

export const BUSINESS_ROLES: Record<
  BusinessRole,
  { label: string; title: string; description: string; orgType: BusinessOrgType }
> = {
  restaurant_single: {
    label: "Single Site",
    title: "I have a Business with a Single Site",
    description: "One location — a cafe, restaurant, supermarket or similar",
    orgType: "BUSINESS_SINGLE",
  },
  restaurant_multi: {
    label: "Multi Site",
    title: "I have a Business with Multiple Sites",
    description: "Manage surplus across multiple locations — groups, franchises and operators",
    orgType: "BUSINESS_MULTI",
  },
  farm_business: {
    label: "Farm / Producer",
    title: "Farm / Producer",
    description: "Farms or producers with surplus",
    orgType: "FARMER_PRODUCER",
  },
};

export const RESTAURANT_VENUES = [
  { label: "Bakery", value: "BAKERY" },
  { label: "Cafe / Restaurant", value: "CAFE_RESTAURANT" },
  { label: "Caterer", value: "CATERER" },
  { label: "Catering Service", value: "CATERING_SERVICE" },
  { label: "Cloud Kitchen", value: "CLOUD_KITCHEN" },
  { label: "Food Truck", value: "FOOD_TRUCK" },
  { label: "Grocery Store", value: "GROCERY_STORE" },
  { label: "Hotel", value: "HOTEL" },
  { label: "Wedding Venue", value: "WEDDING_VENUE" },
  { label: "Other", value: "OTHER" },
];

export const FARM_VENUES = [
  { label: "Farm", value: "FARM" },
  { label: "Produce / Market Garden", value: "PRODUCE_MARKET_GARDEN" },
  { label: "Livestock Farm", value: "LIVESTOCK_FARM" },
  { label: "Mixed Farm", value: "MIXED_FARM" },
  { label: "Orchard", value: "ORCHARD" },
  { label: "Processing / Packing Facility", value: "PROCESSING_FACILITY" },
  { label: "Other", value: "OTHER" },
];

export const STORE_LINKS = {
  appStore: "https://apps.apple.com/us/app/saveful/id6460647948",
  playStore: "https://play.google.com/store/apps/details?id=com.saveful.business.app&hl=en_IN",
};

export function parseBusinessRole(value: string | undefined | null): BusinessRole | null {
  if (value === "restaurant_single" || value === "restaurant_multi" || value === "farm_business") {
    return value;
  }
  return null;
}

const HEAD_OFFICE_ORG_ROLES = new Set(["SUPER_ADMIN", "HEAD_OFFICE_ADMIN", "HEAD_OFFICE", "ORG_ADMIN"]);
const SITE_ONLY_ROLES = new Set(["SITE_ADMIN", "STAFF", "LOCATION_ADMIN"]);

export function isHeadOfficeOrgRole(orgRole?: string | null) {
  return HEAD_OFFICE_ORG_ROLES.has(String(orgRole ?? "").toUpperCase());
}

export function isSiteOnlyRole(role?: string | null) {
  return SITE_ONLY_ROLES.has(String(role ?? "").toUpperCase());
}

export function roleFromOrgType(
  orgType?: string | null,
  orgRole?: string | null,
  siteRole?: string | null,
): BusinessRole {
  const type = (orgType ?? "").toUpperCase();
  if (type === "BUSINESS_MULTI") {
    if (isHeadOfficeOrgRole(orgRole)) return "restaurant_multi";
    if (isSiteOnlyRole(siteRole) || isSiteOnlyRole(orgRole)) return "restaurant_single";
    if (String(orgRole ?? "").toUpperCase() === "ORG_MEMBER") return "restaurant_single";
    return "restaurant_multi";
  }
  if (type === "FARMER_PRODUCER") return "farm_business";
  return "restaurant_single";
}

export function isBusinessOrgType(value?: string | null): value is BusinessOrgType {
  const type = (value ?? "").toUpperCase();
  return type === "BUSINESS_SINGLE" || type === "BUSINESS_MULTI" || type === "FARMER_PRODUCER";
}

export function isCharityOrgType(value?: string | null) {
  const type = (value ?? "").toUpperCase();
  return (
    type.includes("CHARITY") ||
    type.includes("FOOD_BANK") ||
    type.includes("FOODBANK") ||
    type === "FARMER_CONSUMER"
  );
}

export function statusLabel(status: SubscriptionStatus | null) {
  if (status === "TRIALING") return "Trial";
  if (status === "ACTIVE") return "Active";
  if (status === "PAST_DUE") return "Payment due";
  if (status === "EXPIRED") return "Expired";
  if (status === "CANCELLED") return "Cancelled";
  return status || "No plan";
}
