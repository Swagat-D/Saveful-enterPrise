"use client";

import {
  Activity,
  Bell,
  Building2,
  ChartColumn,
  LayoutDashboard,
  Network,
  ScrollText,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import { roleHas } from "@/lib/permissions";
import { SidebarLink } from "@/types/sidebar";

const iconClass = "h-5 w-5 shrink-0 text-saveful-green";
const childIconClass = "h-4 w-4 shrink-0 text-saveful-green";

export const getEnterpriseSidebarLinks = (user: SessionUser | null = null): SidebarLink[] => {
  const links: SidebarLink[] = [];
  if (!user || roleHas(user, "viewDashboard")) {
    links.push({
      label: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard className={iconClass} />,
    });
  }
  if (!user || roleHas(user, "viewSites")) {
    links.push({
      label: "Sites",
      href: "/sites",
      icon: <Building2 className={iconClass} />,
    });
  }
  if (!user || roleHas(user, "manageUsers")) {
    links.push({
      label: "Users & Access",
      href: "/users",
      icon: <Users className={iconClass} />,
    });
  }
  if (!user || roleHas(user, "viewActivity")) {
    links.push({
      label: "Activity",
      href: "/activity",
      icon: <Activity className={iconClass} />,
    });
  }
  if (!user || roleHas(user, "viewInsights")) {
    links.push({
      label: "Insights & Reports",
      href: "/insights",
      icon: <ChartColumn className={iconClass} />,
    });
  }

  const settingsChildren: SidebarLink[] = [
    (!user || roleHas(user, "manageSettings")) && {
      label: "Organisation Profile",
      href: "/settings/profile",
      icon: <Building2 className={childIconClass} />,
    },
    (!user || roleHas(user, "manageStructure")) && {
      label: "Organisation Structure",
      href: "/settings/structure",
      icon: <Network className={childIconClass} />,
    },
    (!user || roleHas(user, "manageSettings")) && {
      label: "Roles & Permissions",
      href: "/settings/roles",
      icon: <Shield className={childIconClass} />,
    },
    (!user || roleHas(user, "manageSettings")) && {
      label: "Notifications",
      href: "/settings/notifications",
      icon: <Bell className={childIconClass} />,
    },
  ].filter(Boolean) as SidebarLink[];
  if (settingsChildren.length) {
    links.push({
      label: "Enterprise Settings",
      href: settingsChildren[0]?.href ?? "/settings",
      icon: <Settings className={iconClass} />,
      children: settingsChildren,
    });
  }
  if (!user || roleHas(user, "viewAudit")) {
    links.push({
      label: "Audit Log",
      href: "/audit",
      icon: <ScrollText className={iconClass} />,
    });
  }

  return links;
};
