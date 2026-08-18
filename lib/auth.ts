import { useSyncExternalStore } from "react";
import type { LoginCredentials, UserRole } from "@/types/auth";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  organization: string;
  role: UserRole;
  isHeadAdmin: boolean;
};

const ROLE: UserRole = "restaurant_multi";
const TOKEN_KEY = "enterprise_token";
const USER_KEY = "enterprise_user";

const displayNameFromEmail = (email: string) => {
  const raw = email.split("@")[0] || "User";
  return raw
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const organizationFromEmail = (email: string) => {
  const domain = email.split("@")[1]?.split(".")[0];
  if (!domain) return "Your business";
  return `${domain.charAt(0).toUpperCase()}${domain.slice(1)} Group`;
};

export function getStoredToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

let sessionCache: SessionUser | null = null;
let sessionRawCache: string | null = null;

export function getSession(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const token = getStoredToken();
  const rawUser = window.localStorage.getItem(USER_KEY);
  if (!token || !rawUser) {
    sessionCache = null;
    sessionRawCache = null;
    return null;
  }

  if (sessionRawCache === rawUser) {
    return sessionCache;
  }

  try {
    const parsed = JSON.parse(rawUser) as SessionUser;
    sessionCache = parsed;
    sessionRawCache = rawUser;
    return parsed;
  } catch {
    sessionCache = null;
    sessionRawCache = rawUser;
    return null;
  }
}

export async function login(credentials: LoginCredentials) {
  const email = credentials.email.trim();
  const password = credentials.password.trim();

  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  const user: SessionUser = {
    id: "enterprise-1",
    email,
    name: displayNameFromEmail(email),
    organization: organizationFromEmail(email),
    role: ROLE,
    isHeadAdmin: true,
  };

  window.localStorage.setItem(TOKEN_KEY, "dev-session");
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  sessionCache = user;
  sessionRawCache = JSON.stringify(user);
  return user;
}

export function logout() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  sessionCache = null;
  sessionRawCache = null;
}

const subscribeToStorage = (onStoreChange: () => void) => {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
};

export function useSession() {
  return useSyncExternalStore(subscribeToStorage, getSession, () => null);
}
