import type { CreateOrganisationSiteInput } from "@/lib/api";
import { demoSites } from "@/lib/demo";
import { resolveSite } from "@/lib/orgStructure";
import { listUsers } from "@/lib/users";
import type { OrganizationSite, Weekday } from "@/types/enterprise";

const DEFAULT_MAP = { lat: -33.861, lon: 151.211 };

export type PickedLocation = {
  address: string;
  postcode: string;
  lat: number;
  lon: number;
};

export const WEEKDAYS: { id: Weekday; label: string }[] = [
  { id: "mon", label: "Mon" },
  { id: "tue", label: "Tue" },
  { id: "wed", label: "Wed" },
  { id: "thu", label: "Thu" },
  { id: "fri", label: "Fri" },
  { id: "sat", label: "Sat" },
  { id: "sun", label: "Sun" },
];

export const TIME_OPTIONS = Array.from({ length: 34 }, (_, index) => {
  const minutes = 6 * 60 + index * 30;
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return { value, label: `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}` };
});

export type AdminMode = "invite" | "existing";

export type SiteFormValues = {
  siteName: string;
  siteCode: string;
  place: PickedLocation;
  groupId: string;
  territoryId: string;
  clusterId: string;
  collectionDays: Weekday[];
  collectionFrom: string;
  collectionTo: string;
  collectionInstructions: string;
  adminMode: AdminMode;
  inviteFirstName: string;
  inviteLastName: string;
  inviteEmail: string;
  inviteMobile: string;
  existingUserId: string;
};

export type SiteFormDraft = {
  organisationId?: string;
  siteId?: string;
  values: SiteFormValues;
  savedAt: string;
};

function draftKey(variant: "admin" | "enterprise", siteId?: string) {
  return siteId
    ? `saveful_edit_site_draft_${variant}_${siteId}`
    : `saveful_add_site_draft_${variant}`;
}

export function loadSiteFormDraft(variant: "admin" | "enterprise", siteId?: string): SiteFormDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(draftKey(variant, siteId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SiteFormDraft;
    if (!parsed?.values) return null;
    if (siteId && parsed.siteId && parsed.siteId !== siteId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSiteFormDraft(
  variant: "admin" | "enterprise",
  values: SiteFormValues,
  organisationId?: string,
  siteId?: string,
) {
  if (typeof window === "undefined") return;
  const draft: SiteFormDraft = {
    organisationId,
    siteId,
    values,
    savedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(draftKey(variant, siteId), JSON.stringify(draft));
}

export function clearSiteFormDraft(variant: "admin" | "enterprise", siteId?: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(draftKey(variant, siteId));
}

export function emptySiteForm(): SiteFormValues {
  return {
    siteName: "",
    siteCode: "",
    place: { ...DEFAULT_MAP, address: "", postcode: "" },
    groupId: "",
    territoryId: "",
    clusterId: "",
    collectionDays: ["mon", "tue", "wed", "thu", "fri"],
    collectionFrom: "14:00",
    collectionTo: "17:00",
    collectionInstructions: "",
    adminMode: "invite",
    inviteFirstName: "",
    inviteLastName: "",
    inviteEmail: "",
    inviteMobile: "",
    existingUserId: "",
  };
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

export function siteToFormValues(site: OrganizationSite): SiteFormValues {
  const current = resolveSite(site);
  const email = (current.email ?? "").trim().toLowerCase();
  const existing = listUsers().find((user) => {
    if (current.managerUserId && user.id === current.managerUserId) return true;
    if (email && user.email.trim().toLowerCase() === email) return true;
    return Boolean(
      user.scope.siteIds?.includes(current.id) && (user.role === "site_admin" || user.role === "group_admin"),
    );
  });
  const names = splitName(current.managerName || current.primaryContact || "");
  const useExisting = Boolean(existing);
  return {
    siteName: current.name,
    siteCode: current.siteCode,
    place: {
      address: current.address,
      postcode: current.postCode,
      lat: current.latitude ?? DEFAULT_MAP.lat,
      lon: current.longitude ?? DEFAULT_MAP.lon,
    },
    groupId: current.groupId ?? "",
    territoryId: current.territoryId ?? "",
    clusterId: current.clusterId ?? "",
    collectionDays: site.collectionDays ?? ["mon", "tue", "wed", "thu", "fri"],
    collectionFrom: site.collectionFrom ?? "14:00",
    collectionTo: site.collectionTo ?? "17:00",
    collectionInstructions: site.collectionInstructions ?? "",
    adminMode: useExisting ? "existing" : "invite",
    inviteFirstName: names.first,
    inviteLastName: names.last,
    inviteEmail: current.email ?? "",
    inviteMobile: current.mobile ?? "",
    existingUserId: existing?.id ?? current.managerUserId ?? "",
  };
}

export function contactFromSiteAdmin(values: SiteFormValues) {
  if (values.adminMode === "invite") {
    return {
      name: `${values.inviteFirstName} ${values.inviteLastName}`.trim(),
      email: values.inviteEmail.trim(),
      mobile: values.inviteMobile.trim(),
    };
  }
  if (values.adminMode === "existing" && values.existingUserId) {
    const user = listUsers().find((item) => item.id === values.existingUserId);
    if (user) {
      return {
        name: user.name.trim(),
        email: user.email.trim(),
        mobile: (user.mobile ?? "").trim(),
      };
    }
  }
  return null;
}

export function siteFormToApiInput(
  values: SiteFormValues,
  options: { clearUnassigned?: boolean } = {},
): CreateOrganisationSiteInput {
  const contact = contactFromSiteAdmin(values);
  const contactEmail = contact?.email ?? "";
  const contactName = contact?.name ?? "";
  const phoneNumber = contact?.mobile ?? "";

  const input: CreateOrganisationSiteInput = {
    siteName: values.siteName.trim().slice(0, 160),
    address: values.place.address.trim(),
    latitude: Number(values.place.lat),
    longitude: Number(values.place.lon),
    collectionDays: values.collectionDays,
    collectionStartTime: values.collectionFrom,
    collectionEndTime: values.collectionTo,
  };

  if (values.place.postcode.trim()) input.postcode = values.place.postcode.trim().slice(0, 20);
  if (contactName) input.contactName = contactName.slice(0, 120);
  if (contactEmail) input.contactEmail = contactEmail.toLowerCase();
  if (phoneNumber) input.phoneNumber = phoneNumber.slice(0, 30);
  if (values.collectionInstructions.trim()) {
    input.collectionInstructions = values.collectionInstructions.trim().slice(0, 500);
  }

  if (values.groupId) input.groupId = Number(values.groupId);
  else if (options.clearUnassigned) input.groupId = null;

  if (values.clusterId) input.clusterId = Number(values.clusterId);
  else if (options.clearUnassigned) input.clusterId = null;

  if (values.territoryId) input.territoryId = Number(values.territoryId);
  else if (options.clearUnassigned) input.territoryId = null;

  return input;
}

export function isSiteCodeTaken(code: string, excludeSiteId?: string) {
  const value = code.trim().toLowerCase();
  if (!value) return false;
  return demoSites.some(
    (site) => site.id !== excludeSiteId && site.siteCode.trim().toLowerCase() === value,
  );
}

export function formatCollectionHours(days: Weekday[], from: string, to: string) {
  const labels = WEEKDAYS.filter((day) => days.includes(day.id)).map((day) => day.label);
  const dayLabel =
    labels.length === 5 && days.every((day) => !["sat", "sun"].includes(day))
      ? "Mon–Fri"
      : labels.length
        ? labels.join(", ")
        : "No days set";
  const fromLabel = TIME_OPTIONS.find((item) => item.value === from)?.label ?? from;
  const toLabel = TIME_OPTIONS.find((item) => item.value === to)?.label ?? to;
  return `${dayLabel}, ${fromLabel}–${toLabel}`;
}

export function collectionWindowForDate(from: string, to: string, day = new Date()) {
  const [fromH, fromM] = from.split(":").map(Number);
  const [toH, toM] = to.split(":").map(Number);
  const start = new Date(day);
  start.setHours(fromH || 14, fromM || 0, 0, 0);
  const end = new Date(day);
  end.setHours(toH || 17, toM || 0, 0, 0);
  return { start, end };
}
