import { useSyncExternalStore } from "react";
import type { LoginCredentials, UserRole } from "@/types/auth";
import type { AccessScope, EnterpriseRole } from "@/types/enterprise";
import { accessFromUserScope, listUsers, roleAllowsEnterprise } from "@/lib/users";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  organization: string;
  role: UserRole;
  enterpriseRole?: EnterpriseRole;
  isHeadAdmin: boolean;
  scope?: AccessScope;
};

const ROLE: UserRole = "restaurant_multi";
const TOKEN_KEY = "enterprise_token";
const USER_KEY = "enterprise_user";
const PASS_KEY = "enterprise_password";

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

  const directory = listUsers().find(
    (item) => item.email.toLowerCase() === email.toLowerCase() && item.status === "active",
  );

  const user: SessionUser = {
    id: directory?.id ?? "enterprise-1",
    email: directory?.email ?? email,
    name: directory?.name ?? displayNameFromEmail(email),
    organization: organizationFromEmail(email),
    role: ROLE,
    enterpriseRole: directory?.role ?? "enterprise_super_admin",
    isHeadAdmin: directory ? roleAllowsEnterprise(directory.role) : true,
    scope: directory ? accessFromUserScope(directory.scope) : undefined,
  };

  window.localStorage.setItem(TOKEN_KEY, "dev-session");
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.localStorage.setItem(PASS_KEY, password);
  sessionCache = user;
  sessionRawCache = JSON.stringify(user);
  emitSession();
  return user;
}

export function logout() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  window.localStorage.removeItem(PASS_KEY);
  sessionCache = null;
  sessionRawCache = null;
  emitSession();
}

export function verifyCurrentPassword(current: string) {
  if (typeof window === "undefined") return false;
  const stored = window.localStorage.getItem(PASS_KEY);
  if (!stored) return Boolean(current.trim());
  return stored === current;
}

export function setStoredPassword(next: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PASS_KEY, next);
}

const sessionListeners = new Set<() => void>();

function emitSession() {
  sessionListeners.forEach((listener) => listener());
}

export function updateSession(patch: Partial<SessionUser>) {
  const current = getSession();
  if (!current || typeof window === "undefined") return current;
  const next = { ...current, ...patch };
  window.localStorage.setItem(USER_KEY, JSON.stringify(next));
  sessionCache = next;
  sessionRawCache = JSON.stringify(next);
  emitSession();
  return next;
}

const subscribeToStorage = (onStoreChange: () => void) => {
  sessionListeners.add(onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    sessionListeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
};

export function useSession() {
  return useSyncExternalStore(subscribeToStorage, getSession, () => null);
}
