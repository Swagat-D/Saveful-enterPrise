"use client";

import { setStoredPassword, verifyCurrentPassword, type SessionUser } from "@/lib/auth";
import { scopeFromUser } from "@/lib/scope";
import { formatScope, listUsers, roleDescription, roleLabel, userScopeFromAccess } from "@/lib/users";
import type { EnterpriseRole } from "@/types/enterprise";

const PROFILE_KEY = "enterprise_personal_profile";

export type PersonalNotifications = {
  accountAccess: boolean;
  reports: boolean;
  siteAttention: boolean;
};

export const PERSONAL_NOTIFICATIONS: {
  id: keyof PersonalNotifications;
  label: string;
  hint: string;
}[] = [
  {
    id: "accountAccess",
    label: "Account & access updates",
    hint: "Important changes to your account or access.",
  },
  {
    id: "reports",
    label: "Enterprise report notifications",
    hint: "When a report you generated is ready to view or download.",
  },
  {
    id: "siteAttention",
    label: "Site attention alerts",
    hint: "Alerts for sites in your scope that may need attention.",
  },
];

export type PersonalProfile = {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  notifications: PersonalNotifications;
};

const DEFAULT_NOTIFICATIONS: PersonalNotifications = {
  accountAccess: true,
  reports: true,
  siteAttention: true,
};

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
}

function readStored(): Partial<PersonalProfile> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as PersonalProfile) : null;
  } catch {
    return null;
  }
}

export function profileFromSession(user: SessionUser): PersonalProfile {
  const stored = readStored();
  const names = splitName(user.name);
  const directory = listUsers().find((item) => item.email.toLowerCase() === user.email.toLowerCase());
  return {
    firstName: stored?.firstName || directory?.firstName || names.firstName,
    lastName: stored?.lastName || directory?.lastName || names.lastName,
    email: stored?.email || user.email,
    mobile: stored?.mobile || directory?.mobile || "",
    notifications: { ...DEFAULT_NOTIFICATIONS, ...stored?.notifications },
  };
}

export function savePersonalProfile(profile: PersonalProfile) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function accessFromSession(user: SessionUser) {
  const role: EnterpriseRole =
    user.enterpriseRole ?? (user.isHeadAdmin ? "enterprise_super_admin" : "enterprise_admin");
  const scope = userScopeFromAccess(scopeFromUser(user));
  return {
    role,
    roleName: roleLabel(role),
    roleDetail: roleDescription(role),
    scope,
    scopeLabel: formatScope(scope),
  };
}

export function changePassword(current: string, next: string, confirm: string) {
  if (!current.trim()) return "Enter your current password.";
  if (!verifyCurrentPassword(current)) return "Current password is incorrect.";
  if (next.length < 8) return "New password must be at least 8 characters.";
  if (next !== confirm) return "Passwords do not match.";
  if (current === next) return "New password must be different from your current password.";
  setStoredPassword(next);
  return null;
}
