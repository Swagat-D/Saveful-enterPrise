export type UserRole = "restaurant_multi";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginFormConfig {
  title: string;
  subtitle: string;
  emailPlaceholder?: string;
  onSubmit: (credentials: LoginCredentials) => Promise<void> | void;
}
