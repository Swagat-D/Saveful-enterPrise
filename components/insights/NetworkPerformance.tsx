"use client";

import Link from "next/link";
import { ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import { periodLabel } from "@/lib/dates";
import { formatKg } from "@/lib/impact";
import type { InsightsFilters, PerformanceView } from "@/lib/insights";
import {
  sitesDirectoryHref,
  type NetworkPerformanceModel,
  type NetworkTrend,
} from "@/lib/networkPerformance";
import type { AttentionReason } from "@/types/enterprise";
import { cn } from "@/lib/utils";

const VIEWS: { id: PerformanceView; label: string }[] = [
  { id: "group", label: "Group" },
  { id: "territory", label: "Territory" },
  { id: "cluster", label: "Cluster" },
  { id: "site", label: "Site" },
];

export function NetworkPerformance({
  filters,
  model,
  onViewBy,
}: {
  filters: InsightsFilters;
  model: NetworkPerformanceModel;
  onViewBy: (viewBy: PerformanceView) => void;
}) {
  const { network, rows, attention } = model;
  const shownRows = filters.viewBy === "site" ? rows.slice(0, 8) : rows;
  const shownAttention = attention.slice(0, 8);
  const viewLabel = VIEWS.find((item) => item.id === filters.viewBy)?.label ?? "Group";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-saveful-bold text-lg text-gray-900">Network Performance</h2>
        <p className="mt-1 font-saveful text-xs text-gray-500">
          Understand participation and activity across your Enterprise network.
        </p>
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center gap-2 border-b border-gray-100 bg-[#F7F6F2] px-3.5 py-2">
          <span className="h-3.5 w-1 rounded-full bg-saveful-green" aria-hidden />
          <h3 className="font-saveful-semibold text-xs uppercase tracking-[0.14em] text-gray-700">Network snapshot</h3>
          <span className="font-saveful text-[11px] text-gray-400">{periodLabel(filters.period)}</span>
        </div>
        <div className="grid grid-cols-2 gap-px bg-gray-100 sm:grid-cols-3 xl:grid-cols-5">
          <MetricLink href={sitesDirectoryHref(filters)} label="Total sites" value={network.totalSites} />
          <MetricLink
            href={sitesDirectoryHref(filters, { summary: "active" })}
            label="Active sites"
            value={network.activeSites}
          />
          <MetricLink
            href={sitesDirectoryHref(filters, { activity: "in_period" })}
            label="Sites with activity"
            value={network.sitesWithActivity}
          />
          <MetricLink
            href={sitesDirectoryHref(filters, { activity: "none_in_period" })}
            label="No activity"
            value={network.noActivity}
          />
          <MetricLink
            href={sitesDirectoryHref(filters, { summary: "never_activated" })}
            label="Never activated"
            value={network.neverActivated}
          />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white xl:col-span-1">
          <div className="flex items-center gap-2 border-b border-gray-100 bg-[#F7F6F2] px-3.5 py-2">
            <span className="h-3.5 w-1 rounded-full bg-saveful-green" aria-hidden />
            <h3 className="font-saveful-semibold text-xs uppercase tracking-[0.14em] text-gray-700">Participation</h3>
          </div>
          <div className="space-y-3 p-3.5">
            <p className="font-saveful text-sm leading-snug text-gray-800">
              <span className="font-saveful-bold text-2xl tabular-nums text-gray-900">{network.participationRate}%</span>
              {" "}of active sites had activity in the selected period.
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-[#F0EEE8]">
              <div
                className="h-full rounded-full bg-saveful-green"
                style={{ width: `${Math.max(network.participationRate, network.sitesWithActivity > 0 ? 2 : 0)}%` }}
              />
            </div>
            <p className="font-saveful text-xs text-gray-500">
              {network.sitesWithActivity} of {network.activeSites} active sites
            </p>
            <p className="font-saveful text-xs text-gray-500">
              Compared with previous period: <Trend value={network.participationTrend} />
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white xl:col-span-2">
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-[#F7F6F2] px-3.5 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-3.5 w-1 rounded-full bg-saveful-green" aria-hidden />
              <h3 className="font-saveful-semibold text-xs uppercase tracking-[0.14em] text-gray-700">
                Performance by {viewLabel.toLowerCase()}
              </h3>
            </div>
            <label className="flex items-center gap-2 font-saveful text-xs text-gray-500">
              View by
              <select
                value={filters.viewBy}
                onChange={(event) => onViewBy(event.target.value as PerformanceView)}
                className="h-8 rounded-lg border border-black/[0.06] bg-white px-2 font-saveful text-xs text-gray-800 outline-none"
              >
                {VIEWS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 font-saveful text-[11px] uppercase tracking-wide text-gray-400">
                  <th className="px-3.5 pb-2 pt-2.5 font-saveful">{viewLabel}</th>
                  <th className="pb-2 pt-2.5 pr-3 font-saveful">Sites</th>
                  <th className="hidden pb-2 pt-2.5 pr-3 font-saveful sm:table-cell">With activity</th>
                  <th className="pb-2 pt-2.5 pr-3 font-saveful">Participation</th>
                  <th className="hidden pb-2 pt-2.5 pr-3 font-saveful md:table-cell">Food recovered</th>
                  <th className="pb-2 pt-2.5 pr-3.5 font-saveful">Trend</th>
                </tr>
              </thead>
              <tbody>
                {shownRows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-50 last:border-0 hover:bg-[#FAF7F0]">
                    <td className="px-3.5 py-2.5">
                      <Link href={row.href} className="font-saveful-semibold text-sm text-saveful-green hover:underline">
                        {row.name}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-3 font-saveful text-sm tabular-nums text-gray-800">{row.sites}</td>
                    <td className="hidden py-2.5 pr-3 font-saveful text-sm tabular-nums text-gray-800 sm:table-cell">
                      {row.sitesWithActivity}
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-saveful text-sm tabular-nums text-gray-800">{row.participation}%</span>
                        <span className="hidden h-1.5 w-12 overflow-hidden rounded-full bg-[#F0EEE8] md:block">
                          <span className="block h-full rounded-full bg-saveful-green" style={{ width: `${row.participation}%` }} />
                        </span>
                      </div>
                    </td>
                    <td className="hidden py-2.5 pr-3 font-saveful text-sm tabular-nums text-gray-800 md:table-cell">
                      {row.foodKg > 0 ? formatKg(row.foodKg) : "—"}
                    </td>
                    <td className="py-2.5 pr-3.5">
                      <Trend value={row.trend} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length === 0 ? (
            <p className="px-3.5 py-3 font-saveful text-sm text-gray-500">No locations match these filters.</p>
          ) : (
            <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
              <p className="font-saveful text-xs text-gray-500">
                Showing 1 to {shownRows.length} of {rows.length} {viewLabel.toLowerCase()}s
              </p>
              <Link
                href={sitesDirectoryHref(filters)}
                className="font-saveful-semibold text-xs text-saveful-green hover:underline"
              >
                View all {viewLabel.toLowerCase()}s
              </Link>
            </div>
          )}
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-[#F7F6F2] px-3.5 py-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="h-3.5 w-1 rounded-full bg-saveful-green" aria-hidden />
              <h3 className="font-saveful-semibold text-xs uppercase tracking-[0.14em] text-gray-700">
                Sites requiring attention
              </h3>
            </div>
            <p className="mt-1 pl-3 font-saveful text-[11px] text-gray-400">
              Objective conditions where support or setup may be needed.
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 font-saveful text-[11px] uppercase tracking-wide text-gray-400">
                <th className="px-3.5 pb-2 pt-2.5 font-saveful">Site</th>
                <th className="pb-2 pt-2.5 pr-3 font-saveful">Group</th>
                <th className="hidden pb-2 pt-2.5 pr-3 font-saveful sm:table-cell">Territory</th>
                <th className="pb-2 pt-2.5 pr-3 font-saveful">Last activity</th>
                <th className="pb-2 pt-2.5 pr-3 font-saveful">Status</th>
                <th className="pb-2 pt-2.5 pr-3.5 font-saveful"> </th>
              </tr>
            </thead>
            <tbody>
              {shownAttention.map((row) => (
                <tr key={row.id} className="border-b border-gray-50 last:border-0 hover:bg-[#FAF7F0]">
                  <td className="px-3.5 py-2.5">
                    <Link href={row.href} className="font-saveful-semibold text-sm text-gray-900 hover:text-saveful-green">
                      {row.name}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-3 font-saveful text-sm text-gray-700">{row.group}</td>
                  <td className="hidden py-2.5 pr-3 font-saveful text-sm text-gray-700 sm:table-cell">{row.territory}</td>
                  <td className="py-2.5 pr-3 font-saveful text-sm text-gray-600">{row.lastActivity}</td>
                  <td className="py-2.5 pr-3">
                    <AttentionPill reason={row.reason} label={row.status} />
                  </td>
                  <td className="py-2.5 pr-3.5">
                    <Link href={row.href} className="text-gray-400 hover:text-gray-700" aria-label={`Open ${row.name}`}>
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {attention.length === 0 ? (
          <p className="px-3.5 py-3 font-saveful text-sm text-gray-500">No sites currently meet an attention condition.</p>
        ) : (
          <div className="px-3.5 py-2.5">
            <Link
              href={sitesDirectoryHref(filters, { attention: "all" })}
              className="font-saveful-semibold text-xs text-saveful-green hover:underline"
            >
              View all sites requiring attention
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

function MetricLink({ href, label, value }: { href: string; label: string; value: number }) {
  return (
    <Link href={href} className="bg-white px-3 py-3 text-left transition hover:bg-[#FAF7F0]">
      <p className="font-saveful-bold text-[1.05rem] tabular-nums leading-none text-gray-900">{value}</p>
      <p className="mt-1.5 font-saveful text-[11px] text-gray-500">{label}</p>
    </Link>
  );
}

function Trend({ value }: { value: NetworkTrend }) {
  if (value == null) {
    return <span className="font-saveful text-xs text-gray-400">—</span>;
  }
  const up = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-saveful-semibold text-xs",
        up ? "text-saveful-green" : "text-red-600",
      )}
    >
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? "+" : ""}
      {value}%
    </span>
  );
}

function AttentionPill({ reason, label }: { reason: AttentionReason; label: string }) {
  const tone =
    reason === "never_activated"
      ? "bg-gray-100 text-gray-600"
      : reason === "setup_required"
        ? "bg-slate-100 text-slate-700"
        : "bg-amber-50 text-amber-700";
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 font-saveful text-[11px]", tone)}>{label}</span>;
}
