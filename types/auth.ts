export type UserRole = "restaurant_multi";

export type PortalKind = "enterprise" | "admin" | "business";

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
  initialEmail?: string;
  initialInfo?: string;
  showLogo?: boolean;
  badge?: string;
  onBack?: () => void;
  backPrompt?: string;
  backLabel?: string;
  helperText?: string;
  onRegister?: () => void;
  registerPrompt?: string;
  registerActionLabel?: string;
  onSubmit: (credentials: LoginCredentials) => Promise<void> | void;
}
