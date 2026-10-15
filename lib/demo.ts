import type { SurplusListing } from "@/types/enterprise";
import { demoNetworkSites } from "@/lib/network";

export const demoOrganization = {
  name: "",
  address: "",
  registration: "",
  venueType: "",
  branding: "",
};

export const demoSites = demoNetworkSites;

export const demoListings: SurplusListing[] = [];

export const demoGrowth: { date: string; listings: number; collections: number; claims: number }[] = [];

export const CHART_COLORS = {
  green: "#2D5F4F",
  teal: "#0F766E",
  purple: "#7C6BB0",
  orange: "#F7931E",
};

export const demoUsers: {
  id: string;
  name: string;
  email: string;
  role: string;
  site: string;
  siteId: string;
  status: "Active" | "Invited";
}[] = [];

export const demoActivity: {
  id: string;
  time: string;
  title: string;
  body: string;
  site: string;
  siteId: string;
  type: string;
}[] = [];

export const CHART_TOOLTIP = {
  borderRadius: 12,
  border: "1px solid #E5E7EB",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
  fontSize: 12,
};
