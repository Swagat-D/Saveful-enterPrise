import type { SurplusListing } from "@/types/enterprise";
import { demoNetworkSites } from "@/lib/network";

export const demoOrganization = {
  name: "Harbour Kitchen Group",
  address: "14 Circular Quay, Sydney NSW 2000",
  registration: "ABN 12 345 678 901",
  venueType: "Cafe / restaurant group",
  branding: "Harbour Kitchen",
};

export const demoSites = demoNetworkSites;

export const demoListings: SurplusListing[] = [
  {
    id: "l1",
    siteId: "hq",
    siteName: "Harbour Kitchen HQ",
    title: "Evening bread and pastries",
    quantityKg: 12,
    status: "ACTIVE",
    audience: "HUMAN",
    pickupWindow: "Today · 8:00 pm – 9:30 pm",
  },
  {
    id: "l2",
    siteId: "2",
    siteName: "Surry Hills Kitchen",
    title: "Prepared meals and rice",
    quantityKg: 18,
    status: "CLAIMED",
    audience: "HUMAN",
    pickupWindow: "Today · 9:00 pm – 10:00 pm",
  },
  {
    id: "l3",
    siteId: "3",
    siteName: "Parramatta Cafe",
    title: "Vegetable trimmings",
    quantityKg: 8,
    status: "COLLECTED",
    audience: "ANIMAL",
    pickupWindow: "Yesterday · 7:00 pm – 8:00 pm",
  },
];

const day = (offset: number) => {
  const date = new Date();
  date.setDate(date.getDate() - offset);
  return date.toISOString().slice(0, 10);
};

export const demoGrowth = [
  { date: day(6), listings: 2, collections: 1, claims: 1 },
  { date: day(5), listings: 3, collections: 2, claims: 2 },
  { date: day(4), listings: 1, collections: 1, claims: 0 },
  { date: day(3), listings: 4, collections: 2, claims: 3 },
  { date: day(2), listings: 2, collections: 3, claims: 1 },
  { date: day(1), listings: 5, collections: 2, claims: 4 },
  { date: day(0), listings: 3, collections: 2, claims: 2 },
];

export const CHART_COLORS = {
  green: "#2D5F4F",
  teal: "#0F766E",
  purple: "#7C6BB0",
  orange: "#F7931E",
};

export const demoUsers = [
  {
    id: "u1",
    name: "Alex Morgan",
    email: "alex@harbourkitchen.com",
    role: "Head admin",
    site: "All sites",
    siteId: "all",
    status: "Active" as const,
  },
  {
    id: "u2",
    name: "Priya Nair",
    email: "priya@harbourkitchen.com",
    role: "Site manager",
    site: "Surry Hills Kitchen",
    siteId: "2",
    status: "Active" as const,
  },
  {
    id: "u3",
    name: "Jamie Chen",
    email: "jamie@harbourkitchen.com",
    role: "Staff",
    site: "Harbour Kitchen HQ",
    siteId: "hq",
    status: "Active" as const,
  },
  {
    id: "u4",
    name: "Sam Reid",
    email: "sam@harbourkitchen.com",
    role: "Site manager",
    site: "Parramatta Cafe",
    siteId: "3",
    status: "Invited" as const,
  },
  ...demoNetworkSites
    .filter((site) => site.hasManager && site.id !== "2")
    .map((site) => ({
      id: `mgr-${site.id}`,
      name: site.managerName,
      email: site.email,
      role: site.siteType === "head_office" ? "Head admin" : "Site manager",
      site: site.name,
      siteId: site.id,
      status: "Active" as const,
    })),
];

export const demoRoles = [
  {
    id: "super",
    name: "Enterprise Super Admin",
    description: "What they can do: full administration and reporting across the Enterprise.",
    users: 1,
    permissions: ["Entire Enterprise", "Users", "Settings", "Reports", "Listings"],
  },
  {
    id: "enterprise",
    name: "Enterprise Admin",
    description: "What they can do: manage sites, users, and settings across the Enterprise or selected areas.",
    users: 1,
    permissions: ["Enterprise or selected scope", "Users", "Settings", "Reports"],
  },
  {
    id: "group",
    name: "Group Admin",
    description: "What they can do: administer users and sites inside assigned groups.",
    users: 2,
    permissions: ["Assigned groups", "Local users", "Site setup", "Reports"],
  },
  {
    id: "reporting",
    name: "Reporting User",
    description: "What they can do: view reports for an assigned Group, Territory, Cluster or Site.",
    users: 2,
    permissions: ["Assigned scope", "Reports"],
  },
  {
    id: "site",
    name: "Site Admin",
    description: "What they can do: run assigned sites, listings, and local access.",
    users: 5,
    permissions: ["Assigned sites", "Local users", "Listings", "Site reports"],
  },
];

export const demoActivity = [
  {
    id: "a1",
    time: "Today · 10:42 am",
    title: "Surry Hills listing claimed",
    body: "A nearby charity claimed 18 kg of prepared meals. Pickup is tonight 9:00–10:00 pm.",
    site: "Surry Hills Kitchen",
    siteId: "2",
    type: "Collection",
  },
  {
    id: "a2",
    time: "Today · 9:15 am",
    title: "Sam Reid invited as site manager",
    body: "Invite sent for Parramatta Cafe. Access is pending until they accept.",
    site: "Parramatta Cafe",
    siteId: "3",
    type: "Users",
  },
  {
    id: "a3",
    time: "Yesterday · 8:20 pm",
    title: "HQ collection completed",
    body: "Evening bread and pastries were collected. Impact will appear in Insights.",
    site: "Harbour Kitchen HQ",
    siteId: "hq",
    type: "Collection",
  },
  {
    id: "a4",
    time: "Yesterday · 4:05 pm",
    title: "Parramatta Cafe needs a manager",
    body: "Assign access so this branch can list surplus without HQ doing it for them.",
    site: "Parramatta Cafe",
    siteId: "3",
    type: "Alert",
  },
];

export const CHART_TOOLTIP = {
  borderRadius: 12,
  border: "1px solid #E5E7EB",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
  fontSize: 12,
};
