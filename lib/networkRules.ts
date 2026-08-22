import { inDateRange, periodRange } from "@/lib/dates";
import type {
  ActivityStatus,
  AttentionReason,
  NetworkFilters,
  OrganizationSite,
  PeriodKey,
} from "@/types/enterprise";

export function isActivated(site: OrganizationSite) {
  return Boolean(site.activatedAt);
}

export function isDeactivated(site: OrganizationSite) {
  return site.status === "deactivated";
}

export function isActiveSite(site: OrganizationSite) {
  return site.status === "active" && isActivated(site);
}

export function requiresSetup(site: OrganizationSite) {
  return !site.hasManager;
}

export function hasActivityInPeriod(
  site: OrganizationSite,
  startDate?: string,
  endDate?: string,
) {
  return inDateRange(site.lastActivityAt, startDate, endDate);
}

export function hasListingInPeriod(
  site: OrganizationSite,
  startDate?: string,
  endDate?: string,
) {
  return inDateRange(site.lastListingAt, startDate, endDate);
}

export function hasNoActivity30d(site: OrganizationSite, todayEnd: string) {
  if (!isActivated(site) || isDeactivated(site)) return false;
  const window = periodRange("30");
  return !inDateRange(site.lastActivityAt, window.startDate, todayEnd);
}

export function activityStatus(site: OrganizationSite, period: PeriodKey): ActivityStatus {
  if (!isActivated(site)) return "never_activated";
  if (!site.lastActivityAt) return "never_used";
  const { startDate, endDate } = periodRange(period);
  if (hasActivityInPeriod(site, startDate, endDate)) return "in_period";
  return "none_in_period";
}

export const ACTIVITY_LABEL: Record<ActivityStatus, string> = {
  in_period: "Activity in selected period",
  none_in_period: "No activity in selected period",
  never_used: "Never used",
  never_activated: "Never activated",
};

export function attentionReasons(
  site: OrganizationSite,
  filters: NetworkFilters,
): AttentionReason[] {
  const { startDate, endDate } = periodRange(filters.period);
  const reasons: AttentionReason[] = [];

  if (!isActivated(site)) reasons.push("never_activated");
  if (hasNoActivity30d(site, endDate)) reasons.push("no_activity_30d");
  if (isActivated(site) && !hasListingInPeriod(site, startDate, endDate)) {
    reasons.push("no_listings_in_period");
  }
  if (requiresSetup(site)) reasons.push("setup_required");

  return reasons;
}

export function matchesAttention(site: OrganizationSite, reason: AttentionReason, filters: NetworkFilters) {
  return attentionReasons(site, filters).includes(reason);
}

export const ATTENTION_COPY: Record<
  AttentionReason,
  { label: string; detail: string }
> = {
  never_activated: {
    label: "Never activated",
    detail: "Site created but has not gone live on Saveful",
  },
  no_activity_30d: {
    label: "No activity in 30 days",
    detail: "No collection or listing activity in the last 30 days",
  },
  no_listings_in_period: {
    label: "No listings in selected period",
    detail: "Activated, but no surplus listed in the current period",
  },
  setup_required: {
    label: "Require user / admin setup",
    detail: "No site manager or admin assigned",
  },
};

export function formatLastActivity(iso: string | null) {
  if (!iso) return "Never";
  const date = new Date(iso);
  const today = new Date("2026-08-22T12:00:00.000Z");
  const startToday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const startThat = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const days = Math.round((startToday - startThat) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 14) return `${days} days ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
