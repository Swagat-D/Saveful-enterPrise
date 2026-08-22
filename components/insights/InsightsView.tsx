"use client";

import { useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowRight, ChevronDown, Download, FileSpreadsheet, FileText, Plus, Star } from "lucide-react";
import { AppPage } from "@/components/layout/AppPage";
import { FilterBar, useNetworkFilters } from "@/components/network/FilterBar";
import { Button } from "@/components/ui/button";
import { PortalChip, PortalPanel } from "@/components/ui/Portal";
import { demoOrganization, demoSites, CHART_COLORS, CHART_TOOLTIP } from "@/lib/demo";
import {
  filterLabel,
  formatCollectionDate,
  formatKg,
  formatMoney,
  formatNumber,
  getChartSeries,
  getFilterFactor,
  getImpactStats,
  getRecipients,
  getTopFoods,
  presetRange,
  siteLabel,
  type ChartMetric,
  type ChartPeriod,
  type ImpactFilterMode,
} from "@/lib/impactDemo";
import { downloadImpactExcel, printImpactPdf } from "@/lib/impactReport";
import { SpecificFoodSavings } from "@/components/insights/SpecificFoodSavings";
import { useSession } from "@/lib/auth";
import { scopeFromUser } from "@/lib/scope";
import { cn } from "@/lib/utils";

const TIME_RANGES: { key: ChartPeriod; label: string }[] = [
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
];

const METRICS: { key: ChartMetric; label: string; suffix?: string }[] = [
  { key: "food", label: "Food", suffix: " kg" },
  { key: "meals", label: "Meals" },
  { key: "co2", label: "CO₂", suffix: " kg" },
  { key: "collections", label: "Collections" },
];

const PRESETS = [7, 30, 90] as const;

export function InsightsView({ lockedSiteId }: { lockedSiteId?: string }) {
  return lockedSiteId ? <LockedInsights siteId={lockedSiteId} /> : <NetworkInsights />;
}

function NetworkInsights() {
  const { filters, scope, setFilters } = useNetworkFilters();
  return (
    <InsightsBody
      siteId={filters.siteId}
      locked={false}
      scope={scope}
      network={{
        groupId: filters.groupId,
        territoryId: filters.territoryId,
        clusterId: filters.clusterId,
      }}
      wrap={(children, actions) => (
        <AppPage
          eyebrow="Impact"
          title="Insights & Reports"
          description="See the difference your surplus makes across HQ and branches."
          actions={actions}
        >
          <FilterBar />
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="mb-2 font-saveful-semibold text-xs uppercase tracking-wide text-gray-500">Site</p>
              <div className="-mx-1 flex gap-2 overflow-x-auto pb-1">
                <PortalChip active={filters.siteId === "all"} onClick={() => setFilters({ ...filters, siteId: "all" })}>
                  All sites
                </PortalChip>
                {demoSites.map((site) => (
                  <PortalChip
                    key={site.id}
                    active={filters.siteId === site.id}
                    onClick={() => setFilters({ ...filters, siteId: site.id })}
                  >
                    {site.name}
                  </PortalChip>
                ))}
              </div>
            </div>
          </div>
          {children}
        </AppPage>
      )}
    />
  );
}

function LockedInsights({ siteId }: { siteId: string }) {
  const scope = scopeFromUser(useSession());
  return (
    <InsightsBody
      siteId={siteId}
      locked
      scope={scope}
      network={{ groupId: "all", territoryId: "all", clusterId: "all" }}
      wrap={(children, actions) => (
        <div className="space-y-4">
          <div className="flex justify-end">{actions}</div>
          {children}
        </div>
      )}
    />
  );
}

function InsightsBody({
  siteId,
  locked,
  scope,
  network,
  wrap,
}: {
  siteId: string;
  locked?: boolean;
  scope: ReturnType<typeof scopeFromUser>;
  network: { groupId: string; territoryId: string; clusterId: string };
  wrap: (children: ReactNode, actions: ReactNode) => ReactNode;
}) {
  const [mode, setMode] = useState<ImpactFilterMode>("custom");
  const initialRange = presetRange(30);
  const [startDate, setStartDate] = useState(initialRange.startDate);
  const [endDate, setEndDate] = useState(initialRange.endDate);
  const [range, setRange] = useState<ChartPeriod>("month");
  const [metric, setMetric] = useState<ChartMetric>("food");
  const [expandedRecipient, setExpandedRecipient] = useState<number | null>(1);
  const [reportOpen, setReportOpen] = useState(false);

  const bounds = mode === "all_time" ? { startDate: undefined, endDate: undefined } : { startDate, endDate };
  const factor = getFilterFactor(mode, startDate, endDate);
  const stats = useMemo(
    () => getImpactStats(siteId, bounds.startDate, bounds.endDate, scope, network),
    [siteId, bounds.startDate, bounds.endDate, scope, network],
  );
  const foods = useMemo(() => getTopFoods(factor), [factor]);
  const recipients = useMemo(() => getRecipients(factor), [factor]);
  const chartData = useMemo(
    () => getChartSeries(range, metric, siteId, scope, network),
    [range, metric, siteId, scope, network],
  );
  const periodName = filterLabel(mode, startDate, endDate);
  const currentSite = siteLabel(siteId);
  const activeMetric = METRICS.find((item) => item.key === metric)!;
  const reportPayload = {
    organisation: demoOrganization.name,
    site: currentSite,
    period: periodName,
    stats,
    foods,
    recipients,
  };

  const actions = (
    <>
      {locked ? null : (
        <Button href="/listings/new" variant="secondary" className="w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Create listing
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      )}
      <div className="relative">
        <Button className="w-full sm:w-auto" size={locked ? "sm" : "default"} onClick={() => setReportOpen((open) => !open)}>
          <Download className="h-4 w-4" />
          Download report
        </Button>
        {reportOpen ? (
          <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-gray-100 bg-white p-1 shadow-lg">
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left font-saveful text-sm hover:bg-[#F7F6F2]"
              onClick={() => {
                printImpactPdf(reportPayload);
                setReportOpen(false);
              }}
            >
              <FileText className="h-4 w-4 text-saveful-green" />
              PDF report
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left font-saveful text-sm hover:bg-[#F7F6F2]"
              onClick={() => {
                downloadImpactExcel(reportPayload);
                setReportOpen(false);
              }}
            >
              <FileSpreadsheet className="h-4 w-4 text-saveful-green" />
              Excel spreadsheet
            </button>
          </div>
        ) : null}
      </div>
    </>
  );

  return wrap(
    <>
      {locked ? (
        <p className="font-saveful text-sm text-gray-500">
          {formatNumber(stats.mealsCreated)} meals · {formatKg(stats.redistributedKg)} · {periodName}
        </p>
      ) : (
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-100 bg-white px-3 py-2.5 text-sm text-gray-600 shadow-sm">
        <span className="rounded-full bg-saveful-green/10 px-2.5 py-1 font-saveful-semibold text-saveful-green">
          {currentSite}
        </span>
        <span>{formatNumber(stats.mealsCreated)} meals</span>
        <span className="text-gray-300">·</span>
        <span>{formatKg(stats.redistributedKg)}</span>
        <span className="text-gray-300">·</span>
        <span>{periodName}</span>
      </div>
      )}

      <div className={cn("flex flex-col gap-3", locked ? "" : "rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5")}>
        <p className="font-saveful-semibold text-xs uppercase tracking-wide text-gray-500">Period</p>
        <div className="flex flex-wrap gap-2">
          <PortalChip active={mode === "all_time"} onClick={() => setMode("all_time")}>
            All time
          </PortalChip>
          {PRESETS.map((days) => {
            const rangeDates = presetRange(days);
            const active = mode === "custom" && startDate === rangeDates.startDate && endDate === rangeDates.endDate;
            return (
              <PortalChip
                key={days}
                active={active}
                onClick={() => {
                  setMode("custom");
                  setStartDate(rangeDates.startDate);
                  setEndDate(rangeDates.endDate);
                }}
              >
                {days} days
              </PortalChip>
            );
          })}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-lg">
          <label className="block">
            <span className="mb-1.5 block font-saveful text-xs uppercase tracking-wide text-gray-400">From</span>
            <input
              type="date"
              value={mode === "custom" ? startDate : ""}
              onChange={(event) => {
                setMode("custom");
                setStartDate(event.target.value);
              }}
              className="h-11 w-full rounded-xl border-2 border-transparent bg-[#F5F1E8] px-3 font-saveful text-sm outline-none focus:border-[#A68FD9] focus:bg-white"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block font-saveful text-xs uppercase tracking-wide text-gray-400">To</span>
            <input
              type="date"
              value={mode === "custom" ? endDate : ""}
              onChange={(event) => {
                setMode("custom");
                setEndDate(event.target.value);
              }}
              className="h-11 w-full rounded-xl border-2 border-transparent bg-[#F5F1E8] px-3 font-saveful text-sm outline-none focus:border-[#A68FD9] focus:bg-white"
            />
          </label>
        </div>
      </div>

      <section>
        <h2 className="mb-3 font-saveful-bold text-lg text-gray-900">
          {mode === "all_time" ? "All-time impact" : `Impact · ${periodName}`}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard icon="/listing/veggie_basket.png" value={formatKg(stats.redistributedKg)} label="Redistributed" />
          <MetricCard icon="/listing/cutlery_icon.png" value={formatNumber(stats.mealsCreated)} label="Meals created" />
          <MetricCard icon="/listing/co2_green_icon.png" value={formatKg(stats.co2AvoidedKg)} label="CO₂ avoided" />
          <MetricCard icon="/listing/money_icon.png" value={formatMoney(stats.foodSavedMoney)} label="Food saved" />
          <MetricCard icon="/listing/truck_icon.png" value={formatNumber(stats.collectionsCompleted)} label="Collections" />
          <MetricCard icon="/listing/charity_green.png" value={formatNumber(stats.partnersSupported)} label="Charities" />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <SplitCard title="For people" icon="/listing/people_icon.png" value={formatKg(stats.peopleKg)} hint="Food donated" percent={stats.peoplePercent} tone="green" />
          <SplitCard title="For animals" icon="/listing/cow_front.png" value={formatKg(stats.animalKg)} hint="Feed provided" percent={stats.animalPercent} tone="orange" />
        </div>
        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50">
            <Image src="/listing/rating_icon.png" alt="" width={28} height={28} className="h-7 w-7 object-contain" />
          </div>
          <div>
            <p className="inline-flex items-center gap-1 font-saveful-bold text-2xl text-gray-900">
              {stats.rating ?? "—"}/5
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            </p>
            <p className="font-saveful text-xs text-gray-500">Collection rating · {stats.ratingCount} reviews</p>
          </div>
        </div>
      </section>

      <PortalPanel title="Impact over time" subtitle="Switch period and metric — same chart as restaurant multi-site insights">
        <div className="flex flex-wrap gap-2">
          {TIME_RANGES.map((item) => (
            <PortalChip key={item.key} active={range === item.key} onClick={() => setRange(item.key)}>
              {item.label}
            </PortalChip>
          ))}
        </div>
        <div className="mt-3 -mx-1 flex gap-2 overflow-x-auto pb-1">
          {METRICS.map((item) => (
            <PortalChip key={item.key} active={metric === item.key} onClick={() => setMetric(item.key)}>
              {item.label}
            </PortalChip>
          ))}
        </div>
        <div className="mt-4 h-[220px] sm:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="impactFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.green} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={CHART_COLORS.green} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEECE6" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={CHART_TOOLTIP}
                formatter={(value) => [`${value}${activeMetric.suffix ?? ""}`, activeMetric.label]}
              />
              <Area type="monotone" dataKey="value" name={activeMetric.label} stroke={CHART_COLORS.green} fill="url(#impactFill)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </PortalPanel>

      <SpecificFoodSavings key={`${siteId}-${periodName}`} foods={foods} />

      <PortalPanel title="Recipient organisations" subtitle={`Who collected surplus · ${periodName}`}>
        <div className="space-y-3">
          {recipients.map((row) => {
            const open = expandedRecipient === row.rank;
            return (
              <article key={row.rank} className="overflow-hidden rounded-2xl border border-gray-100 bg-[#FCFCFA]">
                <button type="button" onClick={() => setExpandedRecipient(open ? null : row.rank)} className="flex w-full items-start gap-3 p-4 text-left">
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", row.kind === "animals" ? "bg-orange-50" : "bg-saveful-green/10")}>
                    <Image src={row.kind === "animals" ? "/listing/cow_front.png" : "/listing/charity_green.png"} alt="" width={22} height={22} className="h-5 w-5 object-contain" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-saveful-bold text-sm text-gray-900">{row.name}</p>
                    <p className="mt-0.5 font-saveful text-xs text-gray-500">
                      {row.collections} collections · last {formatCollectionDate(row.lastCollectionAt)}
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div className={cn("h-full rounded-full", row.kind === "animals" ? "bg-saveful-orange" : "bg-saveful-green")} style={{ width: `${row.sharePercent}%` }} />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-saveful-bold text-sm tabular-nums text-gray-900">{formatKg(row.totalKg)}</p>
                    <p className="font-saveful text-xs text-gray-400">{row.sharePercent}%</p>
                  </div>
                  <ChevronDown className={cn("mt-1 h-4 w-4 text-gray-400 transition", open && "rotate-180")} />
                </button>
                {open ? (
                  <div className="border-t border-gray-100 px-4 pb-4 pt-3">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <MiniStat label="Meals" value={formatNumber(row.mealsCreated)} />
                      <MiniStat label="Collections" value={String(row.collections)} />
                      <MiniStat label="Share" value={`${row.sharePercent}%`} />
                    </div>
                    <div className="mt-3 space-y-1">
                      {row.foods.map((food) => (
                        <p key={food.name} className="font-saveful text-sm text-gray-600">
                          {food.name} · {formatKg(food.totalKg)}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </PortalPanel>
    </>,
    actions,
  );
}

function MetricCard({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E8F3EC]">
        <Image src={icon} alt="" width={28} height={28} className="h-7 w-7 object-contain" />
      </div>
      <div className="min-w-0">
        <p className="truncate font-saveful-bold text-xl tabular-nums text-saveful-green">{value}</p>
        <p className="font-saveful text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function SplitCard({
  title,
  icon,
  value,
  hint,
  percent,
  tone,
}: {
  title: string;
  icon: string;
  value: string;
  hint: string;
  percent: number;
  tone: "green" | "orange";
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className={cn("flex items-center gap-2 px-4 py-2.5", tone === "green" ? "bg-[#F0F8F3]" : "bg-[#FFF6EC]")}>
        <Image src={icon} alt="" width={22} height={22} className="h-5 w-5 object-contain" />
        <p className={cn("font-saveful-semibold text-sm", tone === "green" ? "text-saveful-green" : "text-saveful-orange")}>{title}</p>
      </div>
      <div className="p-4">
        <p className={cn("font-saveful-bold text-2xl tabular-nums", tone === "green" ? "text-saveful-green" : "text-saveful-orange")}>{value}</p>
        <p className="mt-1 font-saveful text-xs text-gray-500">{hint}</p>
        <div className="mt-3 flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
            <div className={cn("h-full rounded-full", tone === "green" ? "bg-saveful-green" : "bg-saveful-orange")} style={{ width: `${percent}%` }} />
          </div>
          <span className="font-saveful-semibold text-xs text-gray-500">{percent}%</span>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2">
      <p className="font-saveful text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-0.5 font-saveful-semibold text-sm text-gray-900">{value}</p>
    </div>
  );
}
