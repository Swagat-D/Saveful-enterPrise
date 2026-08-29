"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ListFilter, RotateCcw } from "lucide-react";
import { cascadeFilters, filterOptions, filtersToQuery, parseNetworkFilters } from "@/lib/networkQuery";
import { demoNetworkSites } from "@/lib/network";
import { EMPTY_FILTERS, scopeFromUser } from "@/lib/scope";
import { useSession } from "@/lib/auth";
import type { NetworkFilters, PeriodKey } from "@/types/enterprise";
import { cn } from "@/lib/utils";

const selectClass =
  "h-10 w-full appearance-none rounded-xl border border-black/[0.06] bg-[#F7F6F2] px-3 pr-8 font-saveful text-sm text-gray-900 outline-none transition focus:border-saveful-green/40 focus:bg-white focus:ring-2 focus:ring-saveful-green/10";

const PERIODS: { id: PeriodKey; label: string }[] = [
  { id: "7", label: "7 days" },
  { id: "30", label: "30 days" },
  { id: "90", label: "90 days" },
  { id: "all", label: "All time" },
];

export function useNetworkFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const user = useSession();
  const scope = scopeFromUser(user);

  const filters = useMemo(
    () => cascadeFilters(parseNetworkFilters(searchParams), demoNetworkSites, scope),
    [searchParams, scope],
  );
  const options = useMemo(() => filterOptions(demoNetworkSites, scope, filters), [scope, filters]);

  const setFilters = (next: NetworkFilters, extra?: Record<string, string | undefined>) => {
    const cleaned = cascadeFilters(next, demoNetworkSites, scope);
    router.replace(`${pathname}${filtersToQuery(cleaned, extra)}`, { scroll: false });
  };

  return { filters, options, scope, setFilters };
}

export function FilterBar({
  extra,
}: {
  extra?: Record<string, string | undefined>;
}) {
  const { filters, options, setFilters } = useNetworkFilters();

  const update = (patch: Partial<NetworkFilters>) => {
    setFilters({ ...filters, ...patch }, extra);
  };

  const resetFilters = () => setFilters({ ...EMPTY_FILTERS }, extra);
  const activeCount = [
    filters.groupId !== "all",
    filters.territoryId !== "all",
    filters.clusterId !== "all",
    filters.siteId !== "all",
    filters.period !== "30",
  ].filter(Boolean).length;

  const periodName = PERIODS.find((item) => item.id === filters.period)?.label ?? "30 days";
  const applied = [
    labelFor(options.groups, filters.groupId),
    labelFor(options.territories, filters.territoryId),
    labelFor(options.clusters, filters.clusterId),
    labelFor(options.sites, filters.siteId),
  ].filter(Boolean);
  const summary = applied.length ? `${applied.join(" · ")} · ${periodName}` : `All locations · ${periodName}`;

  const fields = (
    <>
      <FilterSelect
        label="Group"
        value={filters.groupId}
        onChange={(groupId) => update({ groupId })}
        options={options.groups}
      />
      <FilterSelect
        label="Territory"
        value={filters.territoryId}
        onChange={(territoryId) => update({ territoryId })}
        options={options.territories}
      />
      <FilterSelect
        label="Cluster"
        value={filters.clusterId}
        onChange={(clusterId) => update({ clusterId })}
        options={options.clusters}
      />
      <FilterSelect
        label="Site"
        value={filters.siteId}
        onChange={(siteId) => update({ siteId })}
        options={options.sites}
      />
      <FilterSelect
        label="Period"
        value={filters.period}
        onChange={(period) => update({ period: period as PeriodKey })}
        options={PERIODS.map((item) => ({ id: item.id, name: item.label }))}
        allLabel={null}
      />
    </>
  );

  return (
    <>
      <div className="lg:hidden">
        <MoreFilters
          count={activeCount}
          summary={summary}
          title="Filter this view"
          subtitle="Refine the dashboard without covering the numbers."
          onReset={resetFilters}
        >
          <div className="grid grid-cols-1 gap-3">{fields}</div>
        </MoreFilters>
      </div>

      <div className="hidden rounded-2xl border border-black/[0.04] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] lg:block">
        <p className="mb-3 font-saveful text-[11px] uppercase tracking-[0.16em] text-gray-400">
          Filter this view
        </p>
        <div className="flex items-end gap-3">
          <div className="grid min-w-0 flex-1 grid-cols-5 gap-3">{fields}</div>
          <FilterResetButton onReset={resetFilters} active={activeCount > 0} className="mb-0.5" />
        </div>
      </div>
    </>
  );
}

export function FilterResetButton({
  onReset,
  active,
  className,
}: {
  onReset: () => void;
  active: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onReset}
      disabled={!active}
      aria-label="Reset filters"
      className={cn(
        "mb-px flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-black/[0.06] bg-[#F7F6F2] text-gray-500",
        active ? "hover:border-saveful-green/30 hover:text-saveful-green" : "opacity-40",
        className,
      )}
    >
      <RotateCcw className="h-3.5 w-3.5" />
    </button>
  );
}

export function MoreFilters({
  count,
  summary,
  title,
  subtitle,
  onReset,
  children,
}: {
  count: number;
  summary?: string;
  title: string;
  subtitle?: string;
  onReset: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex min-h-14 w-full items-center gap-3 rounded-2xl border bg-white px-4 py-3 text-left shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition",
          open || count
            ? "border-saveful-green/30 ring-1 ring-saveful-green/15"
            : "border-black/[0.04]",
        )}
      >
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            count ? "bg-saveful-green text-white" : "bg-saveful-green/10 text-saveful-green",
          )}
        >
          <ListFilter className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="font-saveful-semibold text-sm text-gray-900">Filters</span>
            {count ? (
              <span className="rounded-full bg-saveful-green px-1.5 py-0.5 font-saveful text-[11px] text-white">
                {count}
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 block truncate font-saveful text-xs text-gray-500">
            {summary || (count ? `${count} applied` : "Tap to refine this view")}
          </span>
        </span>
        <ChevronDown className={cn("h-5 w-5 shrink-0 text-gray-400 transition", open && "rotate-180")} />
      </button>

      {typeof document !== "undefined" && open
        ? createPortal(
            <div className="fixed inset-0 z-[80] lg:hidden">
              <button
                type="button"
                aria-label="Close filters"
                className="absolute inset-0 bg-black/35"
                onClick={() => setOpen(false)}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="more-filters-title"
                className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-hidden rounded-t-3xl bg-white shadow-[0_-8px_40px_rgba(16,24,40,0.18)]"
              >
                <div className="flex justify-center pt-3">
                  <span className="h-1.5 w-10 rounded-full bg-gray-200" />
                </div>
                <div className="px-5 pb-2 pt-3">
                  <p id="more-filters-title" className="font-saveful-bold text-lg text-gray-900">
                    {title}
                  </p>
                  {subtitle ? (
                    <p className="mt-0.5 font-saveful text-sm text-gray-500">{subtitle}</p>
                  ) : null}
                </div>
                <div className="max-h-[calc(88dvh-11rem)] overflow-y-auto px-5 pb-4">{children}</div>
                <div className="flex items-center gap-3 border-t border-gray-100 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                  <button
                    type="button"
                    onClick={onReset}
                    className="h-12 flex-1 rounded-2xl border border-black/[0.06] bg-[#F7F6F2] font-saveful-semibold text-sm text-gray-700"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="h-12 flex-1 rounded-2xl bg-saveful-green font-saveful-semibold text-sm text-white"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function labelFor(options: { id: string; name: string }[], id: string) {
  if (id === "all") return "";
  return options.find((item) => item.id === id)?.name ?? "";
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel = "All",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; name: string }[];
  allLabel?: string | null;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block font-saveful text-[11px] uppercase tracking-[0.14em] text-gray-500">
        {label}
      </span>
      <div className="relative">
        <select value={value} onChange={(event) => onChange(event.target.value)} className={selectClass}>
          {allLabel ? <option value="all">{allLabel}</option> : null}
          {options.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
      </div>
    </label>
  );
}

