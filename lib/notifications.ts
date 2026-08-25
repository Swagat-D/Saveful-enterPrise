"use client";

import { useSyncExternalStore } from "react";
import { appendAudit, formatAuditChanges } from "@/lib/audit";
import type { SessionUser } from "@/lib/auth";
import { DEMO_TODAY, daysAgoIso, formatDisplayDateTime, toApiDate } from "@/lib/dates";
import { demoNetworkSites } from "@/lib/network";
import {
  describeNotificationChanges,
  enterpriseAlertAvailable,
  getNotificationSettings,
  persistNotificationSettings,
  useNotificationSettingsVersion,
  type NotificationSettings,
} from "@/lib/notificationSettings";
import {
  hasNoListingsForDays,
  hasNoRecentActivity,
  neverActivatedPastGrace,
} from "@/lib/networkRules";
import { roleHas } from "@/lib/permissions";
import { scopeFromUser, siteInScope } from "@/lib/scope";
import type { PersonalNotifications } from "@/lib/profile";

export type InboxKind =
  | "no_recent_activity"
  | "never_activated"
  | "no_listings"
  | "report_ready"
  | "user_activated"
  | "access_changed";

export type InboxItem = {
  id: string;
  kind: InboxKind;
  title: string;
  detail: string;
  href: string;
  time: string;
  siteId?: string;
};

export type NotificationEvent = {
  id: string;
  kind: "report_ready" | "user_activated" | "access_changed";
  title: string;
  detail: string;
  href: string;
  at: string;
  actorEmail?: string;
  siteIds?: string[];
};

const EVENT_KEY = "enterprise_notification_events";
const eventListeners = new Set<() => void>();
let eventVersion = 0;
let events: NotificationEvent[] | null = null;

function emitEvents() {
  eventVersion += 1;
  eventListeners.forEach((listener) => listener());
}

export function useNotificationInboxVersion() {
  useNotificationSettingsVersion();
  return useSyncExternalStore(
    (listener) => {
      eventListeners.add(listener);
      return () => eventListeners.delete(listener);
    },
    () => eventVersion,
    () => 0,
  );
}

function readEvents(): NotificationEvent[] {
  if (events) return events;
  if (typeof window === "undefined") {
    events = seedEvents();
    return events;
  }
  try {
    const raw = window.localStorage.getItem(EVENT_KEY);
    events = raw ? (JSON.parse(raw) as NotificationEvent[]) : seedEvents();
  } catch {
    events = seedEvents();
  }
  return events;
}

function writeEvents(next: NotificationEvent[]) {
  events = next.slice(0, 40);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(EVENT_KEY, JSON.stringify(events));
  }
  emitEvents();
}

function seedEvents(): NotificationEvent[] {
  return [
    {
      id: "evt-report-1",
      kind: "report_ready",
      title: "Enterprise report ready",
      detail: "Impact and recovery report for the last 30 days is ready to view.",
      href: "/insights",
      at: daysAgoIso(0),
    },
    {
      id: "evt-access-1",
      kind: "access_changed",
      title: "User access changed",
      detail: "Jamie Chen · Role: Site Admin · Harbour Kitchen HQ",
      href: "/users/u3",
      at: daysAgoIso(2),
      siteIds: ["hq"],
    },
  ];
}

export function recordNotificationEvent(entry: Omit<NotificationEvent, "id" | "at"> & { at?: string }) {
  const item: NotificationEvent = {
    ...entry,
    id: `evt-${Date.now()}`,
    at: entry.at ?? new Date().toISOString(),
  };
  writeEvents([item, ...readEvents()]);
}

export function saveNotificationSettings(next: NotificationSettings, actor: string) {
  const previous = getNotificationSettings();
  const saved = persistNotificationSettings(next);
  const changes = describeNotificationChanges(previous, saved);
  if (changes.length) {
    appendAudit({
      actor,
      action: "Updated notification settings",
      area: "settings",
      entity: "Notifications",
      detail: formatAuditChanges(changes),
      changes,
    });
  }
  return { settings: saved, changes };
}

export function availablePersonalNotifications(settings = getNotificationSettings()) {
  const available = enterpriseAlertAvailable(settings);
  const items: { id: keyof PersonalNotifications; label: string; hint: string }[] = [];
  if (available.accountAccess) {
    items.push({
      id: "accountAccess",
      label: "Account & access updates",
      hint: "Important changes to your account or access.",
    });
  }
  if (available.reports) {
    items.push({
      id: "reports",
      label: "Enterprise report notifications",
      hint: "When a report you generated is ready to view or download.",
    });
  }
  if (available.siteAttention) {
    items.push({
      id: "siteAttention",
      label: "Site attention alerts",
      hint: "Alerts for sites in your scope that may need attention.",
    });
  }
  return items;
}

const DEFAULT_PREFS: PersonalNotifications = { accountAccess: true, reports: true, siteAttention: true };

function siteItems(user: SessionUser, prefs: PersonalNotifications): InboxItem[] {
  const settings = getNotificationSettings();
  if (!prefs.siteAttention) return [];
  const scope = scopeFromUser(user);
  const todayEnd = toApiDate(DEMO_TODAY);
  const sites = demoNetworkSites.filter((site) => siteInScope(site, scope) && site.status === "active");
  const items: InboxItem[] = [];

  for (const site of sites) {
    if (settings.noRecentActivity.enabled && hasNoRecentActivity(site, settings.noRecentActivity.days, todayEnd)) {
      items.push({
        id: `site-quiet-${site.id}`,
        kind: "no_recent_activity",
        title: `${site.name} has no recent activity`,
        detail: `No Saveful activity in the last ${settings.noRecentActivity.days} days.`,
        href: `/sites/${site.id}`,
        time: formatDisplayDateTime(site.lastActivityAt ?? daysAgoIso(settings.noRecentActivity.days)),
        siteId: site.id,
      });
    }
    if (settings.neverActivated.enabled && neverActivatedPastGrace(site, settings.neverActivated.days)) {
      items.push({
        id: `site-new-${site.id}`,
        kind: "never_activated",
        title: `${site.name} has not activated`,
        detail: `This site has not gone live within ${settings.neverActivated.days} days.`,
        href: `/sites/${site.id}`,
        time: formatDisplayDateTime(site.createdAt ?? daysAgoIso(settings.neverActivated.days)),
        siteId: site.id,
      });
    }
    if (settings.noListings.enabled && hasNoListingsForDays(site, settings.noListings.days)) {
      items.push({
        id: `site-listings-${site.id}`,
        kind: "no_listings",
        title: `${site.name} has no listings`,
        detail: `No listings created in the last ${settings.noListings.days} days.`,
        href: `/sites/${site.id}`,
        time: formatDisplayDateTime(site.lastListingAt ?? daysAgoIso(settings.noListings.days)),
        siteId: site.id,
      });
    }
  }
  return items;
}

function eventItems(user: SessionUser, prefs: PersonalNotifications): InboxItem[] {
  const settings = getNotificationSettings();
  const scope = scopeFromUser(user);
  const admin = roleHas(user, "manageUsers");

  return readEvents()
    .filter((event) => {
      if (event.kind === "report_ready") {
        if (!settings.reportReady || !prefs.reports) return false;
        return !event.actorEmail || event.actorEmail.toLowerCase() === user.email.toLowerCase();
      }
      if (!admin || !prefs.accountAccess) return false;
      if (event.kind === "user_activated" && !settings.userActivated) return false;
      if (event.kind === "access_changed" && !settings.accessChanged) return false;
      if (!event.siteIds?.length) return true;
      return event.siteIds.some((id) => {
        const site = demoNetworkSites.find((item) => item.id === id);
        return site ? siteInScope(site, scope) : false;
      });
    })
    .map((event) => ({
      id: event.id,
      kind: event.kind,
      title: event.title,
      detail: event.detail,
      href: event.href,
      time: formatDisplayDateTime(event.at),
    }));
}

export function listInbox(user: SessionUser | null, prefs: PersonalNotifications = DEFAULT_PREFS): InboxItem[] {
  if (!user) return [];
  return [...siteItems(user, prefs), ...eventItems(user, prefs)].slice(0, 8);
}

export { getNotificationSettings, enterpriseAlertAvailable };
export type { NotificationSettings, ThresholdDays } from "@/lib/notificationSettings";
