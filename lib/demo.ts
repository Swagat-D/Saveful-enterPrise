import type { OrganizationSite, SurplusListing } from "@/types/enterprise";

export const demoOrganization = {
  name: "Harbour Kitchen Group",
  address: "14 Circular Quay, Sydney NSW 2000",
};

export const demoSites: OrganizationSite[] = [
  {
    id: "hq",
    siteType: "head_office",
    name: "Harbour Kitchen HQ",
    address: "14 Circular Quay, Sydney NSW",
    postCode: "2000",
    managerName: "Head office",
    email: "hq@harbourkitchen.com",
    mobile: "+61 400 111 222",
    hasManager: true,
    isDefault: true,
  },
  {
    id: "2",
    parentId: "hq",
    siteType: "branch",
    name: "Surry Hills Kitchen",
    address: "88 Crown Street, Surry Hills NSW",
    postCode: "2010",
    managerName: "Priya Nair",
    email: "surryhills@harbourkitchen.com",
    mobile: "+61 400 333 444",
    hasManager: true,
    isDefault: false,
  },
  {
    id: "3",
    parentId: "hq",
    siteType: "branch",
    name: "Parramatta Cafe",
    address: "21 Church Street, Parramatta NSW",
    postCode: "2150",
    managerName: "No manager assigned",
    email: "-",
    mobile: "-",
    hasManager: false,
    isDefault: false,
  },
];

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

export const CHART_TOOLTIP = {
  borderRadius: 12,
  border: "1px solid #E5E7EB",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
  fontSize: 12,
};
