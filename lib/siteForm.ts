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

export type AdminMode = "invite" | "existing" | "later";

export type SiteFormValues = {
  siteName: string;
  siteCode: string;
  place: PickedLocation;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
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

export function emptySiteForm(): SiteFormValues {
  return {
    siteName: "",
    siteCode: "",
    place: { ...DEFAULT_MAP, address: "", postcode: "" },
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    groupId: "",
    territoryId: "",
    clusterId: "",
    collectionDays: ["mon", "tue", "wed", "thu", "fri"],
    collectionFrom: "14:00",
    collectionTo: "17:00",
    collectionInstructions: "",
    adminMode: "later",
    inviteFirstName: "",
    inviteLastName: "",
    inviteEmail: "",
    inviteMobile: "",
    existingUserId: "",
  };
}

export function siteToFormValues(site: OrganizationSite): SiteFormValues {
  const current = resolveSite(site);
  const existing = listUsers().find(
    (user) =>
      user.email === current.email ||
      (user.scope.siteIds?.includes(current.id) && (user.role === "site_admin" || user.role === "group_admin")),
  );
  return {
    siteName: current.name,
    siteCode: current.siteCode,
    place: {
      address: [current.address, current.postCode].filter(Boolean).join(", "),
      postcode: current.postCode,
      lat: DEFAULT_MAP.lat,
      lon: DEFAULT_MAP.lon,
    },
    contactName: current.primaryContact || (current.hasManager ? current.managerName : ""),
    contactEmail: current.email !== "-" ? current.email : "",
    contactPhone: current.mobile !== "-" ? current.mobile : "",
    groupId: current.groupId ?? "",
    territoryId: current.territoryId ?? "",
    clusterId: current.clusterId ?? "",
    collectionDays: site.collectionDays ?? ["mon", "tue", "wed", "thu", "fri"],
    collectionFrom: site.collectionFrom ?? "14:00",
    collectionTo: site.collectionTo ?? "17:00",
    collectionInstructions: site.collectionInstructions ?? "",
    adminMode: site.hasManager ? "existing" : "later",
    inviteFirstName: "",
    inviteLastName: "",
    inviteEmail: "",
    inviteMobile: "",
    existingUserId: existing?.id ?? "",
  };
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
