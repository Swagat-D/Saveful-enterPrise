"use client";

import { useSyncExternalStore } from "react";

export const THRESHOLD_DAYS = [7, 14, 30, 60, 90] as const;
export type ThresholdDays = (typeof THRESHOLD_DAYS)[number];

export type SiteAlertSetting = {
  enabled: boolean;
  days: ThresholdDays;
};

export type NotificationSettings = {
  noRecentActivity: SiteAlertSetting;
  neverActivated: SiteAlertSetting;
  noListings: SiteAlertSetting;
  reportReady: boolean;
  userActivated: boolean;
  accessChanged: boolean;
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  noRecentActivity: { enabled: true, days: 30 },
  neverActivated: { enabled: true, days: 14 },
  noListings: { enabled: true, days: 30 },
  reportReady: true,
  userActivated: true,
  accessChanged: true,
};

export const RENOTIFY_AFTER_DAYS = 7;

const STORAGE_KEY = "enterprise_notification_settings";
const listeners = new Set<() => void>();
let version = 0;
let cache: NotificationSettings | null = null;

function emit() {
  version += 1;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useNotificationSettingsVersion() {
  return useSyncExternalStore(subscribe, () => version, () => 0);
}

function isDays(value: unknown): value is ThresholdDays {
  return THRESHOLD_DAYS.includes(value as ThresholdDays);
}

function normalizeAlert(raw: Partial<SiteAlertSetting> | undefined, fallback: SiteAlertSetting): SiteAlertSetting {
  return {
    enabled: raw?.enabled ?? fallback.enabled,
    days: isDays(raw?.days) ? raw.days : fallback.days,
  };
}

function normalize(raw: Partial<NotificationSettings> | null): NotificationSettings {
  return {
    noRecentActivity: normalizeAlert(raw?.noRecentActivity, DEFAULT_NOTIFICATION_SETTINGS.noRecentActivity),
    neverActivated: normalizeAlert(raw?.neverActivated, DEFAULT_NOTIFICATION_SETTINGS.neverActivated),
    noListings: normalizeAlert(raw?.noListings, DEFAULT_NOTIFICATION_SETTINGS.noListings),
    reportReady: raw?.reportReady ?? DEFAULT_NOTIFICATION_SETTINGS.reportReady,
    userActivated: raw?.userActivated ?? DEFAULT_NOTIFICATION_SETTINGS.userActivated,
    accessChanged: raw?.accessChanged ?? DEFAULT_NOTIFICATION_SETTINGS.accessChanged,
  };
}

export function getNotificationSettings(): NotificationSettings {
  if (typeof window === "undefined") return DEFAULT_NOTIFICATION_SETTINGS;
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cache = normalize(raw ? (JSON.parse(raw) as Partial<NotificationSettings>) : null);
  } catch {
    cache = DEFAULT_NOTIFICATION_SETTINGS;
  }
  return cache;
}

export function persistNotificationSettings(next: NotificationSettings) {
  const normalized = normalize(next);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  }
  cache = normalized;
  emit();
  return normalized;
}

export type NotificationFieldChange = { field: string; previous: string; next: string };

export function describeNotificationChanges(previous: NotificationSettings, next: NotificationSettings) {
  const parts: NotificationFieldChange[] = [];
  const site = (
    key: keyof Pick<NotificationSettings, "noRecentActivity" | "neverActivated" | "noListings">,
    label: string,
  ) => {
    const before = previous[key];
    const after = next[key];
    if (before.enabled !== after.enabled) {
      parts.push({ field: label, previous: before.enabled ? "On" : "Off", next: after.enabled ? "On" : "Off" });
    }
    if (before.days !== after.days) {
      parts.push({ field: `${label} threshold`, previous: `${before.days} days`, next: `${after.days} days` });
    }
  };
  site("noRecentActivity", "No recent activity");
  site("neverActivated", "Never activated");
  site("noListings", "No listings");
  if (previous.reportReady !== next.reportReady) {
    parts.push({ field: "Report ready", previous: previous.reportReady ? "On" : "Off", next: next.reportReady ? "On" : "Off" });
  }
  if (previous.userActivated !== next.userActivated) {
    parts.push({ field: "New user activated", previous: previous.userActivated ? "On" : "Off", next: next.userActivated ? "On" : "Off" });
  }
  if (previous.accessChanged !== next.accessChanged) {
    parts.push({ field: "User access changed", previous: previous.accessChanged ? "On" : "Off", next: next.accessChanged ? "On" : "Off" });
  }
  return parts;
}

export function enterpriseAlertAvailable(settings: NotificationSettings = getNotificationSettings()) {
  return {
    siteAttention: settings.noRecentActivity.enabled || settings.neverActivated.enabled || settings.noListings.enabled,
    reports: settings.reportReady,
    accountAccess: settings.userActivated || settings.accessChanged,
  };
}
