"use client";

import {
  Activity,
  Bell,
  Building2,
  Calculator,
  ChartColumn,
  CircleAlert,
  FilePlus,
  FileSearch,
  Headphones,
  Home,
  Layers,
  LayoutDashboard,
  Network,
  ScrollText,
  Settings,
  Shield,
  Stethoscope,
  Store,
  UserCheck,
  Users,
  UsersRound,
} from "lucide-react";
import { adminFiltersToQuery, lastAdminFilters } from "@/lib/admin";
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

export const getAdminSidebarLinks = (): SidebarLink[] => {
  const query = adminFiltersToQuery(lastAdminFilters());
  return [
    { label: "Dashboard", href: `/admin/dashboard${query}`, icon: <Home className={iconClass} /> },
    { label: "Organisations", href: `/admin/organisations${query}`, icon: <Building2 className={iconClass} /> },
    { label: "Sites", href: `/admin/sites${query}`, icon: <Store className={iconClass} /> },
    { label: "Users", href: `/admin/users${query}`, icon: <Users className={iconClass} /> },
    { label: "Activity", href: `/admin/activity${query}`, icon: <Activity className={iconClass} /> },
    { label: "Insights & Reports", href: `/admin/insights${query}`, icon: <ChartColumn className={iconClass} /> },
    { label: "Network Health", href: `/admin/network${query}`, icon: <Stethoscope className={iconClass} /> },
    { label: "Supply & Recovery Gaps", href: `/admin/gaps${query}`, icon: <Layers className={iconClass} /> },
    { label: "Create Report", href: `/admin/reports/new${query}`, icon: <FilePlus className={iconClass} /> },
    { label: "Support & Troubleshooting", href: `/admin/support${query}`, icon: <Headphones className={iconClass} /> },
    { label: "Exceptions & Data Quality", href: `/admin/exceptions${query}`, icon: <CircleAlert className={iconClass} /> },
    { label: "Provision Organisations", href: `/admin/provision${query}`, icon: <UsersRound className={iconClass} />, dividerBefore: true },
    { label: "Plans & Accounts", href: `/admin/plans${query}`, icon: <Calculator className={iconClass} /> },
    { label: "Impact Methodology", href: `/admin/methodology${query}`, icon: <UserCheck className={iconClass} /> },
    { label: "Admin Roles & Permissions", href: `/admin/roles${query}`, icon: <Shield className={iconClass} /> },
    { label: "Platform Notifications & Rules", href: `/admin/notifications${query}`, icon: <Bell className={iconClass} /> },
    { label: "Platform Audit Log", href: `/admin/audit${query}`, icon: <FileSearch className={iconClass} /> },
  ];
};
