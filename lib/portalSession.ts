export const ACCESS_TOKEN_KEY = "enterprise_token";
export const ENTERPRISE_USER_KEY = "enterprise_user";
export const ENTERPRISE_PASS_KEY = "enterprise_password";

const LEGACY_BUSINESS_TOKEN_KEY = "business_token";
const LEGACY_BUSINESS_USER_KEY = "business_user";
const LEGACY_ACTIVE_PORTAL_KEY = "saveful_active_portal";

export const PORTAL_SESSION_EVENT = "saveful-session-change";

export function tokenExpiryMs(token: string) {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function liveToken(key: string) {
  if (typeof window === "undefined") return null;
  const token = window.localStorage.getItem(key);
  if (!token || token === "dev-session") return null;
  const exp = tokenExpiryMs(token);
  if (exp != null && exp <= Date.now()) {
    window.localStorage.removeItem(key);
    return null;
  }
  return token;
}

function dropLegacyBusinessKeys() {
  window.localStorage.removeItem(LEGACY_BUSINESS_TOKEN_KEY);
  window.localStorage.removeItem(LEGACY_BUSINESS_USER_KEY);
  window.localStorage.removeItem(LEGACY_ACTIVE_PORTAL_KEY);
}

let migrated = false;

/** One token + one user. Copy a leftover business_* session once, then delete those keys. */
export function migrateLegacySessions() {
  if (typeof window === "undefined" || migrated) return;
  migrated = true;
  const legacyToken = window.localStorage.getItem(LEGACY_BUSINESS_TOKEN_KEY);
  const legacyUser = window.localStorage.getItem(LEGACY_BUSINESS_USER_KEY);
  const mainToken = window.localStorage.getItem(ACCESS_TOKEN_KEY);

  if (legacyToken && legacyUser && !mainToken) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, legacyToken);
    try {
      const parsed = JSON.parse(legacyUser) as { portal?: string };
      parsed.portal = "business";
      window.localStorage.setItem(ENTERPRISE_USER_KEY, JSON.stringify(parsed));
    } catch {
      window.localStorage.setItem(ENTERPRISE_USER_KEY, legacyUser);
    }
  }

  dropLegacyBusinessKeys();
}

export function readAccessToken() {
  migrateLegacySessions();
  return liveToken(ACCESS_TOKEN_KEY);
}

export function readEnterpriseToken() {
  return readAccessToken();
}

export function notifyPortalSession() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PORTAL_SESSION_EVENT));
}

export function clearSessionKeys() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(ENTERPRISE_USER_KEY);
  window.localStorage.removeItem(ENTERPRISE_PASS_KEY);
  dropLegacyBusinessKeys();
}

export function persistSessionRecord(user: unknown, token: string, password?: string) {
  if (typeof window === "undefined") return;
  dropLegacyBusinessKeys();
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
  window.localStorage.setItem(ENTERPRISE_USER_KEY, JSON.stringify(user));
  if (password) window.localStorage.setItem(ENTERPRISE_PASS_KEY, password);
  else window.localStorage.removeItem(ENTERPRISE_PASS_KEY);
}

export function readSessionUserRaw() {
  migrateLegacySessions();
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ENTERPRISE_USER_KEY);
}

export function subscribePortalSession(onChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("storage", onChange);
  window.addEventListener(PORTAL_SESSION_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(PORTAL_SESSION_EVENT, onChange);
  };
}
