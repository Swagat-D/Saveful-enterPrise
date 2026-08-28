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
