"use client";

import { appendAdminAudit, listAdminAudit } from "@/lib/adminAudit";
import type { SessionUser } from "@/lib/auth";
import {
  RENOTIFY_AFTER_DAYS,
  SUPPORTED_NOTIFICATION_CHANNEL,
  THRESHOLD_DAYS,
  describePlatformRuleChanges,
  getNotificationSettings,
  getPlatformNotificationRules,
  persistPlatformNotificationRules,
  useNotificationSettingsVersion,
  type PlatformRuleConfig,
  type PlatformRuleId,
  type ThresholdDays,
} from "@/lib/notificationSettings";

export type PlatformRuleKind = "configurable" | "required";

export type PlatformRuleDefinition = {
  id: PlatformRuleId;
  eventType: string;
  group: "Site activity" | "Reports" | "Account & access";
  trigger: string;
  audience: string;
  orgTypes: string;
  participation: string;
  hasThreshold: boolean;
};

export const PLATFORM_RULES: PlatformRuleDefinition[] = [
  {
    id: "noRecentActivity",
    eventType: "No recent activity",
    group: "Site activity",
    trigger: "A live site has had no Saveful activity for the threshold.",
    audience: "Enterprise users who can access that site",
    orgTypes: "All organisation types",
    participation: "Surplus provider",
    hasThreshold: true,
  },
  {
    id: "neverActivated",
    eventType: "Never activated",
    group: "Site activity",
    trigger: "A provisioned site has not gone live within the threshold.",
    audience: "Enterprise users who can access that site",
    orgTypes: "All organisation types",
    participation: "All participation roles",
    hasThreshold: true,
  },
  {
    id: "noListings",
    eventType: "No listings",
    group: "Site activity",
    trigger: "A site has created no listings for the threshold.",
    audience: "Enterprise users who can access that site",
    orgTypes: "Food Business, Farmer, Circular Recovery Provider",
    participation: "Surplus provider",
    hasThreshold: true,
  },
  {
    id: "reportReady",
    eventType: "Report ready",
    group: "Reports",
    trigger: "An Enterprise report the user generated is ready to view.",
    audience: "The Enterprise user who created the report",
    orgTypes: "All organisation types",
    participation: "All participation roles",
    hasThreshold: false,
  },
  {
    id: "userActivated",
    eventType: "New user activated",
    group: "Account & access",
    trigger: "An invited Enterprise user activates their account.",
    audience: "Enterprise users who can manage users",
    orgTypes: "All organisation types",
    participation: "All participation roles",
    hasThreshold: false,
  },
  {
    id: "accessChanged",
    eventType: "User access changed",
    group: "Account & access",
    trigger: "An Enterprise user’s role or scope is changed.",
    audience: "Enterprise users who can manage users",
    orgTypes: "All organisation types",
    participation: "All participation roles",
    hasThreshold: false,
  },
];

export const ADMIN_SYSTEM_NOTIFICATIONS = [
  {
    id: "quiet-site",
    eventType: "Quiet site",
    trigger: "An active site has no listing or collection activity in the selected period.",
    audience: "Saveful Admin",
    orgTypes: "All organisation types",
    participation: "All participation roles",
    surface: "Exceptions & Data Quality / Sites",
  },
  {
    id: "never-activated-site",
    eventType: "Never activated site",
    trigger: "A provisioned site has not gone live on Saveful.",
    audience: "Saveful Admin",
    orgTypes: "All organisation types",
    participation: "All participation roles",
    surface: "Exceptions & Data Quality / Sites",
  },
  {
    id: "unclaimed-listing",
    eventType: "Unclaimed or expired listing",
    trigger: "A listing stays published or expires without a claim.",
    audience: "Saveful Admin",
    orgTypes: "Food Business, Farmer, Circular Recovery Provider",
    participation: "Surplus provider",
    surface: "Exceptions & Data Quality / Listings",
  },
  {
    id: "overdue-collection",
    eventType: "Overdue collection",
    trigger: "A collection stays scheduled or in progress.",
    audience: "Saveful Admin",
    orgTypes: "All organisation types",
    participation: "All participation roles",
    surface: "Exceptions & Data Quality / Collections",
  },
  {
    id: "site-deactivated",
    eventType: "Site deactivated",
    trigger: "Saveful Admin or the Enterprise deactivates a site.",
    audience: "Saveful Admin",
    orgTypes: "All organisation types",
    participation: "All participation roles",
    surface: "Site detail",
  },
] as const;

export function useAdminNotificationsVersion() {
  return useNotificationSettingsVersion();
}

export function defaultBehaviour(config: PlatformRuleConfig) {
  if (config.required) {
    return config.days ? `Always on · ${config.days} days` : "Always on";
  }
  if (!config.defaultEnabled) return "Off unless an Enterprise enables it";
  return config.days ? `On · ${config.days} days` : "On";
}

export function savePlatformRule(
  id: PlatformRuleId,
  patch: Partial<PlatformRuleConfig>,
  user: SessionUser | null,
) {
  const previous = getPlatformNotificationRules();
  const current = previous[id];
  const nextRule: PlatformRuleConfig = {
    required: patch.required ?? current.required,
    defaultEnabled: (patch.required ?? current.required) ? true : (patch.defaultEnabled ?? current.defaultEnabled),
    days: patch.days ?? current.days,
  };
  const next = { ...previous, [id]: nextRule };
  persistPlatformNotificationRules(next);
  const label = PLATFORM_RULES.find((item) => item.id === id)?.eventType ?? id;
  const changes = describePlatformRuleChanges(previous, next, id, label);
  if (changes.length) {
    appendAdminAudit({
      actor: user?.name ?? "Saveful Admin",
      actorEmail: user?.email ?? "admin@saveful.com",
      action: nextRule.required ? "Set system-required notification" : "Updated platform notification rule",
      organisationId: "saveful",
      organisationName: "Saveful",
      entityType: "notification",
      entity: label,
      detail: "Saveful Admin updated the platform notification rule that sits above Enterprise settings.",
      changes,
    });
  }
  return getPlatformNotificationRules();
}

export function buildPlatformNotificationsModel() {
  const platform = getPlatformNotificationRules();
  const enterprise = getNotificationSettings();
  const rows = PLATFORM_RULES.map((rule) => {
    const config = platform[rule.id];
    const enterpriseOn =
      rule.id === "noRecentActivity" || rule.id === "neverActivated" || rule.id === "noListings"
        ? enterprise[rule.id].enabled
        : enterprise[rule.id];
    return {
      ...rule,
      config,
      kind: (config.required ? "required" : "configurable") as PlatformRuleKind,
      channel: SUPPORTED_NOTIFICATION_CHANNEL,
      status: enterpriseOn ? "Active" : "Off",
      behaviour: defaultBehaviour(config),
    };
  });
  const audit = listAdminAudit({ q: "", period: "all", organisationId: "saveful", page: 1 }).filter(
    (row) => row.entityType === "notification",
  );
  return {
    rows,
    system: ADMIN_SYSTEM_NOTIFICATIONS,
    channel: SUPPORTED_NOTIFICATION_CHANNEL,
    renotifyDays: RENOTIFY_AFTER_DAYS,
    thresholds: THRESHOLD_DAYS,
    audit,
    metrics: {
      supported: rows.length,
      required: rows.filter((row) => row.kind === "required").length,
      configurable: rows.filter((row) => row.kind === "configurable").length,
      enterpriseOn: rows.filter((row) => row.status === "Active").length,
      adminSurfaces: ADMIN_SYSTEM_NOTIFICATIONS.length,
    },
  };
}

export type { PlatformRuleId, ThresholdDays };
