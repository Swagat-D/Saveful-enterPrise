"use client";

import { useEffect, useMemo, useState } from "react";
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
import { ArrowRight, Calendar, ChevronDown, ChevronUp, Download, Heart, Infinity as InfinityIcon, PawPrint } from "lucide-react";
import { LISTING_ICONS, ListingIcon } from "@/components/business/ListingIcon";
import { PortalPageShell } from "@/components/ui/Portal";
import { useBusinessSession } from "@/lib/businessAuth";
import { useEntitlements } from "@/lib/businessBilling";
import { getBusinessOrganisation } from "@/lib/businessApi";
import {
  EMPTY_IMPACT_STATS,
  buildChartSeries,
  canDownloadImpactReports,
  fetchAggregatedSiteImpact,
  fetchAggregatedSiteImpactByRange,
  fetchRecipientRows,
  filterLabel,
  foodKey,
  foodLabel,
  formatCollectionDate,
  getOrgTopFoods,
  getSiteTopFoods,
  hasAdvancedImpactAccess,
  isPresetActive,
  mapImpactToDisplayStats,
  parseSiteId,
  presetRange,
  rangeParamsFromFilter,
  resolveFoodSplit,
  siteIdsFromOrganisation,
  unwrapTopFoods,
  type ChartPeriod,
  type ChartMetricKey,
  type ImpactDisplayStats,
  type ImpactFilter,
  type RecipientRow,
  type SiteImpactResponse,
  type TopFoodItem,
} from "@/lib/businessImpact";
import { downloadImpactExcel, downloadImpactPdf } from "@/lib/businessImpactReport";
import { IMPACT } from "@/lib/impact";
import { CHART_COLORS, CHART_TOOLTIP } from "@/lib/demo";
import { cn } from "@/lib/utils";

const PRESET_DAYS = [7, 30, 90] as const;
const TIME_RANGES: { key: ChartPeriod; label: string }[] = [
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
];
const IMPACT_METRICS: { key: ChartMetricKey; label: string; suffix?: string }[] = [
  { key: "food", label: "Food", suffix: "kg" },
  { key: "meals", label: "Meals" },
  { key: "co2", label: "CO₂", suffix: "kg" },
  { key: "collections", label: "Collections" },
];

function formatNumber(value: number, digits?: number) {
  return value.toLocaleString("en-US", digits != null ? { maximumFractionDigits: digits } : undefined);
}

function formatRating(rating: number | null) {
  return rating != null ? `${rating}/5` : "—";
}

export function BusinessInsightsView() {
  const user = useBusinessSession();
  const { entitlements } = useEntitlements();
  const [sites, setSites] = useState<Array<{ id: number; name: string }>>([]);
  const [siteId, setSiteId] = useState<number | null>(null);
  const [filter, setFilter] = useState<ImpactFilter>({ mode: "all_time" });
  const [stats, setStats] = useState<ImpactDisplayStats>(EMPTY_IMPACT_STATS);
  const [chartImpact, setChartImpact] = useState<SiteImpactResponse | null>(null);
  const [range, setRange] = useState<ChartPeriod>("month");
  const [metric, setMetric] = useState<ChartMetricKey>("food");
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [sitesReady, setSitesReady] = useState(false);

  const advanced = hasAdvancedImpactAccess(entitlements);
  const showReport = canDownloadImpactReports(entitlements);
  const needsPlan = Boolean(entitlements?.billingRequired && !entitlements.entitled);
  const preferOrgScope = user?.orgType === "BUSINESS_MULTI" || user?.orgType === "FARMER_PRODUCER";
  const periodLabel = filterLabel(filter);
  const selectedSiteLabel =
    siteId == null
      ? sites.length > 1
        ? "All sites"
        : sites[0]?.name ?? null
      : sites.find((site) => site.id === siteId)?.name ?? `Site ${siteId}`;

  useEffect(() => {
    if (!user) return;
    setSitesReady(false);
    void getBusinessOrganisation()
      .then((payload) => {
        const rows = (payload.sites ?? [])
          .map((site) => {
            const id = parseSiteId(site.id);
            if (!id) return null;
            return { id, name: site.siteName || `Site ${id}` };
          })
          .filter((row): row is { id: number; name: string } => row != null);
        setSites(rows);
      })
      .catch(() => setSites([]))
      .finally(() => setSitesReady(true));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (filter.mode === "custom" && (!filter.startDate || !filter.endDate)) return;
    let cancelled = false;
    setLoading(true);

    const load = async () => {
      const orgSites = await getBusinessOrganisation().catch(() => ({ sites: [] as Array<{ id: number }> }));
      const ids = siteId != null ? [siteId] : siteIdsFromOrganisation(orgSites.sites, user);
      const options = { orgId: user.organisationId, preferOrgScope };
      const impact =
        filter.mode === "all_time"
          ? await fetchAggregatedSiteImpact(ids, "lifetime", options)
          : await fetchAggregatedSiteImpactByRange(
              ids,
              { startDate: filter.startDate!, endDate: filter.endDate! },
              options,
            );
      if (!cancelled) setStats(mapImpactToDisplayStats(impact));
    };

    void load()
      .catch(() => {
        if (!cancelled) setStats(EMPTY_IMPACT_STATS);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, siteId, filter, preferOrgScope]);

  useEffect(() => {
    if (!user || !sitesReady) return;
    let cancelled = false;
    setChartLoading(true);

    const load = async () => {
      const ids = siteId != null ? [siteId] : sites.map((site) => site.id);
      const chart = await fetchAggregatedSiteImpact(ids, range, {
        orgId: user.organisationId,
        preferOrgScope,
      });
      if (!cancelled) setChartImpact(chart);
    };

    void load()
      .catch(() => {
        if (!cancelled) setChartImpact(null);
      })
      .finally(() => {
        if (!cancelled) setChartLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, siteId, range, preferOrgScope, sites, sitesReady]);

  const series = useMemo(() => buildChartSeries(chartImpact, metric), [chartImpact, metric]);
  const partnersLabel = stats.mode === "RECEIVER" ? "Donors" : "Charities";
  const activeMetric = IMPACT_METRICS.find((item) => item.key === metric);
  const surplusHref = needsPlan ? "/business/plans" : "/business/listings/new";

  if (!user) return null;

  return (
    <PortalPageShell className="!space-y-3 sm:!space-y-3">
      <section className="overflow-hidden rounded-2xl border border-black/[0.05] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <header className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0">
            <p className="font-saveful text-xs text-gray-500">{user.organization || "Your business"}</p>
            <h1 className="font-saveful-bold text-xl leading-none text-gray-900 sm:text-2xl">Your insights</h1>
            <p className="mt-1.5 font-saveful text-xs text-gray-500">See the difference your surplus makes</p>
            <p className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#F0F8F3] px-2.5 py-1 font-saveful text-[11px] text-saveful-green">
              <ListingIcon src={LISTING_ICONS.leaf} className="h-3.5 w-3.5" />
              <span className="truncate">
                {selectedSiteLabel ? `${selectedSiteLabel} · ` : ""}
                {formatNumber(stats.mealsCreated)} meals · {formatNumber(stats.redistributedKg)} kg · {periodLabel}
              </span>
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Link
              href={surplusHref}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#E4E0D6] bg-white px-3.5 font-saveful-semibold text-sm text-gray-700"
            >
              Create new listing
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            {showReport ? (
              <ImpactReportDownload
                stats={stats}
                filter={filter}
                filterLabel={periodLabel}
                siteId={siteId}
                siteLabel={selectedSiteLabel}
                organisationName={user.organization}
                orgId={user.organisationId}
                isFarm={user.role === "farm_business"}
              />
            ) : null}
          </div>
        </header>

        <div className="space-y-3 p-4 sm:p-5">
          {sites.length > 1 ? (
            <label className="block">
              <span className="mb-1 block font-saveful text-[11px] uppercase tracking-wide text-gray-400">Site</span>
              <select
                value={siteId ?? ""}
                onChange={(event) => setSiteId(event.target.value ? Number(event.target.value) : null)}
                className="h-10 w-full rounded-xl border border-[#E4E0D6] bg-[#F7F6F2] px-3 font-saveful text-sm outline-none focus:border-saveful-green/40 focus:bg-white"
              >
                <option value="">All sites</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </label>
          ) : sites[0] ? (
            <p className="font-saveful text-sm text-gray-600">{sites[0].name}</p>
          ) : null}

          <DateFilter filter={filter} onChange={setFilter} />
        </div>
      </section>

      <section className="space-y-2.5">
        <h2 className="font-saveful-bold text-sm text-gray-900">
          {filter.mode === "all_time" ? "All-time impact" : `Impact · ${periodLabel}`}
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <MetricCard icon={LISTING_ICONS.items} value={loading ? "—" : `${formatNumber(stats.redistributedKg)} kg`} label="Redistributed" />
          <MetricCard icon={LISTING_ICONS.meals} value={loading ? "—" : formatNumber(stats.mealsCreated)} label="Meals created" />
          <MetricCard icon={LISTING_ICONS.impact} value={loading ? "—" : `${formatNumber(stats.co2AvoidedKg)} kg`} label="CO₂ avoided" />
          <MetricCard icon={LISTING_ICONS.money} value={loading ? "—" : `$${formatNumber(stats.foodSavedMoney)}`} label="Food saved" />
          <MetricCard icon={LISTING_ICONS.collections} value={loading ? "—" : formatNumber(stats.collectionsCompleted)} label="Collections" />
          <MetricCard icon={LISTING_ICONS.charities} value={loading ? "—" : formatNumber(stats.partnersSupported)} label={partnersLabel} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <SplitCard
            people
            kg={stats.peopleKg}
            percent={stats.peoplePercent}
            title="For people"
            subtitle="Food donated"
          />
          <SplitCard
            kg={stats.animalKg}
            percent={stats.animalPercent}
            title="For animals"
            subtitle="Feed provided"
          />
        </div>

        <div className="inline-flex items-center gap-2.5 rounded-xl border border-black/[0.05] bg-white px-3 py-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFF8E8]">
            <ListingIcon src={LISTING_ICONS.rating} className="h-5 w-5" />
          </span>
          <div>
            <p className="font-saveful-bold text-sm text-saveful-green">{formatRating(stats.rating)}</p>
            <p className="font-saveful text-[11px] text-gray-500">Collection rating</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-black/[0.05] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <h2 className="font-saveful-bold text-sm text-gray-900">Impact over time</h2>
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {TIME_RANGES.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setRange(item.key)}
              className={cn(
                "h-10 rounded-xl border font-saveful-bold text-sm",
                range === item.key
                  ? "border-saveful-green bg-saveful-green text-white"
                  : "border-[#E4E0D6] bg-white text-gray-600 hover:bg-[#F7F6F2]",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {IMPACT_METRICS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setMetric(item.key)}
              className={cn(
                "h-10 rounded-xl border font-saveful-bold text-sm",
                metric === item.key
                  ? "border-saveful-green bg-saveful-green text-white"
                  : "border-[#E4E0D6] bg-white text-gray-600 hover:bg-[#F7F6F2]",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="relative mt-3 h-52">
          {chartLoading ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-xl bg-white/80">
              <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#E8E2D6] border-t-saveful-green" />
              <p className="font-saveful text-xs text-gray-500">Loading chart…</p>
            </div>
          ) : null}
          {!chartLoading && series.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-xl bg-[#F7F6F2]/60">
              <p className="font-saveful text-sm text-gray-500">No impact data for this period yet.</p>
            </div>
          ) : (
            <div className={cn("h-full", chartLoading && "opacity-40")}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="businessImpactFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.green} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={CHART_COLORS.green} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#EFEDE6" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis
                tick={{ fontSize: 11, fill: "#94A3B8" }}
                axisLine={false}
                tickLine={false}
                width={48}
                unit={activeMetric?.suffix ? ` ${activeMetric.suffix}` : undefined}
              />
              <Tooltip
                contentStyle={CHART_TOOLTIP}
                formatter={(value) => [Number(value ?? 0), activeMetric?.label ?? "Value"]}
              />
              <Area type="monotone" dataKey="value" stroke={CHART_COLORS.green} fill="url(#businessImpactFill)" strokeWidth={2.25} />
            </AreaChart>
          </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      {advanced ? (
        <>
          <SpecificFoodSavings
            filter={filter}
            siteId={siteId}
            orgId={user.organisationId}
            peoplePercent={stats.peoplePercent}
            animalPercent={stats.animalPercent}
          />
          <DonationRecipients
            filter={filter}
            filterLabel={periodLabel}
            siteId={siteId}
            orgId={user.organisationId}
            mode={stats.mode}
          />
        </>
      ) : (
        <p className="rounded-xl border border-black/[0.05] bg-white px-4 py-3 font-saveful text-sm text-gray-500">
          Specific food savings, recipients and report downloads are on Plus, Multi-site and Enterprise plans.
        </p>
      )}

      <p className="font-saveful text-[11px] text-gray-400">
        About our calculations · 1 meal = {IMPACT.MEAL_WEIGHT_KG} kg · CO₂ avoided = {IMPACT.CO2_PER_KG} kg per kg
        recovered · food value = ${IMPACT.FOOD_VALUE_PER_KG} per kg.
      </p>
    </PortalPageShell>
  );
}

function DateFilter({
  filter,
  onChange,
}: {
  filter: ImpactFilter;
  onChange: (next: ImpactFilter) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="font-saveful-bold text-sm text-gray-900">Select time period</p>
        <button
          type="button"
          onClick={() => onChange({ mode: "all_time" })}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 font-saveful-bold text-xs",
            filter.mode === "all_time"
              ? "border-saveful-green bg-saveful-green text-white"
              : "border-saveful-green bg-[#F7F6F2] text-saveful-green",
          )}
        >
          <InfinityIcon className="h-3.5 w-3.5" />
          All time
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {PRESET_DAYS.map((days) => {
          const active = isPresetActive(filter, days);
          return (
            <button
              key={days}
              type="button"
              onClick={() => onChange({ mode: "custom", ...presetRange(days) })}
              className={cn(
                "h-9 rounded-xl border font-saveful-semibold text-xs",
                active
                  ? "border-saveful-green bg-saveful-green text-white"
                  : "border-saveful-green/25 bg-white text-saveful-green hover:bg-[#F0F8F3]",
              )}
            >
              Last {days} days
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <DateField
          label="From"
          value={filter.mode === "custom" ? filter.startDate : ""}
          active={filter.mode === "custom"}
          onChange={(startDate) => {
            const endDate = filter.endDate && filter.endDate < startDate ? startDate : filter.endDate || toToday();
            onChange({ mode: "custom", startDate, endDate });
          }}
        />
        <DateField
          label="To"
          value={filter.mode === "custom" ? filter.endDate : ""}
          active={filter.mode === "custom"}
          onChange={(endDate) => {
            const startDate = !filter.startDate || filter.startDate > endDate ? endDate : filter.startDate;
            onChange({ mode: "custom", startDate, endDate });
          }}
        />
      </div>
    </div>
  );
}

function toToday() {
  return presetRange(1).endDate;
}

function DateField({
  label,
  value,
  active,
  onChange,
}: {
  label: string;
  value?: string;
  active?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label
      className={cn(
        "rounded-xl border px-3 py-2",
        active ? "border-saveful-green bg-[#F7FAF7]" : "border-saveful-green/25 bg-white",
      )}
    >
      <span className="block font-saveful-semibold text-[10px] uppercase tracking-wide text-gray-400">{label}</span>
      <span className="mt-0.5 flex items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5 text-saveful-green" />
        <input
          type="date"
          value={value || ""}
          max={toToday()}
          onChange={(event) => event.target.value && onChange(event.target.value)}
          className="w-full bg-transparent font-saveful-bold text-xs text-gray-900 outline-none"
        />
      </span>
    </label>
  );
}

function MetricCard({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="flex min-h-[64px] items-center gap-2.5 rounded-xl border border-black/[0.05] bg-white px-3 py-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E8F3EC]">
        <ListingIcon src={icon} className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate font-saveful-bold text-sm text-saveful-green">{value}</p>
        <p className="font-saveful text-[11px] leading-tight text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function SplitCard({
  people,
  kg,
  percent,
  title,
  subtitle,
}: {
  people?: boolean;
  kg: number;
  percent: number;
  title: string;
  subtitle: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-xl border bg-white", people ? "border-[#C8E0D2]" : "border-[#FDDBB0]")}>
      <div className={cn("flex items-center gap-1.5 px-3 py-1.5", people ? "bg-[#F0F8F3]" : "bg-[#FFF6EC]")}>
        <ListingIcon src={people ? LISTING_ICONS.people : LISTING_ICONS.animals} className="h-4 w-4" />
        <p className={cn("font-saveful-semibold text-xs", people ? "text-saveful-green" : "text-orange-600")}>{title}</p>
      </div>
      <div className="space-y-1 px-3 pb-2.5 pt-1.5">
        <div className="flex items-center gap-1.5">
          <ListingIcon src={people ? LISTING_ICONS.boxed : LISTING_ICONS.boxedOrange} className="h-4 w-4" />
          <p className={cn("font-saveful-bold text-sm", people ? "text-saveful-green" : "text-orange-600")}>
            {formatNumber(kg)} kg
          </p>
        </div>
        <p className="font-saveful text-[11px] text-gray-500">{subtitle}</p>
        <div className="flex items-center gap-2">
          <div className={cn("h-1.5 flex-1 overflow-hidden rounded-full", people ? "bg-[#D8E8DC]" : "bg-[#F8DEC8]")}>
            <div
              className={cn("h-full rounded-full", people ? "bg-saveful-green" : "bg-[#F7931E]")}
              style={{ width: `${Math.min(100, percent)}%` }}
            />
          </div>
          <span className="w-8 text-right font-saveful text-[11px] text-gray-500">{percent}%</span>
        </div>
      </div>
    </div>
  );
}

function SpecificFoodSavings({
  filter,
  siteId,
  orgId,
  peoplePercent,
  animalPercent,
}: {
  filter: ImpactFilter;
  siteId: number | null;
  orgId: number;
  peoplePercent: number;
  animalPercent: number;
}) {
  const [foods, setFoods] = useState<TopFoodItem[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const range = rangeParamsFromFilter(filter);
    const load =
      siteId != null ? getSiteTopFoods(siteId, range) : getOrgTopFoods(orgId, range);
    void load
      .then((payload) => {
        if (cancelled) return;
        const next = unwrapTopFoods(payload).slice(0, 5);
        setFoods(next);
        setSelectedKey((prev) => (prev && next.some((food) => foodKey(food) === prev) ? prev : next[0] ? foodKey(next[0]) : null));
      })
      .catch(() => {
        if (cancelled) return;
        setFoods([]);
        setSelectedKey(null);
        setError("Failed to load top foods");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filter, siteId, orgId]);

  const selected = foods.find((food) => foodKey(food) === selectedKey) ?? foods[0] ?? null;
  const split = resolveFoodSplit(selected, peoplePercent, animalPercent);
  const foodsTotalKg = foods.reduce((sum, food) => sum + (Number(food.totalKg) || 0), 0);
  const displayTotalKg = selected?.totalKg ?? 0;
  const displayCo2Kg = selected?.co2AvoidedKg != null ? Number(selected.co2AvoidedKg) : Math.round(displayTotalKg * 2.1 * 100) / 100;
  const showPeopleSplit = split.peoplePercent > 0 || split.animalPercent === 0;
  const showAnimalSplit = split.animalPercent > 0;
  const showBothSplits = showPeopleSplit && showAnimalSplit;

  return (
    <section className="space-y-2">
      <div>
        <h2 className="font-saveful-bold text-sm text-gray-900">Specific Food Savings</h2>
        <p className="mt-0.5 font-saveful-semibold text-xs text-gray-500">
          Breakdown of Food Recovered — these amounts add up to the total, they are not extra.
        </p>
        {foods.length > 0 ? (
          <p className="mt-1 font-saveful-bold text-xs text-saveful-green">
            Listed foods total {formatNumber(foodsTotalKg, 2)} kg
          </p>
        ) : null}
      </div>

      <div className="relative">
        <button
          type="button"
          disabled={foods.length === 0}
          onClick={() => setOpen((current) => !current)}
          className="flex h-11 w-full items-center gap-2 rounded-xl border border-black/[0.05] bg-white px-3 text-left"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-saveful-green text-white">
            <ListingIcon src={LISTING_ICONS.leaf} className="h-3.5 w-3.5 brightness-0 invert" />
          </span>
          <span className="min-w-0 flex-1 truncate font-saveful-semibold text-sm text-gray-800">
            {selected ? foodLabel(selected) : loading ? "Loading…" : "No foods yet"}
          </span>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </button>
        {open ? (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-black/[0.06] bg-white shadow-lg">
            <p className="px-3 pt-2.5 font-saveful-bold text-sm text-gray-900">Top foods</p>
            <p className="px-3 pb-1.5 font-saveful text-[11px] text-gray-500">
              Parts of your {formatNumber(foodsTotalKg, 2)} kg recovered — not additional kg
            </p>
            {foods.map((food) => {
              const key = foodKey(food);
              const active = key === selectedKey;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setSelectedKey(key);
                    setOpen(false);
                  }}
                  className={cn("flex w-full items-center gap-2 px-3 py-2 text-left", active && "bg-[#F0F8F3]")}
                >
                  <span className="min-w-0 flex-1">
                    <p className="truncate font-saveful-semibold text-sm text-gray-800">{foodLabel(food)}</p>
                    <p className="font-saveful text-[11px] text-gray-500">
                      {food.category ? `${food.category} · ` : ""}
                      {formatNumber(food.totalKg, 2)} kg
                    </p>
                  </span>
                </button>
              );
            })}
            <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2">
              <span className="font-saveful text-xs text-gray-500">Total</span>
              <span className="font-saveful-bold text-xs text-gray-900">{formatNumber(foodsTotalKg, 2)} kg</span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-black/[0.05] bg-white p-3">
        {error && !selected ? <p className="mb-2 font-saveful text-xs text-red-600">{error}</p> : null}
        <p className="mb-2 font-saveful text-[11px] text-gray-500">
          Stats below are for the selected food only{selected ? ` (${foodLabel(selected)})` : ""}.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <MetricCard icon={LISTING_ICONS.items} value={`${formatNumber(displayTotalKg, 2)} kg`} label="This food" />
          <MetricCard icon={LISTING_ICONS.impact} value={`${formatNumber(displayCo2Kg, 2)} kg`} label="CO₂ avoided" />
        </div>
        {showPeopleSplit || showAnimalSplit ? (
          <div className={cn("mt-2 grid gap-2", showBothSplits ? "grid-cols-2" : "grid-cols-1")}>
            {showPeopleSplit ? (
              <SplitCard
                people
                kg={split.peopleKg}
                percent={split.peoplePercent}
                title="For people"
                subtitle={showBothSplits ? "Share of this food" : "All of this food"}
              />
            ) : null}
            {showAnimalSplit ? (
              <SplitCard
                kg={split.animalKg}
                percent={split.animalPercent}
                title="For animals"
                subtitle={showBothSplits ? "Share of this food" : "All of this food"}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function DonationRecipients({
  filter,
  filterLabel: period,
  siteId,
  orgId,
  mode,
}: {
  filter: ImpactFilter;
  filterLabel?: string;
  siteId: number | null;
  orgId: number;
  mode: "DONOR" | "RECEIVER";
}) {
  const [rows, setRows] = useState<RecipientRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const isReceiver = mode === "RECEIVER";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setShowAll(false);
    setExpandedKey(null);
    void fetchRecipientRows({ filter, siteId, orgId })
      .then((next) => {
        if (!cancelled) setRows(next);
      })
      .catch((err) => {
        if (cancelled) return;
        setRows([]);
        setError(err instanceof Error ? err.message : "Failed to load partner organisations");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filter, siteId, orgId]);

  const totals = {
    kg: rows.reduce((sum, row) => sum + row.totalKg, 0),
    collections: rows.reduce((sum, row) => sum + row.collections, 0),
  };
  const visible = showAll ? rows : rows.slice(0, 5);

  return (
    <section className="space-y-2">
      <div>
        <h2 className="font-saveful-bold text-sm text-gray-900">{isReceiver ? "Collected from" : "Donated to"}</h2>
        <p className="mt-0.5 font-saveful-semibold text-xs text-gray-500">
          {isReceiver ? "Businesses you collected from" : "Charities and farms that collected your food"}
          {period ? ` · ${period}` : ""}
        </p>
        {rows.length > 0 ? (
          <p className="mt-1 font-saveful-bold text-xs text-saveful-green">
            {formatNumber(rows.length)} {rows.length === 1 ? "partner" : "partners"} · {formatNumber(Math.round(totals.kg * 100) / 100)} kg
            across {totals.collections} {totals.collections === 1 ? "collection" : "collections"}
          </p>
        ) : null}
      </div>

      {loading && rows.length === 0 ? (
        <div className="rounded-2xl border border-black/[0.05] bg-white px-4 py-8 text-center">
          <p className="font-saveful text-sm text-gray-400">Loading…</p>
        </div>
      ) : null}

      {!loading && rows.length === 0 ? (
        <div className="rounded-2xl border border-black/[0.05] bg-white px-4 py-8 text-center">
          <p className="font-saveful text-sm text-gray-500">
            {error ||
              (isReceiver
                ? "No collections in this period yet."
                : "No completed collections in this period yet. Once a partner collects your food, they will appear here.")}
          </p>
        </div>
      ) : null}

      <div className="space-y-2">
        {visible.map((row) => {
          const expanded = expandedKey === row.key;
          const last = formatCollectionDate(row.lastCollectionAt);
          return (
            <article key={row.key} className="overflow-hidden rounded-xl border border-black/[0.05] bg-white">
              <button
                type="button"
                onClick={() => setExpandedKey(expanded ? null : row.key)}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left"
              >
                {row.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={row.logoUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F0F8F3] text-saveful-green">
                    {row.kind === "animals" ? <PawPrint className="h-4 w-4 text-orange-600" /> : <Heart className="h-4 w-4" />}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-saveful-semibold text-sm text-gray-900">{row.name}</p>
                  <p className="truncate font-saveful text-[11px] text-gray-500">
                    {row.collections} {row.collections === 1 ? "collection" : "collections"}
                    {last ? ` · last ${last}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-saveful-bold text-sm text-gray-900">{formatNumber(row.totalKg, 2)} kg</p>
                  {row.sharePercent > 0 ? <p className="font-saveful text-[11px] text-gray-400">{row.sharePercent}%</p> : null}
                </div>
                {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
              </button>
              {row.sharePercent > 0 ? (
                <div className="mx-3 mb-2 h-1.5 overflow-hidden rounded-full bg-[#F0EEE8]">
                  <div
                    className={cn("h-full rounded-full", row.kind === "animals" ? "bg-[#F7931E]" : "bg-saveful-green")}
                    style={{ width: `${Math.max(2, Math.min(100, row.sharePercent))}%` }}
                  />
                </div>
              ) : null}
              {expanded ? (
                <div className="border-t border-gray-100 px-3 py-2.5">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="font-saveful-bold text-sm text-gray-900">{formatNumber(row.mealsCreated)}</p>
                      <p className="font-saveful text-[11px] text-gray-500">Meals</p>
                    </div>
                    <div>
                      <p className="font-saveful-bold text-sm text-gray-900">{formatNumber(row.co2AvoidedKg, 2)} kg</p>
                      <p className="font-saveful text-[11px] text-gray-500">CO₂ avoided</p>
                    </div>
                    <div>
                      <p className="font-saveful-bold text-sm text-gray-900">{formatNumber(row.collections)}</p>
                      <p className="font-saveful text-[11px] text-gray-500">Times</p>
                    </div>
                  </div>
                  <p className="mt-2 font-saveful-semibold text-xs text-gray-700">Food types</p>
                  {row.foods.length ? (
                    <ul className="mt-1 space-y-1">
                      {row.foods.slice(0, 6).map((food) => (
                        <li key={`${row.key}:${food.name}`} className="flex items-center justify-between gap-2">
                          <span className="truncate font-saveful text-xs text-gray-600">
                            {food.name}
                            {food.category ? ` · ${food.category}` : ""}
                          </span>
                          <span className="font-saveful-semibold text-xs text-gray-800">{formatNumber(food.totalKg, 2)} kg</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 font-saveful text-xs text-gray-400">
                      No food-type breakdown recorded for these collections.
                    </p>
                  )}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {rows.length > 5 ? (
        <button
          type="button"
          onClick={() => setShowAll((current) => !current)}
          className="inline-flex items-center gap-1 font-saveful-semibold text-xs text-saveful-green"
        >
          {showAll ? "Show less" : `Show all ${formatNumber(rows.length)} partners`}
          {showAll ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      ) : null}
    </section>
  );
}

function ImpactReportDownload({
  stats,
  filter,
  filterLabel: period,
  siteId,
  siteLabel,
  organisationName,
  orgId,
  isFarm,
}: {
  stats: ImpactDisplayStats;
  filter: ImpactFilter;
  filterLabel: string;
  siteId: number | null;
  siteLabel: string | null;
  organisationName: string;
  orgId: number;
  isFarm?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const reportProps = {
    stats,
    filter,
    filterLabel: period,
    siteId,
    siteLabel,
    organisationName,
    isFarm,
  };

  const exportReport = async (format: "pdf" | "excel") => {
    setExporting(true);
    setOpen(false);
    try {
      if (format === "pdf") {
        await downloadImpactPdf(reportProps, orgId);
      } else {
        await downloadImpactExcel(reportProps, orgId);
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        disabled={exporting}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-saveful-green px-3.5 font-saveful-semibold text-sm text-white disabled:opacity-50"
      >
        <Download className="h-3.5 w-3.5" />
        {exporting ? "Preparing…" : "Download report"}
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-1 w-72 overflow-hidden rounded-xl border border-black/[0.06] bg-white py-1 shadow-lg">
          <button
            type="button"
            onClick={() => void exportReport("pdf")}
            className="flex w-full flex-col px-3 py-2.5 text-left hover:bg-[#F7F6F2]"
          >
            <span className="font-saveful-bold text-sm text-gray-900">PDF report</span>
            <span className="font-saveful text-[11px] text-gray-500">
              Formatted summary with partner and per-food-item tables.
            </span>
          </button>
          <button
            type="button"
            onClick={() => void exportReport("excel")}
            className="flex w-full flex-col px-3 py-2.5 text-left hover:bg-[#F7F6F2]"
          >
            <span className="font-saveful-bold text-sm text-gray-900">Excel spreadsheet</span>
            <span className="font-saveful text-[11px] text-gray-500">
              Impact, partner and food item sheets you can analyse further.
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
