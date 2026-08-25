export interface SidebarLink {
  label: string;
  href: string;
  icon: React.ReactNode;
  onClick?: () => void;
  children?: SidebarLink[];
}

export interface SidebarConfig {
  role: "enterprise";
  userName: string;
  userEmail: string;
  organization?: string;
  organizationLogo?: string | null;
  roleLabel?: string;
  links: SidebarLink[];
  onLogout?: () => void;
}

export interface DashboardLayoutProps {
  config: SidebarConfig;
  children: React.ReactNode;
}
