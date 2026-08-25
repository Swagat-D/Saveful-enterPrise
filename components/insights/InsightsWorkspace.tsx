"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { FileText, Leaf } from "lucide-react";
import { MoreFilters } from "@/components/network/FilterBar";
import { NetworkPerformance } from "@/components/insights/NetworkPerformance";
import { PortalPageShell } from "@/components/ui/Portal";
import { PortalShell } from "@/components/layout/PortalShell";
import { useSession } from "@/lib/auth";
import { roleHas } from "@/lib/permissions";
import { periodLabel } from "@/lib/dates";
import { CHART_COLORS, CHART_TOOLTIP } from "@/lib/demo";
import { formatCount, formatKg, formatMoney, IMPACT } from "@/lib/impact";
import {
  EMPTY_INSIGHTS_FILTERS,
  INSIGHTS_METRICS,
  INSIGHTS_PATHWAYS,
  buildInsightsModel,
  hasActiveInsightsFilters,
  insightsFiltersToQuery,
  parseInsightsFilters,
  type InsightsFilters,
  type InsightsFood,
  type InsightsMetric,
  type InsightsModel,
  type InsightsOrganisation,
  type InsightsTab,
  type PerformanceView,
} from "@/lib/insights";
import { buildNetworkPerformanceModel } from "@/lib/networkPerformance";
import { filterOptions, PATHWAY_COLORS, PATHWAY_LABEL } from "@/lib/networkQuery";
import { demoNetworkSites } from "@/lib/network";
import { useOrgStructureVersion } from "@/lib/orgStructure";
import { scopeFromUser } from "@/lib/scope";
import type { PeriodKey } from "@/types/enterprise";
import { cn } from "@/lib/utils";

const selectClass =
  "h-9 w-full appearance-none rounded-lg border border-black/[0.06] bg-[#F7F6F2] px-2.5 pr-8 font-saveful text-sm text-gray-800 outline-none focus:border-saveful-green/40";

const PERIODS: { id: PeriodKey; label: string }[] = [
  { id: "7", label: "7 days" },
  { id: "30", label: "30 days" },
  { id: "90", label: "90 days" },
  { id: "all", label: "All time" },
];

export function InsightsWorkspace() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const user = useSession();
  const scope = scopeFromUser(user);
  const structureVersion = useOrgStructureVersion();
  const filters = useMemo(() => parseInsightsFilters(searchParams), [searchParams]);
  const options = useMemo(() => filterOptions(demoNetworkSites, scope, filters), [scope, filters, structureVersion]);
  const model = useMemo(() => buildInsightsModel(filters, scope), [filters, scope, structureVersion]);
  const networkModel = useMemo(
    () => buildNetworkPerformanceModel(filters, scope),
    [filters, scope, structureVersion],
  );

  const setFilters = (next: InsightsFilters) => {
    router.replace(`${pathname}${insightsFiltersToQuery(next)}`, { scroll: false });
  };
  const update = (patch: Partial<InsightsFilters>) => setFilters({ ...filters, ...patch });
  const setTab = (tab: InsightsTab) => setFilters({ ...filters, tab });

  const filterCount = [
    filters.period !== "30",
    filters.groupId !== "all",
    filters.territoryId !== "all",
    filters.clusterId !== "all",
    filters.siteId !== "all",
    filters.tab === "impact" && filters.pathway !== "all",
  ].filter(Boolean).length;

  return (
    <PortalShell>
      <PortalPageShell className="!space-y-3 sm:!space-y-3">
        <nav className="font-saveful text-xs text-gray-500">
          <span className="text-gray-700">Insights & Reports</span>
        </nav>

        <section className="overflow-hidden rounded-2xl border border-black/[0.05] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <header className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="min-w-0">
              <h1 className="font-saveful-bold text-xl leading-none text-gray-900 sm:text-2xl">Insights & Reports</h1>
              <p className="mt-1.5 font-saveful text-xs text-gray-500">
                {filters.tab === "network"
                  ? "Understand participation and activity across your Enterprise network."
                  : "Understand your organisation’s food recovery, impact and performance."}
              </p>
            </div>
            {filters.tab === "impact" && roleHas(user, "createReports") ? (
              <Link
                href={`/insights/reports/new${insightsFiltersToQuery(filters)}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-black/[0.06] px-3 font-saveful-semibold text-sm text-gray-800 hover:bg-[#F7F6F2]"
              >
                <FileText className="h-3.5 w-3.5" />
                Create report
              </Link>
            ) : null}
          </header>

          <div className="flex gap-5 overflow-x-auto border-b border-gray-100 px-4 sm:px-5">
            {(
              [
                ["impact", "Impact & Insights"],
                ["network", "Network Performance"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "-mb-px border-b-2 py-2.5 font-saveful-semibold text-sm whitespace-nowrap",
                  filters.tab === id
                    ? "border-saveful-green text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-800",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-4 p-4 sm:p-5">
            <WorkspaceSection
              title="Filters"
              hint="Every figure uses these filters and your authorised scope"
              action={
                hasActiveInsightsFilters(filters) ? (
                  <button
                    type="button"
                    onClick={() => setFilters({ ...EMPTY_INSIGHTS_FILTERS, tab: filters.tab, viewBy: filters.viewBy })}
                    className="font-saveful-semibold text-xs text-saveful-green hover:underline"
                  >
                    Clear filters
                  </button>
                ) : null
              }
            >
              <div className="space-y-3 p-3.5">
                <div className="lg:hidden">
                  <MoreFilters
                    count={filterCount}
                    summary={`${periodLabel(filters.period)}${filterCount ? ` · ${filterCount} filters` : ""}`}
                    title={filters.tab === "network" ? "Filter network performance" : "Filter insights"}
                    subtitle="All figures on this tab use the same filters."
                    onReset={() => setFilters({ ...EMPTY_INSIGHTS_FILTERS, tab: filters.tab, viewBy: filters.viewBy })}
                  >
                    <div className="grid grid-cols-1 gap-3">
                      <FilterSelect label="Period" value={filters.period} onChange={(period) => update({ period: period as PeriodKey })} options={PERIODS} />
                      <FilterSelect label="Group" value={filters.groupId} onChange={(groupId) => update({ groupId })} options={[{ id: "all", name: "All" }, ...options.groups]} />
                      <FilterSelect label="Territory" value={filters.territoryId} onChange={(territoryId) => update({ territoryId })} options={[{ id: "all", name: "All" }, ...options.territories]} />
                      <FilterSelect label="Cluster" value={filters.clusterId} onChange={(clusterId) => update({ clusterId })} options={[{ id: "all", name: "All" }, ...options.clusters]} />
                      <FilterSelect label="Site" value={filters.siteId} onChange={(siteId) => update({ siteId })} options={[{ id: "all", name: "All" }, ...options.sites]} />
                      {filters.tab === "impact" ? (
                        <FilterSelect label="Pathway" value={filters.pathway} onChange={(pathway) => update({ pathway: pathway as InsightsFilters["pathway"] })} options={[{ id: "all", name: "All" }, ...INSIGHTS_PATHWAYS.map((item) => ({ id: item.id, name: item.label }))]} />
                      ) : null}
                    </div>
                  </MoreFilters>
                </div>
                <div className={cn("hidden gap-2 lg:grid", filters.tab === "impact" ? "grid-cols-2 xl:grid-cols-3" : "grid-cols-2 xl:grid-cols-5")}>
                  <FilterSelect value={filters.period} onChange={(period) => update({ period: period as PeriodKey })} options={PERIODS.map((item) => ({ id: item.id, name: `Period: ${item.label}` }))} />
                  <FilterSelect value={filters.groupId} onChange={(groupId) => update({ groupId })} options={[{ id: "all", name: "Group: All" }, ...options.groups.map((item) => ({ id: item.id, name: `Group: ${item.name}` }))]} />
                  <FilterSelect value={filters.territoryId} onChange={(territoryId) => update({ territoryId })} options={[{ id: "all", name: "Territory: All" }, ...options.territories.map((item) => ({ id: item.id, name: `Territory: ${item.name}` }))]} />
                  <FilterSelect value={filters.clusterId} onChange={(clusterId) => update({ clusterId })} options={[{ id: "all", name: "Cluster: All" }, ...options.clusters.map((item) => ({ id: item.id, name: `Cluster: ${item.name}` }))]} />
                  <FilterSelect value={filters.siteId} onChange={(siteId) => update({ siteId })} options={[{ id: "all", name: "Site: All" }, ...options.sites.map((item) => ({ id: item.id, name: `Site: ${item.name}` }))]} />
                  {filters.tab === "impact" ? (
                    <FilterSelect value={filters.pathway} onChange={(pathway) => update({ pathway: pathway as InsightsFilters["pathway"] })} options={[{ id: "all", name: "Pathway: All" }, ...INSIGHTS_PATHWAYS.map((item) => ({ id: item.id, name: `Pathway: ${item.label}` }))]} />
                  ) : null}
                </div>
              </div>
            </WorkspaceSection>

            {filters.tab === "network" ? (
              <NetworkPerformance
                filters={filters}
                model={networkModel}
                onViewBy={(viewBy: PerformanceView) => update({ viewBy })}
              />
            ) : (
              <InsightsPanels model={model} filters={filters} onUpdate={update} />
            )}
          </div>
        </section>
      </PortalPageShell>
    </PortalShell>
  );
}

export function InsightsPanels({
  model,
  filters,
  onUpdate,
  compact,
}: {
  model: InsightsModel;
  filters: InsightsFilters;
  onUpdate: (patch: Partial<InsightsFilters>) => void;
  compact?: boolean;
}) {
  const [showAllFoods, setShowAllFoods] = useState(false);
  const [showAllOrgs, setShowAllOrgs] = useState(false);
  const foods = showAllFoods ? model.foods : model.foods.slice(0, 5);
  const orgs = showAllOrgs ? model.organisations : model.organisations.slice(0, 5);

  return (
    <div className="space-y-4">
      {(model.selectedFood || model.selectedOrg || filters.pathway !== "all") && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-saveful-green/20 bg-saveful-green/[0.04] px-3.5 py-2.5">
          <p className="font-saveful text-xs text-gray-600">
            Showing
            {filters.pathway !== "all" ? ` ${PATHWAY_LABEL[filters.pathway]}` : ""}
            {model.selectedFood ? ` · ${model.selectedFood.name}` : ""}
            {model.selectedOrg ? ` · ${model.selectedOrg.name}` : ""}
          </p>
          <button
            type="button"
            onClick={() => onUpdate({ pathway: "all", foodId: "all", recipientId: "all" })}
            className="font-saveful-semibold text-xs text-saveful-green hover:underline"
          >
            Clear drill-down
          </button>
        </div>
      )}

      <WorkspaceSection title="Impact" hint={model.periodLabel}>
        <div className="grid grid-cols-2 gap-px bg-gray-100 sm:grid-cols-3 xl:grid-cols-6">
          <MetricCell label="Food recovered" value={formatKg(model.impact.foodKg)} />
          <MetricCell label="Meals created" value={formatCount(model.impact.mealsCreated)} />
          <MetricCell label="CO₂ avoided" value={formatKg(model.impact.co2AvoidedKg)} />
          <MetricCell label="Estimated food value" value={formatMoney(model.impact.foodValue)} />
          <MetricCell label="Completed collections" value={formatCount(model.impact.collectionsCompleted)} />
          <MetricCell label="Organisations supported" value={formatCount(model.impact.organisationsSupported)} />
        </div>
      </WorkspaceSection>

      <div className={cn("grid gap-4", compact ? "lg:grid-cols-1" : "xl:grid-cols-3")}>
        <WorkspaceSection
          title="Recovery pathways"
          hint={filters.pathway === "all" ? "Click a pathway to filter" : PATHWAY_LABEL[filters.pathway]}
          action={
            filters.pathway !== "all" ? (
              <button
                type="button"
                onClick={() => onUpdate({ pathway: "all" })}
                className="font-saveful-semibold text-xs text-saveful-green hover:underline"
              >
                Show all
              </button>
            ) : null
          }
        >
          <PathwayChart
            model={model}
            selected={filters.pathway}
            onSelect={(pathway) =>
              onUpdate({ pathway: pathway === "all" || filters.pathway === pathway ? "all" : pathway })
            }
          />
        </WorkspaceSection>

        <WorkspaceSection
          title="Impact over time"
          action={
            <select
              value={filters.metric}
              onChange={(event) => onUpdate({ metric: event.target.value as InsightsMetric })}
              className="h-8 max-w-[11rem] rounded-lg border border-black/[0.06] bg-white px-2 font-saveful text-xs outline-none"
            >
              {INSIGHTS_METRICS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          }
        >
          <div className="h-56 px-2 pb-3 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={model.series} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="#EFEDE6" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={48} tickFormatter={(value) => formatSeriesTick(Number(value), filters.metric)} />
                <Tooltip
                  contentStyle={CHART_TOOLTIP}
                  formatter={(value) => [formatSeriesValue(Number(value), filters.metric), model.metric.label]}
                />
                <Line type="monotone" dataKey="value" stroke={CHART_COLORS.green} strokeWidth={2.25} dot={{ r: 3, fill: CHART_COLORS.green }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </WorkspaceSection>

        <WorkspaceSection title="Food insights" hint="Most recovered food">
          <FoodTable
            rows={foods}
            selectedId={filters.foodId}
            onSelect={(foodId) => onUpdate({ foodId: filters.foodId === foodId ? "all" : foodId })}
            hasMore={model.foods.length > 5}
            expanded={showAllFoods}
            onToggle={() => setShowAllFoods((value) => !value)}
          />
        </WorkspaceSection>
      </div>

      <WorkspaceSection title="Organisations supported" hint="Who received recovered food and resources">
        <OrgTable
          rows={orgs}
          selectedId={filters.recipientId}
          onSelect={(recipientId) => onUpdate({ recipientId: filters.recipientId === recipientId ? "all" : recipientId })}
          hasMore={model.organisations.length > 5}
          expanded={showAllOrgs}
          onToggle={() => setShowAllOrgs((value) => !value)}
        />
      </WorkspaceSection>

      <p className="px-1 font-saveful text-[11px] leading-relaxed text-gray-400">
        Impact uses Saveful conversion factors: 1 meal = {IMPACT.MEAL_WEIGHT_KG} kg; CO₂ avoided = {IMPACT.CO2_PER_KG} kg
        per kg food; estimated value = ${IMPACT.FOOD_VALUE_PER_KG} per kg. Dashboard, Insights and generated reports use
        the same recovery data and methodology.
      </p>
    </div>
  );
}

function PathwayChart({
  model,
  selected,
  onSelect,
}: {
  model: InsightsModel;
  selected: InsightsFilters["pathway"];
  onSelect: (pathway: InsightsFilters["pathway"]) => void;
}) {
  const data = model.allPathways.filter((item) => item.kg > 0);
  return (
    <div className="px-3.5 pb-3.5 pt-2">
      {data.length ? (
        <>
          <div className="mx-auto h-40 w-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="kg"
                  nameKey="label"
                  innerRadius={42}
                  outerRadius={64}
                  paddingAngle={2}
                  onClick={(_, index) => {
                    const item = data[index];
                    if (item) onSelect(item.pathway);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {data.map((item) => (
                    <Cell
                      key={item.pathway}
                      fill={PATHWAY_COLORS[item.pathway]}
                      opacity={selected === "all" || selected === item.pathway ? 1 : 0.35}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={CHART_TOOLTIP} formatter={(value, _name, item) => [formatKg(Number(value)), item.payload.label]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-2">
            <li>
              <button
                type="button"
                onClick={() => onSelect("all")}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-lg px-1 py-1 text-left hover:bg-[#FAF7F0]",
                  selected === "all" && "bg-saveful-green/[0.06]",
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-gray-400" />
                  <span className="truncate font-saveful text-sm text-gray-700">All pathways</span>
                </span>
                <span className="shrink-0 font-saveful text-xs tabular-nums text-gray-500">
                  {formatKg(model.allPathways.reduce((sum, item) => sum + item.kg, 0))}
                </span>
              </button>
            </li>
            {model.allPathways.map((item) => (
              <li key={item.pathway}>
                <button
                  type="button"
                  onClick={() => onSelect(item.pathway)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-lg px-1 py-1 text-left hover:bg-[#FAF7F0]",
                    selected === item.pathway && "bg-saveful-green/[0.06]",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: PATHWAY_COLORS[item.pathway] }} />
                    <span className="truncate font-saveful text-sm text-gray-700">{item.label}</span>
                  </span>
                  <span className="shrink-0 font-saveful text-xs tabular-nums text-gray-500">
                    {formatKg(item.kg)} · {item.percent}%
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="font-saveful text-sm text-gray-500">No recovery in this period.</p>
      )}
    </div>
  );
}

function FoodTable({
  rows,
  selectedId,
  onSelect,
  hasMore,
  expanded,
  onToggle,
}: {
  rows: InsightsFood[];
  selectedId: string;
  onSelect: (id: string) => void;
  hasMore: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 font-saveful text-[11px] uppercase tracking-wide text-gray-400">
              <th className="px-3.5 pb-2 font-saveful">Food category</th>
              <th className="pb-2 pr-3 font-saveful">Quantity</th>
              <th className="pb-2 pr-3.5 font-saveful">% of total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  "cursor-pointer border-b border-gray-50 last:border-0 hover:bg-[#FAF7F0]",
                  selectedId === row.id && "bg-saveful-green/[0.04]",
                )}
                onClick={() => onSelect(row.id)}
              >
                <td className="px-3.5 py-2.5 font-saveful text-sm text-gray-800">{row.name}</td>
                <td className="py-2.5 pr-3 font-saveful text-sm tabular-nums text-gray-800">{formatKg(row.kg)}</td>
                <td className="py-2.5 pr-3.5 font-saveful text-sm tabular-nums text-gray-500">{row.percent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasMore ? (
        <button type="button" onClick={onToggle} className="px-3.5 py-2.5 font-saveful-semibold text-xs text-saveful-green hover:underline">
          {expanded ? "Show top food categories" : "View all food categories"}
        </button>
      ) : null}
    </div>
  );
}

function OrgTable({
  rows,
  selectedId,
  onSelect,
  hasMore,
  expanded,
  onToggle,
}: {
  rows: InsightsOrganisation[];
  selectedId: string;
  onSelect: (id: string) => void;
  hasMore: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 font-saveful text-[11px] uppercase tracking-wide text-gray-400">
              <th className="px-3.5 pb-2 font-saveful">Organisation</th>
              <th className="pb-2 pr-3 font-saveful">Type</th>
              <th className="pb-2 pr-3 font-saveful">Food / resources received</th>
              <th className="pb-2 pr-3.5 font-saveful">Collections</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  "cursor-pointer border-b border-gray-50 last:border-0 hover:bg-[#FAF7F0]",
                  selectedId === row.id && "bg-saveful-green/[0.04]",
                )}
                onClick={() => onSelect(row.id)}
              >
                <td className="px-3.5 py-2.5">
                  <p className="font-saveful-semibold text-sm text-gray-900">{row.name}</p>
                </td>
                <td className="py-2.5 pr-3 font-saveful text-sm text-gray-600">{row.type}</td>
                <td className="py-2.5 pr-3 font-saveful text-sm tabular-nums text-gray-800">{formatKg(row.kg)}</td>
                <td className="py-2.5 pr-3.5 font-saveful text-sm tabular-nums text-gray-800">{row.collections}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasMore ? (
        <button type="button" onClick={onToggle} className="px-3.5 py-2.5 font-saveful-semibold text-xs text-saveful-green hover:underline">
          {expanded ? "Show top organisations" : "View all organisations"}
        </button>
      ) : null}
    </div>
  );
}

function WorkspaceSection({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-[#F7F6F2] px-3.5 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-3.5 w-1 rounded-full bg-saveful-green" aria-hidden />
          <h2 className="font-saveful-semibold text-xs uppercase tracking-[0.14em] text-gray-700">{title}</h2>
          {hint ? <span className="truncate font-saveful text-[11px] text-gray-400">{hint}</span> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-3 py-3">
      <p className="font-saveful-bold text-[1.05rem] tabular-nums leading-none text-gray-900">{value}</p>
      <p className="mt-1.5 font-saveful text-[11px] text-gray-500">{label}</p>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; name?: string; label?: string }[];
}) {
  return (
    <label className="block min-w-0">
      {label ? <span className="mb-1.5 block font-saveful text-[11px] uppercase tracking-[0.14em] text-gray-500">{label}</span> : null}
      <div className="relative">
        <select value={value} onChange={(event) => onChange(event.target.value)} className={selectClass}>
          {options.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name ?? item.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-gray-400">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
      </div>
    </label>
  );
}

function formatSeriesValue(value: number, metric: InsightsMetric) {
  if (metric === "value") return formatMoney(value);
  if (metric === "collections" || metric === "meals") return formatCount(value);
  return formatKg(value);
}

function formatSeriesTick(value: number, metric: InsightsMetric) {
  if (metric === "value") return `$${Math.round(value / 1000)}k`;
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return String(Math.round(value));
}

export function InsightsMethodologyNote() {
  return (
    <p className="flex items-start gap-2 font-saveful text-[11px] text-gray-400">
      <Leaf className="mt-0.5 h-3.5 w-3.5 shrink-0 text-saveful-green" />
      Same Saveful methodology as Dashboard and generated reports.
    </p>
  );
}
