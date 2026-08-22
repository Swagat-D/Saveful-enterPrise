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
import { SidebarLink } from "@/types/sidebar";

const iconClass = "h-5 w-5 shrink-0 text-saveful-green";
const childIconClass = "h-4 w-4 shrink-0 text-saveful-green";

export const getEnterpriseSidebarLinks = (): SidebarLink[] => [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard className={iconClass} />,
  },
  {
    label: "Sites",
    href: "/sites",
    icon: <Building2 className={iconClass} />,
  },
  {
    label: "Users",
    href: "/users",
    icon: <Users className={iconClass} />,
  },
  {
    label: "Activity",
    href: "/activity",
    icon: <Activity className={iconClass} />,
  },
  {
    label: "Insights & Reports",
    href: "/insights",
    icon: <ChartColumn className={iconClass} />,
  },
  {
    label: "Enterprise Settings",
    href: "/settings",
    icon: <Settings className={iconClass} />,
    children: [
      {
        label: "Organisation Profile",
        href: "/settings/profile",
        icon: <Building2 className={childIconClass} />,
      },
      {
        label: "Organisation Structure",
        href: "/settings/structure",
        icon: <Network className={childIconClass} />,
      },
      {
        label: "Roles & Permissions",
        href: "/settings/roles",
        icon: <Shield className={childIconClass} />,
      },
      {
        label: "Notifications",
        href: "/settings/notifications",
        icon: <Bell className={childIconClass} />,
      },
      {
        label: "Audit Log",
        href: "/settings/audit",
        icon: <ScrollText className={childIconClass} />,
      },
    ],
  },
];
