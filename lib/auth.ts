import { useSyncExternalStore } from "react";
import { ACCESS_TOKEN_KEY, ApiError, getAuthProfile, loginWithPassword, onUnauthorized } from "@/lib/api";
import {
  clearSessionKeys,
  ENTERPRISE_PASS_KEY,
  ENTERPRISE_USER_KEY,
  notifyPortalSession,
  persistSessionRecord,
  readAccessToken,
  readSessionUserRaw,
  subscribePortalSession,
} from "@/lib/portalSession";
import type { AdminLoginCredentials, LoginCredentials, PortalKind, UserRole } from "@/types/auth";
import type { AccessScope, EnterpriseRole } from "@/types/enterprise";
import { mapEnterpriseRole } from "@/lib/enterpriseRole";
import { roleAllowsEnterprise } from "@/lib/users";

function isEnterpriseAccount(input: {
  enterpriseRole?: string | null;
  planName?: string | null;
}) {
  if ((input.planName ?? "").toUpperCase() === "ENTERPRISE") return true;
  return Boolean((input.enterpriseRole ?? "").trim());
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  organization: string;
  role: UserRole;
  portal: PortalKind;
  enterpriseRole?: EnterpriseRole;
  platformRole?: string;
  isHeadAdmin: boolean;
  scope?: AccessScope;
};

const ROLE: UserRole = "restaurant_multi";
const TOKEN_KEY = ACCESS_TOKEN_KEY;
const USER_KEY = ENTERPRISE_USER_KEY;
const PASS_KEY = ENTERPRISE_PASS_KEY;
const PLATFORM_ADMIN = "PLATFORM_ADMIN";

const displayNameFromEmail = (email: string) => {
  const raw = email.split("@")[0] || "User";
  return raw
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

function clearStoredSession() {
  clearSessionKeys();
  sessionCache = null;
  sessionRawCache = null;
}

export function getStoredToken() {
  const token = readAccessToken();
  if (!token && typeof window !== "undefined" && readSessionUserRaw()) {
    window.localStorage.removeItem(USER_KEY);
    window.localStorage.removeItem(PASS_KEY);
    sessionCache = null;
    sessionRawCache = null;
  }
  return token;
}

let sessionCache: SessionUser | null = null;
let sessionRawCache: string | null = null;

export function getSession(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const token = getStoredToken();
  const rawUser = readSessionUserRaw();
  if (!token || !rawUser) {
    sessionCache = null;
    sessionRawCache = null;
    return null;
  }

  if (sessionRawCache === rawUser) {
    return sessionCache;
  }

  try {
    const parsed = JSON.parse(rawUser) as SessionUser & { portal?: string };
    if (parsed.portal === "business") {
      sessionCache = null;
      sessionRawCache = rawUser;
      return null;
    }
    const user: SessionUser = {
      ...parsed,
      portal: parsed.portal === "admin" ? "admin" : "enterprise",
    };
    if (!getStoredToken()) {
      sessionCache = null;
      sessionRawCache = null;
      return null;
    }
    if (user.portal === "admin" && user.platformRole !== PLATFORM_ADMIN) {
      sessionCache = null;
      sessionRawCache = null;
      return null;
    }
    sessionCache = user;
    sessionRawCache = rawUser;
    return user;
  } catch {
    sessionCache = null;
    sessionRawCache = rawUser;
    return null;
  }
}

export async function login(credentials: LoginCredentials) {
  const email = credentials.email.trim();
  const password = credentials.password;

  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  let data;
  try {
    data = await loginWithPassword(email, password);
  } catch (err) {
    throw new Error(enterpriseLoginError(err));
  }

  if (data.user.platformRole === PLATFORM_ADMIN) {
    throw new Error("This is a Saveful admin account. Sign in through the Admin portal.");
  }

  window.localStorage.setItem(TOKEN_KEY, data.accessToken);

  try {
    const profile = await getAuthProfile();
    if (profile.user.platformRole === PLATFORM_ADMIN) {
      throw new Error("This is a Saveful admin account. Sign in through the Admin portal.");
    }
    if (
      !isEnterpriseAccount({
        enterpriseRole: profile.role.enterpriseRole ?? data.role?.enterpriseRole,
        planName: profile.subscription?.plan?.name,
      })
    ) {
      throw new Error("Restaurant and farm accounts sign in through the Business portal.");
    }

    const organisationName = profile.organisation?.name ?? data.organisation?.name;
    const enterpriseRole = mapEnterpriseRole(profile.role.enterpriseRole ?? data.role?.enterpriseRole, null);

    if (!organisationName) {
      throw new Error("This account is not linked to an Enterprise organisation yet.");
    }

    const user: SessionUser = {
      id: String(data.user.id),
      email: data.user.email,
      name: [data.user.firstName, data.user.lastName].filter(Boolean).join(" ") || displayNameFromEmail(data.user.email),
      organization: organisationName,
      role: ROLE,
      portal: "enterprise",
      enterpriseRole,
      isHeadAdmin: roleAllowsEnterprise(enterpriseRole),
    };
    persistSession(user, { token: data.accessToken });
    return user;
  } catch (err) {
    window.localStorage.removeItem(TOKEN_KEY);
    emitSession();
    throw err;
  }
}

function enterpriseLoginError(err: unknown) {
  if (!(err instanceof ApiError)) {
    return err instanceof Error ? err.message : "Sign in failed.";
  }
  const message = err.message.toLowerCase();
  if (err.status === 403) {
    if (message.includes("too many")) {
      return "Too many sign-in attempts. Wait 15 minutes, then try again.";
    }
    return err.message || "Sign in was blocked.";
  }
  if (err.status === 401) {
    if (message.includes("invalid credentials")) {
      return "That email or password is incorrect. Use the password you created when you activated your account, or reset it with Forgot password.";
    }
    if (message.includes("user not found")) {
      return "No active account for that email. If you were invited, open the activation link in your email first.";
    }
    if (message.includes("no organisation")) {
      return "This account is not linked to an Enterprise organisation yet.";
    }
    return err.message || "That email or password is incorrect.";
  }
  return err.message || "Sign in failed.";
}

export async function loginAdmin(credentials: AdminLoginCredentials) {
  const email = credentials.email.trim();
  const password = credentials.password;
  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  let data;
  try {
    data = await loginWithPassword(email, password);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      const message = err.message.toLowerCase();
      throw new Error(
        err.status === 403 && message.includes("too many")
          ? "Too many sign-in attempts. Wait 15 minutes, then try again."
          : "That email or password is incorrect.",
      );
    }
    throw err;
  }
  if (data.user.platformRole !== PLATFORM_ADMIN) {
    throw new Error("Only a Saveful admin account can sign in here.");
  }

  const user: SessionUser = {
    id: String(data.user.id),
    email: data.user.email,
    name: [data.user.firstName, data.user.lastName].filter(Boolean).join(" ") || data.user.email,
    organization: "Saveful",
    role: ROLE,
    portal: "admin",
    platformRole: data.user.platformRole,
    isHeadAdmin: false,
  };
  persistSession(user, { token: data.accessToken });
  return user;
}

function persistSession(user: SessionUser, options: { token: string; password?: string }) {
  persistSessionRecord(user, options.token, options.password);
  sessionCache = user;
  sessionRawCache = JSON.stringify(user);
  emitSession();
}

export function homePath(user: SessionUser | null) {
  if (!user) return "/login";
  return user.portal === "admin" ? "/admin/dashboard" : "/dashboard";
}

export function isAdminSession(user: SessionUser | null) {
  return user?.portal === "admin" && user.platformRole === PLATFORM_ADMIN;
}

export function isEnterpriseSession(user: SessionUser | null) {
  return Boolean(user && user.portal === "enterprise");
}

export function logout() {
  if (typeof window === "undefined") return;
  clearStoredSession();
  emitSession();
}

export async function ensureLiveSession() {
  const user = getSession();
  if (!user) return null;
  try {
    const profile = await getAuthProfile();
    if (user.portal === "admin" && profile.user.platformRole !== PLATFORM_ADMIN) {
      logout();
      return null;
    }
    if (user.portal !== "admin" && profile.user.platformRole === PLATFORM_ADMIN) {
      logout();
      return null;
    }
    return user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      logout();
      return null;
    }
    return user;
  }
}

if (typeof window !== "undefined") {
  onUnauthorized(() => logout());
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
  notifyPortalSession();
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
  const unsub = subscribePortalSession(onStoreChange);
  return () => {
    sessionListeners.delete(onStoreChange);
    unsub();
  };
};

export function useSession() {
  return useSyncExternalStore(subscribeToStorage, getSession, () => null);
}
