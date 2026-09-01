"use client";

import {
  BarChart3,
  Bell,
  CreditCard,
  Home,
  Store,
  UserRound,
} from "lucide-react";
import { isBusinessLocationUser } from "@/lib/businessHqSite";
import type { BusinessUser } from "@/lib/businessTypes";
import type { SidebarLink } from "@/types/sidebar";

const iconClass = "h-5 w-5 shrink-0 text-saveful-green";

export function getBusinessSidebarLinks(user: BusinessUser | null): SidebarLink[] {
  const insightsLabel = user?.role === "farm_business" ? "Impact" : "Insights";
  const links: SidebarLink[] = [
    { label: "Home", href: "/business/home", icon: <Home className={iconClass} /> },
    { label: "Listings", href: "/business/listings", icon: <Store className={iconClass} /> },
    { label: insightsLabel, href: "/business/insights", icon: <BarChart3 className={iconClass} /> },
    { label: "Updates", href: "/business/updates", icon: <Bell className={iconClass} /> },
    { label: "Account", href: "/business/account", icon: <UserRound className={iconClass} /> },
  ];
  if (!isBusinessLocationUser(user)) {
    links.push({ label: "Plans", href: "/business/plans", icon: <CreditCard className={iconClass} /> });
  }
  return links;
}

export function businessRoleLabel(user: BusinessUser | null) {
  if (user?.role === "restaurant_multi") return "Multi site";
  if (user?.role === "farm_business") return "Farm / Producer";
  return "Single site";
}
