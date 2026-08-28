"use client";

import { useState, type ReactNode } from "react";
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
} from "lucide-react";
import { AdminFiltersBar, AdminPage, AdminSection, useAdminFilters } from "@/components/admin/AdminChrome";
import { buildAdminOverview, type OrgTypeId } from "@/lib/admin";
import { CHART_TOOLTIP } from "@/lib/demo";
import { formatCount, formatKg } from "@/lib/impact";
import type { RecoveryPathway } from "@/types/enterprise";
import { cn } from "@/lib/utils";

const TYPE_DOT: Record<string, string> = {
  food_business: "bg-amber-500",
  charity: "bg-sky-600",
  farmer: "bg-saveful-green",
  circular: "bg-violet-500",
};

export function AdminDashboard() {
  const { filters, update, reset, query } = useAdminFilters();
  const model = buildAdminOverview(filters);
  const insightsHref = `/admin/insights${query}`;
  const [chartMetric, setChartMetric] = useState<"kg" | "collections">("kg");

  const headlines = [
    { key: "organisations", label: "Organisations", value: formatCount(model.headlines.organisations.value), delta: model.headlines.organisations.delta, unit: "", href: `/admin/organisations${query}`, icon: Building2, tone: "bg-saveful-green/10 text-saveful-green" },
    { key: "sites", label: "Sites", value: formatCount(model.headlines.sites.value), delta: model.headlines.sites.delta, unit: "", href: `/admin/sites${query}`, icon: MapPin, tone: "bg-sky-50 text-sky-700" },
    { key: "recovered", label: "Food recovered", value: formatKg(model.headlines.recovered.value), delta: Math.round(model.headlines.recovered.delta), unit: " kg", href: insightsHref, icon: Leaf, tone: "bg-saveful-green/10 text-saveful-green" },
    { key: "collections", label: "Collections", value: formatCount(model.headlines.collections.value), delta: model.headlines.collections.delta, unit: "", href: `/admin/collections${query}`, icon: Truck, tone: "bg-violet-50 text-violet-700" },
    { key: "co2", label: "CO₂ avoided", value: formatKg(model.headlines.co2.value), delta: Math.round(model.headlines.co2.delta), unit: " kg", href: insightsHref, icon: Cloud, tone: "bg-teal-50 text-teal-700" },
  ];

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

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
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
              <p className="mt-2.5 truncate font-saveful-bold text-xl leading-none tabular-nums text-gray-900">{card.value}</p>
              <p
                className={cn(
                  "mt-2 truncate font-saveful text-[11px]",
                  card.delta < 0 ? "text-red-600" : card.delta > 0 ? "text-emerald-700" : "text-gray-400",
                )}
              >
                {card.delta === 0 ? "No change" : `${signed(card.delta)}${card.unit} vs ${model.priorLabel}`}
                {card.delta !== 0 ? <ArrowUpRight className={cn("ml-0.5 inline h-3 w-3", card.delta < 0 && "rotate-90")} /> : null}
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
