"use client";

import { periodRange, type PeriodBounds } from "@/lib/dates";
import type { PeriodKey } from "@/types/enterprise";
import { cn } from "@/lib/utils";

export const PERIOD_OPTIONS: { id: PeriodKey; name: string }[] = [
  { id: "7", name: "Last 7 days" },
  { id: "30", name: "Last 30 days" },
  { id: "90", name: "Last 90 days" },
  { id: "all", name: "All time" },
  { id: "custom", name: "Custom dates" },
];

const selectClass =
  "h-9 w-full appearance-none rounded-lg border border-black/[0.06] bg-[#F7F6F2] px-2.5 pr-8 font-saveful text-sm text-gray-800 outline-none focus:border-saveful-green/40";

export type PeriodValue = { period: PeriodKey; from?: string; to?: string };

export function nextPeriodValue(period: PeriodKey, current?: PeriodBounds): PeriodValue {
  if (period !== "custom") {
    const range = periodRange(period);
    return { period, from: range.startDate, to: range.endDate };
  }
  if (current?.from && current.to) return { period, from: current.from, to: current.to };
  const fallback = periodRange("30");
  return { period, from: current?.from || fallback.startDate, to: current?.to || fallback.endDate };
}

export function PeriodFilter({
  period,
  from,
  to,
  onChange,
  compact,
  showDates = true,
  datesOnly = false,
}: {
  period: PeriodKey;
  from?: string;
  to?: string;
  onChange: (next: PeriodValue) => void;
  compact?: boolean;
  showDates?: boolean;
  datesOnly?: boolean;
}) {
  const custom = period === "custom";
  return (
    <div className={cn(showDates && custom && !datesOnly ? "space-y-2" : "")}>
      {datesOnly ? null : (
      <label className="block min-w-0">
        <span
          className={cn(
            "block truncate font-saveful uppercase tracking-[0.12em] text-gray-500",
            compact ? "mb-1 text-[10px]" : "mb-1.5 text-[11px]",
          )}
        >
          Period
        </span>
        <div className="relative">
          <select
            value={period}
            onChange={(event) => onChange(nextPeriodValue(event.target.value as PeriodKey, { from, to }))}
            className={cn(selectClass, compact && "h-8 px-2 pr-7 text-xs")}
          >
            {PERIOD_OPTIONS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-gray-400">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
        </div>
      </label>
      )}
      {(datesOnly || (showDates && custom)) ? (
        <div className="grid grid-cols-2 gap-2">
          <DateField
            compact={compact}
            label="From"
            value={from ?? ""}
            max={to}
            onChange={(nextFrom) => onChange({ period: "custom", from: nextFrom, to: to && nextFrom && to < nextFrom ? nextFrom : to })}
          />
          <DateField
            compact={compact}
            label="To"
            value={to ?? ""}
            min={from}
            onChange={(nextTo) => onChange({ period: "custom", from: from && nextTo && from > nextTo ? nextTo : from, to: nextTo })}
          />
        </div>
      ) : null}
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
  compact,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
  min?: string;
  max?: string;
}) {
  return (
    <label className="block min-w-0">
      <span
        className={cn(
          "block truncate font-saveful uppercase tracking-[0.12em] text-gray-500",
          compact ? "mb-1 text-[10px]" : "mb-1.5 text-[11px]",
        )}
      >
        {label}
      </span>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        className={cn(selectClass, compact && "h-8 px-2 pr-3 text-xs")}
      />
    </label>
  );
}
