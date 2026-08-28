export type UserRole = "restaurant_multi";

export type PortalKind = "enterprise" | "admin";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AdminLoginCredentials {
  email: string;
  password: string;
}

export interface LoginFormConfig {
  title: string;
  subtitle: string;
  emailPlaceholder?: string;
  showLogo?: boolean;
  badge?: string;
  onBack?: () => void;
  onSubmit: (credentials: LoginCredentials) => Promise<void> | void;
}
