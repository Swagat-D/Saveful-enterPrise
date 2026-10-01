"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  Cloud,
  FileText,
  Leaf,
  List,
  MapPin,
  RefreshCw,
  Truck,
  UtensilsCrossed,
} from "lucide-react";
import { AdminFiltersBar, AdminPage, AdminSection, useAdminFilters } from "@/components/admin/AdminChrome";
import { ORG_TYPES, type AdminFilters, type OrgTypeId } from "@/lib/admin";
import { getAdminDashboardSummary, type AdminDashboardSummary } from "@/lib/api";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";
import { CHART_TOOLTIP } from "@/lib/demo";
import { rangeForFilters } from "@/lib/dates";
import { calculateImpact, formatCount, formatKg } from "@/lib/impact";
import { PATHWAY_LABEL } from "@/lib/networkQuery";
import type { RecoveryPathway } from "@/types/enterprise";
import { cn } from "@/lib/utils";

const TYPE_DOT: Record<string, string> = {
  food_business: "bg-amber-500",
  charity: "bg-sky-600",
  farmer: "bg-saveful-green",
  circular: "bg-violet-500",
};

const PATHWAY_COLORS: Record<RecoveryPathway, string> = {
  people: "#2D5F4F",
  livestock: "#4C7C9B",
  circular: "#7C6BB0",
  bioenergy: "#E3B23C",
};

function dashboardQuery(filters: AdminFilters) {
  const range = rangeForFilters(filters);
  const params = new URLSearchParams();
  if (range.startDate) params.set("from", range.startDate);
  if (range.endDate) params.set("to", range.endDate);
  if (filters.organisationId !== "all") params.set("organisationId", filters.organisationId);
  if (filters.orgType !== "all") params.set("orgType", filters.orgType);
  if (filters.pathway !== "all") params.set("pathway", filters.pathway);
  if (filters.country !== "all") params.set("country", filters.country);
  if (filters.role !== "all") params.set("role", filters.role);
  if (filters.accountStatus !== "all") params.set("accountStatus", filters.accountStatus);
  return params;
}

function chartLabel(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function bucketActivitySeries(
  daily: AdminDashboardSummary["daily"],
  period: AdminFilters["period"],
) {
  if (!daily.length) return [];
  if (period === "all") {
    const months = new Map<string, { kg: number; collections: number }>();
    for (const point of daily) {
      const key = point.date.slice(0, 7);
      const current = months.get(key) ?? { kg: 0, collections: 0 };
      months.set(key, { kg: current.kg + point.kg, collections: current.collections + point.collections });
    }
    return [...months.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(-8)
      .map(([key, stats]) => ({
        label: new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }),
        kg: stats.kg,
        collections: stats.collections,
      }));
  }
  const bucket = daily.length <= 7 ? 1 : daily.length <= 30 ? 3 : 7;
  const points: { label: string; kg: number; collections: number }[] = [];
  const firstOffset = (daily.length - 1) % bucket;
  for (let offset = firstOffset; offset < daily.length; offset += bucket) {
    const start = Math.max(0, offset - (bucket - 1));
    const slice = daily.slice(start, offset + 1);
    const end = slice[slice.length - 1];
    points.push({
      label: chartLabel(end.date),
      kg: slice.reduce((sum, point) => sum + point.kg, 0),
      collections: slice.reduce((sum, point) => sum + point.collections, 0),
    });
  }
  return points;
}

function summaryModel(summary: AdminDashboardSummary, filters: AdminFilters, query: string) {
  const impact = calculateImpact(summary.recoveredKg);
  const previousImpact = calculateImpact(summary.previousRecoveredKg);
  const typeById = new Map(summary.types.map((row) => [row.id, row]));
  const types = ORG_TYPES.map((type) => {
    const row = typeById.get(type.id);
    return {
      id: type.id,
      label: type.label,
      organisations: row?.organisations ?? 0,
      activeSites: row?.activeSites ?? 0,
      active: row?.activeOrganisations ?? 0,
      listings: row?.listings ?? 0,
      claims: row?.claims ?? 0,
      collections: row?.collections ?? 0,
      recoveredKg: row?.recoveredKg ?? 0,
    };
  });
  const kgByPathway = new Map(summary.pathways.map((row) => [row.pathway, row.kg]));
  const pathways = (Object.keys(PATHWAY_COLORS) as RecoveryPathway[]).map((pathway) => {
    const kg = kgByPathway.get(pathway) ?? 0;
    return {
      pathway,
      label: PATHWAY_LABEL[pathway],
      kg,
      percent: summary.recoveredKg > 0 ? Math.round((kg / summary.recoveredKg) * 100) : 0,
      color: PATHWAY_COLORS[pathway],
    };
  });
  const priorLabel = filters.period === "all" || filters.period === "custom" ? "prior period" : `prior ${filters.period} days`;
  return {
    priorLabel,
    recoveredKg: summary.recoveredKg,
    types,
    pathways,
    series: bucketActivitySeries(summary.daily, filters.period),
    headlines: {
      organisations: { value: summary.organisations, delta: 0 },
      sites: { value: summary.sites, delta: summary.sitesWithRecovery - summary.previousSitesWithRecovery },
      recovered: { value: summary.recoveredKg, delta: summary.recoveredKg - summary.previousRecoveredKg },
      meals: { value: impact.mealsCreated, delta: impact.mealsCreated - previousImpact.mealsCreated },
      collections: { value: summary.collections, delta: summary.collections - summary.previousCollections },
      co2: { value: impact.co2AvoidedKg, delta: impact.co2AvoidedKg - previousImpact.co2AvoidedKg },
    },
    operations: {
      listingsPublished: summary.operations.listingsPublished,
      claimRate: summary.operations.claimRate,
      claimRateDelta: summary.operations.claimRate - summary.operations.previousClaimRate,
      recoveryRate: summary.operations.recoveryRate,
      recoveryRateDelta: summary.operations.recoveryRate - summary.operations.previousRecoveryRate,
      collectionsCompleted: summary.operations.collectionsCompleted,
      collectionsDelta: summary.operations.collectionsCompleted - summary.operations.previousCollectionsCompleted,
    },
    attention: [
      { id: "unclaimed", label: "Unclaimed / expired listings", count: summary.attention.unclaimed, href: `/admin/listings${query}` },
      { id: "overdue", label: "Overdue / unresolved collections", count: summary.attention.unresolved, href: `/admin/collections${query}` },
      { id: "activation", label: "Organisations awaiting activation", count: summary.attention.awaitingActivation, href: `/admin/organisations${query}` },
      { id: "quiet", label: "Sites with no recent activity", count: summary.attention.quietSites, href: `/admin/sites${query}` },
      { id: "config", label: "Data / configuration issues", count: 0, href: `/admin/sites${query}` },
    ],
  };
}

export function AdminDashboard() {
  const { filters, update, reset, query } = useAdminFilters();
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [loadError, setLoadError] = useState("");
  const insightsHref = `/admin/insights${query}`;
  const [chartMetric, setChartMetric] = useState<"kg" | "collections">("kg");
  const model = summary ? summaryModel(summary, filters, query) : null;
  const requestKey = dashboardQuery(filters).toString();

  useEffect(() => {
    const params = new URLSearchParams(requestKey);
    let cancelled = false;
    setSummary(null);
    setLoadError("");
    getAdminDashboardSummary(params)
      .then((next) => {
        if (!cancelled) {
          setSummary(next);
          setLoadError("");
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "The dashboard could not be loaded.");
      });
    return () => {
      cancelled = true;
    };
  }, [requestKey]);

  const headlines = [
    { key: "organisations", label: "Organisations", value: formatCount(model?.headlines.organisations.value ?? 0), delta: model?.headlines.organisations.delta ?? 0, unit: "", href: `/admin/organisations${query}`, icon: Building2, tone: "bg-saveful-green/10 text-saveful-green", pending: false },
    { key: "sites", label: "Sites", value: formatCount(model?.headlines.sites.value ?? 0), delta: model?.headlines.sites.delta ?? 0, unit: "", href: `/admin/sites${query}`, icon: MapPin, tone: "bg-sky-50 text-sky-700", pending: false },
    { key: "recovered", label: "Food recovered", value: formatKg(model?.headlines.recovered.value ?? 0), delta: Math.round(model?.headlines.recovered.delta ?? 0), unit: " kg", href: insightsHref, icon: Leaf, tone: "bg-saveful-green/10 text-saveful-green", pending: false },
    { key: "meals", label: "Meals created", value: formatCount(model?.headlines.meals.value ?? 0), delta: Math.round(model?.headlines.meals.delta ?? 0), unit: "", href: insightsHref, icon: UtensilsCrossed, tone: "bg-orange-50 text-orange-700", pending: false },
    { key: "collections", label: "Collections", value: formatCount(model?.headlines.collections.value ?? 0), delta: model?.headlines.collections.delta ?? 0, unit: "", href: `/admin/collections${query}`, icon: Truck, tone: "bg-violet-50 text-violet-700", pending: false },
    { key: "co2", label: "CO₂ avoided", value: formatKg(model?.headlines.co2.value ?? 0), delta: Math.round(model?.headlines.co2.delta ?? 0), unit: " kg", href: insightsHref, icon: Cloud, tone: "bg-teal-50 text-teal-700", pending: false },
  ];

  if (!model) {
    return (
      <AdminPage
        workspace
        title="Dashboard"
        hint="Network, activity and impact across Saveful for Business."
      >
        <AdminFiltersBar filters={filters} onChange={update} onReset={reset} />
        {loadError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-saveful text-sm text-red-700">{loadError}</p>
        ) : (
          <SavefulPageLoader message="Loading dashboard…" fullScreen={false} />
        )}
      </AdminPage>
    );
  }

  return (
    <AdminPage
      workspace
      title="Dashboard"
      hint="Network, activity and impact across Saveful for Business."
      actions={
        <Link
          href={insightsHref}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-saveful-green px-3.5 font-saveful-semibold text-sm text-white"
        >
          <FileText className="h-3.5 w-3.5" />
          Create Report
        </Link>
      }
    >
      <AdminFiltersBar filters={filters} onChange={update} onReset={reset} />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        {headlines.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.key}
              href={card.href}
              className="rounded-xl border border-gray-200 bg-white p-3.5 transition hover:border-saveful-green/30"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate font-saveful text-[11px] uppercase tracking-[0.12em] text-gray-500">{card.label}</p>
                <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", card.tone)}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
              </div>
              <p className="mt-2.5 truncate font-saveful-bold text-xl leading-none tabular-nums text-gray-900">{card.pending ? "…" : card.value}</p>
              <p
                className={cn(
                  "mt-2 truncate font-saveful text-[11px]",
                  !card.pending && card.delta < 0 ? "text-red-600" : !card.pending && card.delta > 0 ? "text-emerald-700" : "text-gray-400",
                )}
              >
                {card.pending ? "Loading activity…" : card.delta === 0 ? "No change" : `${signed(card.delta)}${card.unit} vs ${model.priorLabel}`}
                {!card.pending && card.delta !== 0 ? <ArrowUpRight className={cn("ml-0.5 inline h-3 w-3", card.delta < 0 && "rotate-90")} /> : null}
              </p>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <AdminSection title="Network by type" action={<TextLink href={`/admin/organisations${query}`}>View</TextLink>}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 font-saveful text-[11px] uppercase tracking-wide text-gray-400">
                  <th className="px-3.5 py-2 font-saveful">Type</th>
                  <th className="px-3.5 py-2 font-saveful">Orgs</th>
                  <th className="px-3.5 py-2 font-saveful">Sites</th>
                </tr>
              </thead>
              <tbody>
                {model.types.map((row) => (
                  <tr key={row.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-3.5 py-2">
                      <button
                        type="button"
                        onClick={() => update({ orgType: filters.orgType === row.id ? "all" : row.id, organisationId: "all" })}
                        className="flex min-w-0 items-center gap-2 text-left font-saveful-semibold text-sm text-saveful-green hover:underline"
                      >
                        <span className={cn("h-2 w-2 shrink-0 rounded-full", TYPE_DOT[row.id])} />
                        <span className="truncate">{shortType(row.label)}</span>
                      </button>
                    </td>
                    <td className="px-3.5 py-2 font-saveful text-sm tabular-nums text-gray-800">{formatCount(row.organisations)}</td>
                    <td className="px-3.5 py-2 font-saveful text-sm tabular-nums text-gray-800">{formatCount(row.activeSites)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminSection>

        <AdminSection title="Recovery pathways" action={<TextLink href={insightsHref}>View</TextLink>}>
          <PathwayDonut
            rows={model.pathways}
            totalKg={model.recoveredKg}
            selected={filters.pathway}
            onSelect={(pathway) => update({ pathway: filters.pathway === pathway ? "all" : pathway })}
          />
        </AdminSection>

        <AdminSection title="Needs attention" action={<TextLink href={`/admin/sites${query}`}>View</TextLink>}>
          <ul>
            {model.attention.map((item) => (
              <li key={item.id} className="border-b border-gray-50 last:border-0">
                <Link href={item.href} className="flex items-center justify-between gap-3 px-3.5 py-2 hover:bg-[#FAF7F0]">
                  <span className="min-w-0 truncate font-saveful text-sm text-gray-700">{item.label}</span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <span className={cn("font-saveful-semibold text-sm tabular-nums", item.count > 0 ? "text-red-600" : "text-gray-400")}>
                      {formatCount(item.count)}
                    </span>
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </AdminSection>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <AdminSection title="Platform activity" className="xl:col-span-3">
          <div className="grid grid-cols-2 gap-2 p-3 xl:grid-cols-1">
            <ActivityCell href={`/admin/listings${query}`} icon={List} label="Listings published" value={formatCount(model.operations.listingsPublished)} />
            <ActivityCell
              href={`/admin/listings${query}`}
              icon={CheckCircle2}
              label="Claim rate"
              value={`${model.operations.claimRate}%`}
              delta={`${signed(model.operations.claimRateDelta)} pp`}
              down={model.operations.claimRateDelta < 0}
            />
            <ActivityCell
              href={insightsHref}
              icon={RefreshCw}
              label="Recovery rate"
              value={`${model.operations.recoveryRate}%`}
              delta={`${signed(model.operations.recoveryRateDelta)} pp`}
              down={model.operations.recoveryRateDelta < 0}
            />
            <ActivityCell
              href={`/admin/collections${query}`}
              icon={Truck}
              label="Collections completed"
              value={formatCount(model.operations.collectionsCompleted)}
              delta={signed(model.operations.collectionsDelta)}
              down={model.operations.collectionsDelta < 0}
            />
          </div>
        </AdminSection>

        <AdminSection title="Activity over time" className="xl:col-span-5">
          <div className="flex items-center justify-between gap-3 px-3.5 pt-3">
            <select
              value={chartMetric}
              onChange={(event) => setChartMetric(event.target.value as "kg" | "collections")}
              className="h-8 min-w-0 max-w-[220px] truncate rounded-lg border border-black/[0.06] bg-[#F7F6F2] px-2 font-saveful text-xs outline-none"
            >
              <option value="kg">Food recovered (kg)</option>
              <option value="collections">Collections completed</option>
            </select>
            <TextLink href={insightsHref}>Insights</TextLink>
          </div>
          <div className="h-52 px-2 pb-3 pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={model.series} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="#EFEDE6" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94A3B8" }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                  tickFormatter={(value) => (chartMetric === "kg" ? axisKg(Number(value)) : formatCount(Number(value)))}
                />
                <Tooltip
                  contentStyle={CHART_TOOLTIP}
                  formatter={(value) => [
                    chartMetric === "kg" ? formatKg(Number(value)) : formatCount(Number(value)),
                    chartMetric === "kg" ? "Food recovered" : "Collections",
                  ]}
                />
                <Line type="monotone" dataKey={chartMetric} stroke="#2D5F4F" strokeWidth={2.25} dot={{ r: 3, fill: "#2D5F4F" }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </AdminSection>

        <AdminSection title="Ecosystem performance" action={<TextLink href={`/admin/organisations${query}`}>View</TextLink>} className="xl:col-span-4">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 font-saveful text-[11px] uppercase tracking-wide text-gray-400">
                  <th className="px-3.5 py-2 font-saveful">Type</th>
                  <th className="px-3.5 py-2 font-saveful">Orgs</th>
                  <th className="px-3.5 py-2 font-saveful">Active</th>
                  <th className="px-3.5 py-2 font-saveful">List / claim</th>
                  <th className="px-3.5 py-2 font-saveful">Cols</th>
                  <th className="px-3.5 py-2 font-saveful">Recovered</th>
                </tr>
              </thead>
              <tbody>
                {model.types.map((row) => (
                  <tr key={row.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-3.5 py-2">
                      <button
                        type="button"
                        onClick={() => update({ orgType: filters.orgType === row.id ? "all" : (row.id as OrgTypeId), organisationId: "all" })}
                        className="max-w-[9rem] truncate text-left font-saveful-semibold text-sm text-saveful-green hover:underline"
                      >
                        {shortType(row.label)}
                      </button>
                    </td>
                    <td className="px-3.5 py-2 font-saveful text-sm tabular-nums text-gray-800">{formatCount(row.organisations)}</td>
                    <td className="px-3.5 py-2 font-saveful text-sm tabular-nums text-gray-800">{formatCount(row.active)}</td>
                    <td className="whitespace-nowrap px-3.5 py-2 font-saveful text-sm tabular-nums text-gray-800">
                      {formatCount(row.listings)} / {formatCount(row.claims)}
                    </td>
                    <td className="px-3.5 py-2 font-saveful text-sm tabular-nums text-gray-800">{formatCount(row.collections)}</td>
                    <td className="whitespace-nowrap px-3.5 py-2 font-saveful text-sm tabular-nums text-gray-800">{formatKg(row.recoveredKg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminSection>
      </div>

      <footer className="flex flex-col gap-1 font-saveful text-[11px] text-gray-400 sm:flex-row sm:justify-between">
        <p>All times shown in Australia/Sydney (AEST)</p>
        <p className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
          Data updated: 22 Aug 2026, 8:30 am
        </p>
      </footer>
    </AdminPage>
  );
}

function PathwayDonut({
  rows,
  totalKg,
  selected,
  onSelect,
}: {
  rows: { pathway: RecoveryPathway; label: string; kg: number; percent: number; color: string }[];
  totalKg: number;
  selected: "all" | RecoveryPathway;
  onSelect: (pathway: RecoveryPathway) => void;
}) {
  const data = rows.filter((item) => item.kg > 0);
  return (
    <div className="px-3.5 pb-3 pt-2">
      {data.length ? (
        <>
          <div className="relative mx-auto h-40 w-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="kg"
                  nameKey="label"
                  innerRadius={46}
                  outerRadius={64}
                  paddingAngle={2}
                  onClick={(_, index) => data[index] && onSelect(data[index].pathway)}
                  style={{ cursor: "pointer" }}
                >
                  {data.map((item) => (
                    <Cell
                      key={item.pathway}
                      fill={item.color}
                      opacity={selected === "all" || selected === item.pathway ? 1 : 0.35}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={CHART_TOOLTIP} formatter={(value, _name, item) => [formatKg(Number(value)), item.payload.label]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <p className="font-saveful-bold text-sm tabular-nums text-gray-900">{formatKg(totalKg)}</p>
              <p className="font-saveful text-[10px] text-gray-400">recovered</p>
            </div>
          </div>
          <ul className="mt-1 space-y-1">
            {rows.map((item) => (
              <li key={item.pathway}>
                <button
                  type="button"
                  onClick={() => onSelect(item.pathway)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-[#FAF7F0]",
                    selected === item.pathway && "bg-saveful-green/[0.06]",
                  )}
                >
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.color }} />
                  <span className="min-w-0 truncate font-saveful text-sm text-gray-700">
                    {item.label} ({item.percent}%)
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="px-1 py-8 text-center font-saveful text-sm text-gray-500">No recovered volume for these filters.</p>
      )}
    </div>
  );
}

function ActivityCell({
  href,
  icon: Icon,
  label,
  value,
  delta,
  down,
}: {
  href: string;
  icon: typeof List;
  label: string;
  value: string;
  delta?: string;
  down?: boolean;
}) {
  return (
    <Link href={href} className="rounded-xl bg-[#F7F6F2] px-3 py-2.5 transition hover:bg-[#EFEDE6]">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate font-saveful text-[11px] text-gray-500">{label}</p>
        <Icon className="h-3.5 w-3.5 shrink-0 text-saveful-green" />
      </div>
      <p className="mt-1.5 font-saveful-bold text-lg tabular-nums leading-none text-gray-900">{value}</p>
      {delta ? <p className={cn("mt-1 truncate font-saveful text-[11px]", down ? "text-red-600" : "text-emerald-700")}>{delta}</p> : null}
    </Link>
  );
}

function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="whitespace-nowrap font-saveful-semibold text-xs text-saveful-green hover:underline">
      {children} →
    </Link>
  );
}

function signed(value: number) {
  const rounded = Math.round(value);
  if (rounded > 0) return `+${formatCount(rounded)}`;
  if (rounded < 0) return formatCount(rounded);
  return "0";
}

function axisKg(value: number) {
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return String(Math.round(value));
}

function shortType(label: string) {
  if (label === "Food Business") return "Food businesses";
  if (label === "Charity") return "Charities";
  if (label === "Farmer") return "Farmers";
  if (label === "Circular Recovery Provider") return "Circular recovery";
  return label;
}
