import { useSyncExternalStore } from "react";
import { ACCESS_TOKEN_KEY, ApiError, getAuthProfile, loginWithPassword } from "@/lib/api";
import type { AdminLoginCredentials, LoginCredentials, PortalKind, UserRole } from "@/types/auth";
import type { AccessScope, EnterpriseRole } from "@/types/enterprise";
import { mapEnterpriseRole } from "@/lib/enterpriseRole";
import { roleAllowsEnterprise } from "@/lib/users";

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
const USER_KEY = "enterprise_user";
const PASS_KEY = "enterprise_password";
const PLATFORM_ADMIN = "PLATFORM_ADMIN";

const displayNameFromEmail = (email: string) => {
  const raw = email.split("@")[0] || "User";
  return raw
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
    const user: SessionUser = {
      ...parsed,
      portal: parsed.portal === "admin" ? "admin" : "enterprise",
    };
    if (!token || token === "dev-session") {
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
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      throw new Error(
        "That email and password were not recognised. If you were invited, open the activation link in your email first.",
      );
    }
    throw err;
  }

  if (data.user.platformRole === PLATFORM_ADMIN) {
    throw new Error("This is a Saveful admin account. Sign in through the Admin portal.");
  }

  window.localStorage.setItem(TOKEN_KEY, data.accessToken);

  try {
    let organisationName = data.organisation?.name;
    let enterpriseRole = mapEnterpriseRole(data.role?.enterpriseRole, data.role?.orgRole);

    if (!organisationName || !data.role?.enterpriseRole) {
      const profile = await getAuthProfile();
      if (profile.user.platformRole === PLATFORM_ADMIN) {
        throw new Error("This is a Saveful admin account. Sign in through the Admin portal.");
      }
      organisationName = profile.organisation?.name ?? organisationName;
      enterpriseRole = mapEnterpriseRole(profile.role.enterpriseRole, profile.role.orgRole);
    }

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
    throw err;
  }
}

export async function loginAdmin(credentials: AdminLoginCredentials) {
  const email = credentials.email.trim();
  const password = credentials.password;
  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  const data = await loginWithPassword(email, password);
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
  window.localStorage.setItem(TOKEN_KEY, options.token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  if (options.password) {
    window.localStorage.setItem(PASS_KEY, options.password);
  } else {
    window.localStorage.removeItem(PASS_KEY);
  }
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
  return Boolean(user && user.portal !== "admin");
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
