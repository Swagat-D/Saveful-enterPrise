import type { PeriodKey } from "@/types/enterprise";

/** Fixed demo “today” so generated history and filters stay aligned. */
export const DEMO_TODAY = new Date("2026-08-22T12:00:00.000Z");

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

export function periodRange(period: PeriodKey, today: Date = DEMO_TODAY) {
  if (period === "all") {
    return { startDate: undefined as string | undefined, endDate: toApiDate(today) };
  }
  const days = Number(period);
  const end = today;
  const start = addDays(end, -(days - 1));
  return { startDate: toApiDate(start), endDate: toApiDate(end) };
}

export function previousPeriodRange(period: PeriodKey, today: Date = DEMO_TODAY) {
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

export function periodLabel(period: PeriodKey) {
  if (period === "all") return "All time";
  return `${period} days`;
}
