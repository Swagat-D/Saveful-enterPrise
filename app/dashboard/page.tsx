"use client";

import { Suspense } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Download,
  Leaf,
  Recycle,
  TrendingDown,
  TrendingUp,
  Users,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { AppPage } from "@/components/layout/AppPage";
import { FilterBar, useNetworkFilters } from "@/components/network/FilterBar";
import { Button } from "@/components/ui/button";
import { PortalPanel } from "@/components/ui/Portal";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";
import { CHART_COLORS, CHART_TOOLTIP } from "@/lib/demo";
import { periodLabel } from "@/lib/dates";
import { formatCount, formatKg, formatMoney } from "@/lib/impact";
import { buildDashboardModel, filtersToQuery } from "@/lib/networkQuery";
import { cn } from "@/lib/utils";

const PATHWAY_TONE = ["#2D5F4F", "#5B8A78", "#A3C4B5", "#D9DDD4"] as const;

export default function DashboardPage() {
  return (
    <Suspense fallback={<SavefulPageLoader message="Loading dashboard…" />}>
      <EnterpriseDashboard />
    </Suspense>
  );
}

function EnterpriseDashboard() {
  const { filters, scope, setFilters } = useNetworkFilters();
  const model = buildDashboardModel(filters, scope);
  const query = filtersToQuery(filters);
  const reportHref = `/insights${query}`;

  const metrics = [
    {
      label: "Food recovered",
      value: formatKg(model.metrics.foodRecovered.value),
      trend: model.metrics.foodRecovered.trend,
      icon: UtensilsCrossed,
    },
    {
      label: "Meals created",
      value: formatCount(model.metrics.mealsCreated.value),
      trend: model.metrics.mealsCreated.trend,
      icon: Users,
    },
    {
      label: "CO₂ avoided",
      value: formatKg(model.metrics.co2Avoided.value),
      trend: model.metrics.co2Avoided.trend,
      icon: Leaf,
    },
    {
      label: "Estimated food value",
      value: formatMoney(model.metrics.foodValue.value),
      trend: model.metrics.foodValue.trend,
      icon: Wallet,
    },
    {
      label: "Completed collections",
      value: formatCount(model.metrics.collections.value),
      trend: model.metrics.collections.trend,
      icon: CalendarCheck,
    },
    {
      label: "Organisations supported",
      value: formatCount(model.metrics.organisations.value),
      trend: model.metrics.organisations.trend,
      icon: Recycle,
    },
  ];

  return (
    <AppPage
      title="Enterprise Overview"
      description="See what's happening across your Saveful network."
      actions={
        <Button href={reportHref} className="w-full sm:w-auto">
          <Download className="h-4 w-4" />
          Download report
        </Button>
      }
    >
      <FilterBar />

      <section>
        <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </div>
        <p className="mt-2 font-saveful text-[11px] text-gray-400">
          Trend compared with the previous period
        </p>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <PortalPanel title="Recovery pathways" subtitle="Where recovered food goes">
          <div className="flex h-2.5 overflow-hidden rounded-full bg-[#F0EEE8]">
            {model.pathways.map((item, index) => (
              <div
                key={item.pathway}
                className="h-full first:rounded-l-full last:rounded-r-full"
                style={{ width: `${Math.max(item.percent, item.kg > 0 ? 2 : 0)}%`, background: PATHWAY_TONE[index] }}
              />
            ))}
          </div>
          <ul className="mt-5 space-y-3.5">
            {model.pathways.map((item, index) => (
              <li key={item.pathway}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: PATHWAY_TONE[index] }}
                    />
                    <p className="truncate font-saveful text-sm text-gray-700">{item.label}</p>
                  </div>
                  <p className="shrink-0 font-saveful-semibold text-sm tabular-nums text-gray-900">
                    {item.percent}%
                  </p>
                </div>
                <p className="mt-0.5 pl-5 font-saveful text-xs text-gray-400">{formatKg(item.kg)}</p>
              </li>
            ))}
          </ul>
        </PortalPanel>

        <PortalPanel
          title="Your network"
          subtitle="Site status is separate from activity"
          action={
            <Button href={`/sites${query}`} variant="ghost" size="sm" className="text-saveful-green">
              View all
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          }
        >
          <div className="grid grid-cols-2 gap-2.5">
            <NetworkMetric label="Total sites" value={model.network.totalSites} icon={Building2} />
            <NetworkMetric
              label="Active sites"
              value={model.network.activeSites}
              icon={CheckCircle2}
              hint="Activated"
            />
            <NetworkMetric
              label="With activity"
              value={model.network.sitesWithActivity}
              icon={CalendarCheck}
              hint={periodLabel(filters.period)}
            />
            <NetworkMetric
              label="Without activity"
              value={model.network.sitesWithoutActivity}
              icon={AlertTriangle}
              tone="amber"
              hint="Idle this period"
            />
          </div>
        </PortalPanel>

        <PortalPanel
          title="Needs attention"
          subtitle="Open a row to manage those sites"
          action={
            <Button
              href={`/sites${filtersToQuery(filters, { attention: "all" })}`}
              variant="ghost"
              size="sm"
              className="text-saveful-green"
            >
              View all
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          }
        >
          <div className="space-y-2">
            {model.attention.map((item) => {
              const alert = item.count > 0;
              return (
                <Link
                  key={item.reason}
                  href={`/sites${filtersToQuery(filters, { attention: item.reason })}`}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition",
                    alert
                      ? "bg-[#F8EEEA] hover:bg-[#F3E4DE]"
                      : "bg-[#F7F6F2] hover:bg-[#EFEDE6]",
                  )}
                >
                  <div className="min-w-0">
                    <p className="font-saveful-semibold text-sm text-gray-900">
                      {item.count} {item.count === 1 ? "site" : "sites"}
                    </p>
                    <p className="truncate font-saveful text-xs text-gray-500">{item.label}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                </Link>
              );
            })}
          </div>
        </PortalPanel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <PortalPanel
          title="Impact over time"
          subtitle="Food recovered for the selected filters"
          className="xl:col-span-3"
        >
          <div className="h-56 sm:h-64 lg:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={model.series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.green} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={CHART_COLORS.green} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#EFEDE6" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#94A3B8" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94A3B8" }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                  tickFormatter={(value) => `${Math.round(Number(value))}`}
                />
                <Tooltip
                  contentStyle={CHART_TOOLTIP}
                  formatter={(value) => [formatKg(Number(value)), "Food recovered"]}
                />
                <Area
                  type="monotone"
                  dataKey="kg"
                  stroke={CHART_COLORS.green}
                  fill="url(#dashFill)"
                  strokeWidth={2.25}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </PortalPanel>

        <PortalPanel title="Performance by group" subtitle="Select a group to drill in" className="xl:col-span-2">
          <div className="space-y-2 md:hidden">
            {model.groups.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() =>
                  setFilters({
                    ...filters,
                    groupId: group.id,
                    territoryId: "all",
                    clusterId: "all",
                    siteId: "all",
                  })
                }
                className="flex w-full items-center justify-between gap-3 rounded-xl bg-[#F7F6F2] px-3 py-3 text-left"
              >
                <div className="min-w-0">
                  <p className="font-saveful-semibold text-sm text-gray-900">{group.name}</p>
                  <p className="mt-0.5 font-saveful text-xs text-gray-500">
                    {formatKg(group.foodKg)} · {group.collections} collections
                  </p>
                </div>
                <Trend value={group.trend} />
              </button>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 font-saveful text-[11px] uppercase tracking-wide text-gray-400">
                  <th className="pb-2.5 pr-3 font-saveful">Group</th>
                  <th className="pb-2.5 pr-3 font-saveful">Food</th>
                  <th className="hidden pb-2.5 pr-3 font-saveful lg:table-cell">Collections</th>
                  <th className="pb-2.5 text-right font-saveful">Trend</th>
                </tr>
              </thead>
              <tbody>
                {model.groups.map((group) => (
                  <tr key={group.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-3 pr-3">
                      <button
                        type="button"
                        onClick={() =>
                          setFilters({
                            ...filters,
                            groupId: group.id,
                            territoryId: "all",
                            clusterId: "all",
                            siteId: "all",
                          })
                        }
                        className="text-left font-saveful-semibold text-sm text-saveful-green hover:underline"
                      >
                        {group.name}
                      </button>
                      <p className="font-saveful text-[11px] text-gray-400">
                        {group.activeSites}/{group.totalSites} active
                      </p>
                    </td>
                    <td className="py-3 pr-3 font-saveful text-sm tabular-nums text-gray-800">
                      {formatKg(group.foodKg)}
                    </td>
                    <td className="hidden py-3 pr-3 font-saveful text-sm tabular-nums text-gray-800 lg:table-cell">
                      {group.collections}
                    </td>
                    <td className="py-3 text-right">
                      <Trend value={group.trend} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PortalPanel>
      </div>
    </AppPage>
  );
}

function MetricCard({
  label,
  value,
  trend,
  icon: Icon,
}: {
  label: string;
  value: string;
  trend: number;
  icon: LucideIcon;
}) {
  return (
    <article className="rounded-2xl border border-black/[0.04] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <p className="font-saveful text-[11px] uppercase tracking-[0.12em] text-gray-500">{label}</p>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-saveful-green/10 text-saveful-green">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 font-saveful-bold text-[1.35rem] leading-none tabular-nums text-gray-900 sm:text-2xl">
        {value}
      </p>
      <div className="mt-3">
        <Trend value={trend} />
      </div>
    </article>
  );
}

function NetworkMetric({
  label,
  value,
  icon: Icon,
  hint,
  tone = "green",
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  hint?: string;
  tone?: "green" | "amber";
}) {
  return (
    <div className="rounded-xl bg-[#F7F6F2] px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-saveful-bold text-2xl tabular-nums leading-none text-gray-900">{value}</p>
        <Icon className={cn("h-4 w-4", tone === "amber" ? "text-amber-600" : "text-saveful-green")} />
      </div>
      <p className="mt-2 font-saveful-semibold text-xs text-gray-800">{label}</p>
      {hint ? <p className="mt-0.5 font-saveful text-[11px] text-gray-500">{hint}</p> : null}
    </div>
  );
}

function Trend({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-saveful text-[11px]",
        up ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600",
      )}
    >
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? "+" : ""}
      {value}%
    </span>
  );
}
