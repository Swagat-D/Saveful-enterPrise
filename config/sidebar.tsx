import { SidebarLink } from "@/types/sidebar";

const iconClass = "h-5 w-5 shrink-0";

function Icon({
  className,
  d,
}: {
  className: string;
  d: string;
}) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
    </svg>
  );
}

export const getEnterpriseSidebarLinks = (onLogout: () => void): SidebarLink[] => [
  {
    label: "Sites",
    href: "/sites",
    icon: <Icon className={`${iconClass} text-saveful-green`} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />,
  },
  {
    label: "Listings",
    href: "/listings",
    icon: <Icon className={`${iconClass} text-saveful-orange`} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />,
    children: [
      {
        label: "All listings",
        href: "/listings",
        icon: <Icon className="h-4 w-4 shrink-0 text-saveful-orange" d="M4 6h16M4 12h16M4 18h10" />,
      },
      {
        label: "Create listing",
        href: "/listings/new",
        icon: <Icon className="h-4 w-4 shrink-0 text-saveful-green" d="M12 4v16m8-8H4" />,
      },
      {
        label: "Surplus",
        href: "/listings/surplus",
        icon: <Icon className="h-4 w-4 shrink-0 text-amber-600" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />,
      },
      {
        label: "Collection history",
        href: "/listings/history",
        icon: <Icon className="h-4 w-4 shrink-0 text-teal-600" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
      },
    ],
  },
  {
    label: "Insights",
    href: "/insights",
    icon: <Icon className={`${iconClass} text-saveful-purple`} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
  },
  {
    label: "Updates",
    href: "/updates",
    icon: <Icon className={`${iconClass} text-saveful-pink`} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />,
  },
  {
    label: "Account",
    href: "/account",
    icon: <Icon className={`${iconClass} text-saveful-green`} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
  },
  {
    label: "Plans",
    href: "/plans",
    icon: <Icon className={`${iconClass} text-saveful-orange`} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />,
  },
  {
    label: "Logout",
    href: "#",
    onClick: onLogout,
    icon: <Icon className={`${iconClass} text-red-500`} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />,
  },
];
