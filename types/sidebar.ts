export interface SidebarLink {
  label: string;
  href: string;
  icon: React.ReactNode;
  onClick?: () => void;
  children?: SidebarLink[];
  dividerBefore?: boolean;
}

export interface SidebarConfig {
  role: "enterprise" | "admin";
  userName: string;
  userEmail: string;
  organization?: string;
  organizationLogo?: string | null;
  roleLabel?: string;
  portalCaption?: string;
  homeHref?: string;
  profileHref?: string;
  links: SidebarLink[];
  onLogout?: () => void;
}

export interface DashboardLayoutProps {
  config: SidebarConfig;
  children: React.ReactNode;
}
