"use client";

import { useSyncExternalStore } from "react";

export type OrgCurrency = "AUD" | "NZD" | "GBP" | "USD" | "EUR" | "SGD";
export type OrgUnits = "metric" | "imperial";
export type AccountStatus = "Active";

export type OrganizationProfile = {
  name: string;
  enterpriseId: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  logoDataUrl: string | null;
  country: string;
  timezone: string;
  currency: OrgCurrency;
  units: OrgUnits;
  accountStatus: AccountStatus;
  contractStart: string;
  contractEnd: string;
  billingFrequency: string;
  plan: string;
};

export type EditableOrganization = Pick<
  OrganizationProfile,
  "name" | "contactName" | "contactEmail" | "contactPhone" | "logoDataUrl" | "country" | "timezone" | "currency" | "units"
>;

export const ORG_COUNTRIES = [
  { id: "AU", name: "Australia", locale: "en-AU" },
  { id: "NZ", name: "New Zealand", locale: "en-NZ" },
  { id: "GB", name: "United Kingdom", locale: "en-GB" },
  { id: "US", name: "United States", locale: "en-US" },
  { id: "IE", name: "Ireland", locale: "en-IE" },
  { id: "SG", name: "Singapore", locale: "en-SG" },
] as const;

export const ORG_TIMEZONES = [
  { id: "Australia/Sydney", label: "Australian Eastern Standard Time" },
  { id: "Australia/Melbourne", label: "Australian Eastern Time (Melbourne)" },
  { id: "Australia/Brisbane", label: "Australian Eastern Standard Time (Brisbane)" },
  { id: "Australia/Perth", label: "Australian Western Standard Time" },
  { id: "Pacific/Auckland", label: "New Zealand Standard Time" },
  { id: "Europe/London", label: "Greenwich Mean Time" },
  { id: "America/New_York", label: "Eastern Time" },
  { id: "America/Los_Angeles", label: "Pacific Time" },
  { id: "Asia/Singapore", label: "Singapore Time" },
] as const;

export const ORG_CURRENCIES: { id: OrgCurrency; label: string }[] = [
  { id: "AUD", label: "AUD — Australian Dollar" },
  { id: "NZD", label: "NZD — New Zealand Dollar" },
  { id: "GBP", label: "GBP — British Pound" },
  { id: "USD", label: "USD — United States Dollar" },
  { id: "EUR", label: "EUR — Euro" },
  { id: "SGD", label: "SGD — Singapore Dollar" },
];

export const ORG_UNITS: { id: OrgUnits; label: string }[] = [
  { id: "metric", label: "Metric (kg)" },
  { id: "imperial", label: "Imperial (lb)" },
];

const PROVISIONED = {
  enterpriseId: "ENT-AU-001284",
  accountStatus: "Active" as const,
  contractStart: "2026-07-01",
  contractEnd: "2028-06-30",
  billingFrequency: "Annual",
  plan: "Enterprise",
};

export const DEFAULT_ORGANIZATION: OrganizationProfile = {
  name: "Harbour Kitchen Group",
  contactName: "Alex Morgan",
  contactEmail: "alex@harbourkitchen.com",
  contactPhone: "+61 400 111 222",
  logoDataUrl: null,
  country: "AU",
  timezone: "Australia/Sydney",
  currency: "AUD",
  units: "metric",
  ...PROVISIONED,
};

const STORAGE_KEY = "enterprise_organization_profile";
const listeners = new Set<() => void>();
let version = 0;
let cache: OrganizationProfile | null = null;

function emit() {
  version += 1;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useOrganizationVersion() {
  return useSyncExternalStore(subscribe, () => version, () => 0);
}

function isCurrency(value: string): value is OrgCurrency {
  return ORG_CURRENCIES.some((item) => item.id === value);
}

function isUnits(value: string): value is OrgUnits {
  return ORG_UNITS.some((item) => item.id === value);
}

function normalize(raw: Partial<OrganizationProfile> | null): OrganizationProfile {
  const country = ORG_COUNTRIES.some((item) => item.id === raw?.country) ? raw!.country! : DEFAULT_ORGANIZATION.country;
  const timezone = ORG_TIMEZONES.some((item) => item.id === raw?.timezone) ? raw!.timezone! : DEFAULT_ORGANIZATION.timezone;
  return {
    ...DEFAULT_ORGANIZATION,
    name: raw?.name?.trim() || DEFAULT_ORGANIZATION.name,
    contactName: raw?.contactName ?? DEFAULT_ORGANIZATION.contactName,
    contactEmail: raw?.contactEmail ?? DEFAULT_ORGANIZATION.contactEmail,
    contactPhone: raw?.contactPhone ?? DEFAULT_ORGANIZATION.contactPhone,
    logoDataUrl: raw?.logoDataUrl ?? null,
    country,
    timezone,
    currency: raw?.currency && isCurrency(raw.currency) ? raw.currency : DEFAULT_ORGANIZATION.currency,
    units: raw?.units && isUnits(raw.units) ? raw.units : DEFAULT_ORGANIZATION.units,
    ...PROVISIONED,
  };
}

export function getOrganization(): OrganizationProfile {
  if (typeof window === "undefined") return DEFAULT_ORGANIZATION;
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cache = normalize(raw ? (JSON.parse(raw) as Partial<OrganizationProfile>) : null);
  } catch {
    cache = DEFAULT_ORGANIZATION;
  }
  return cache;
}

export function organizationLocale(org: OrganizationProfile = getOrganization()) {
  return ORG_COUNTRIES.find((item) => item.id === org.country)?.locale ?? "en-AU";
}

export function organizationCountryName(org: OrganizationProfile = getOrganization()) {
  return ORG_COUNTRIES.find((item) => item.id === org.country)?.name ?? org.country;
}

export function organizationTimezoneLabel(org: OrganizationProfile = getOrganization()) {
  return ORG_TIMEZONES.find((item) => item.id === org.timezone)?.label ?? org.timezone;
}

export function organizationCurrencyLabel(org: OrganizationProfile = getOrganization()) {
  return ORG_CURRENCIES.find((item) => item.id === org.currency)?.label ?? org.currency;
}

export function organizationUnitsLabel(org: OrganizationProfile = getOrganization()) {
  return ORG_UNITS.find((item) => item.id === org.units)?.label ?? org.units;
}

export function editableFrom(org: OrganizationProfile): EditableOrganization {
  return {
    name: org.name,
    contactName: org.contactName,
    contactEmail: org.contactEmail,
    contactPhone: org.contactPhone,
    logoDataUrl: org.logoDataUrl,
    country: org.country,
    timezone: org.timezone,
    currency: org.currency,
    units: org.units,
  };
}

export type OrganizationFieldChange = { field: string; previous: string; next: string };

function describeChange(previous: OrganizationProfile, next: OrganizationProfile): OrganizationFieldChange[] {
  const parts: OrganizationFieldChange[] = [];
  if (previous.name !== next.name) parts.push({ field: "Enterprise name", previous: previous.name, next: next.name });
  if (previous.contactName !== next.contactName) parts.push({ field: "Primary contact", previous: previous.contactName, next: next.contactName });
  if (previous.contactEmail !== next.contactEmail) parts.push({ field: "Contact email", previous: previous.contactEmail, next: next.contactEmail });
  if (previous.contactPhone !== next.contactPhone) parts.push({ field: "Contact phone", previous: previous.contactPhone, next: next.contactPhone });
  if (previous.logoDataUrl !== next.logoDataUrl) {
    parts.push({ field: "Logo", previous: previous.logoDataUrl ? "Uploaded" : "None", next: next.logoDataUrl ? "Updated" : "Removed" });
  }
  if (previous.country !== next.country) {
    parts.push({ field: "Country", previous: organizationCountryName(previous), next: organizationCountryName(next) });
  }
  if (previous.timezone !== next.timezone) {
    parts.push({ field: "Timezone", previous: organizationTimezoneLabel(previous), next: organizationTimezoneLabel(next) });
  }
  if (previous.currency !== next.currency) parts.push({ field: "Currency", previous: previous.currency, next: next.currency });
  if (previous.units !== next.units) {
    parts.push({ field: "Units", previous: organizationUnitsLabel(previous), next: organizationUnitsLabel(next) });
  }
  return parts;
}

export function saveOrganization(draft: EditableOrganization) {
  const previous = getOrganization();
  const next = normalize({ ...previous, ...draft });
  const changes = describeChange(previous, next);
  if (!changes.length) return { organization: previous, changes };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  cache = next;
  emit();
  return { organization: next, changes };
}

