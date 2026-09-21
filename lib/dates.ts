import { getOrganization, organizationLocale } from "@/lib/organization";
import type { PeriodKey } from "@/types/enterprise";

/** Fixed demo “today” so generated history and filters stay aligned. */
export const DEMO_TODAY = new Date("2026-08-22T12:00:00.000Z");

/** Latest of demo today and the real clock, so live admin events are not dropped. */
export function liveToday() {
  const now = new Date();
  return now > DEMO_TODAY ? now : DEMO_TODAY;
}

export function toApiDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function rollingRange(days: number, today: Date = DEMO_TODAY) {
  return {
    startDate: toApiDate(addDays(today, -(Math.max(1, days) - 1))),
    endDate: toApiDate(today),
  };
}

export function daysBetween(iso: string, today: Date = DEMO_TODAY) {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  const start = Date.UTC(year, (month || 1) - 1, day || 1);
  const end = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((end - start) / 86400000);
}

export type PeriodBounds = { from?: string; to?: string };

export const PERIOD_KEYS: PeriodKey[] = ["7", "30", "90", "all", "custom"];

export function parsePeriodKey(value: string | null | undefined): PeriodKey {
  return PERIOD_KEYS.includes(value as PeriodKey) ? (value as PeriodKey) : "30";
}

function isIsoDay(value: string | null | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export function parsePeriodBounds(params: URLSearchParams | null | undefined): PeriodBounds {
  const from = params?.get("from");
  const to = params?.get("to");
  return {
    from: isIsoDay(from) ? from : undefined,
    to: isIsoDay(to) ? to : undefined,
  };
}

export function writePeriodParams(params: URLSearchParams, period: PeriodKey, bounds?: PeriodBounds) {
  if (period !== "30") params.set("period", period);
  if (period === "custom") {
    if (bounds?.from) params.set("from", bounds.from);
    if (bounds?.to) params.set("to", bounds.to);
  }
}

function normalizeRange(from?: string, to?: string) {
  if (from && to && from > to) return { startDate: to, endDate: from };
  return { startDate: from, endDate: to };
}

export function periodRange(period: PeriodKey, today: Date = DEMO_TODAY, bounds?: PeriodBounds) {
  if (period === "custom") {
    return normalizeRange(bounds?.from, bounds?.to || toApiDate(today));
  }
  if (period === "all") {
    return { startDate: undefined as string | undefined, endDate: toApiDate(today) };
  }
  return rollingRange(Number(period), today);
}

export function rangeForFilters(
  filters: { period: PeriodKey; from?: string; to?: string },
  today: Date = liveToday(),
) {
  return periodRange(filters.period, today, { from: filters.from, to: filters.to });
}

export function previousPeriodRange(period: PeriodKey, today: Date = DEMO_TODAY, bounds?: PeriodBounds) {
  if (period === "custom") {
    const current = periodRange("custom", today, bounds);
    if (!current.startDate || !current.endDate) {
      return { startDate: undefined as string | undefined, endDate: undefined as string | undefined };
    }
    const start = new Date(`${current.startDate}T12:00:00Z`);
    const end = new Date(`${current.endDate}T12:00:00Z`);
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
    const prevEnd = addDays(start, -1);
    const prevStart = addDays(prevEnd, -(days - 1));
    return { startDate: toApiDate(prevStart), endDate: toApiDate(prevEnd) };
  }
  if (period === "all") return { startDate: undefined as string | undefined, endDate: undefined as string | undefined };
  const days = Number(period);
  const end = addDays(today, -days);
  const start = addDays(end, -(days - 1));
  return { startDate: toApiDate(start), endDate: toApiDate(end) };
}

export function inDateRange(iso: string | null, startDate?: string, endDate?: string) {
  if (!iso) return false;
  const day = iso.slice(0, 10);
  if (startDate && day < startDate) return false;
  if (endDate && day > endDate) return false;
  return true;
}

export function daysAgoIso(days: number, today: Date = DEMO_TODAY) {
  return addDays(today, -days).toISOString();
}

export function periodLabel(period: PeriodKey, bounds?: PeriodBounds) {
  if (period === "custom") return rangeLabel(bounds?.from, bounds?.to);
  if (period === "all") return "All time";
  if (period === "7") return "Last 7 days";
  if (period === "90") return "Last 90 days";
  return "Last 30 days";
}

export function formatDisplayDate(iso?: string, month: "short" | "long" = "short") {
  if (!iso) return "—";
  const org = getOrganization();
  const date = iso.includes("T") ? new Date(iso) : new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(organizationLocale(org), {
    day: "numeric",
    month,
    year: "numeric",
    ...(iso.includes("T") ? { timeZone: org.timezone } : {}),
  });
}

export function formatDisplayDateTime(iso?: string) {
  if (!iso) return "—";
  const org = getOrganization();
  return new Date(iso).toLocaleString(organizationLocale(org), {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: org.timezone,
  });
}

export function formatCompactDateTime(iso?: string | null) {
  if (!iso) return "—";
  const org = getOrganization();
  const date = new Date(iso);
  const day = date.toLocaleDateString(organizationLocale(org), {
    day: "numeric",
    month: "short",
    timeZone: org.timezone,
  });
  const time = date.toLocaleTimeString(organizationLocale(org), {
    hour: "numeric",
    minute: "2-digit",
    timeZone: org.timezone,
  });
  return `${day} · ${time}`;
}

export function formatCompactTime(iso?: string | null) {
  if (!iso) return "—";
  const org = getOrganization();
  return new Date(iso).toLocaleTimeString(organizationLocale(org), {
    hour: "numeric",
    minute: "2-digit",
    timeZone: org.timezone,
  });
}

export function formatTimeRange(fromIso: string, toIso: string) {
  const org = getOrganization();
  const locale = organizationLocale(org);
  const from = new Date(fromIso);
  const to = new Date(toIso);
  const day = from.toLocaleDateString(locale, { day: "numeric", month: "short", timeZone: org.timezone });
  const start = from.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit", timeZone: org.timezone });
  const end = to.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit", timeZone: org.timezone });
  return `${day} · ${start} – ${end}`;
}

export function rangeLabel(startDate?: string, endDate?: string) {
  if (!startDate && !endDate) return "All time";
  if (startDate && endDate) return `${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)}`;
  return formatDisplayDate(startDate ?? endDate);
}
