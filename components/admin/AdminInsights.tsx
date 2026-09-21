"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Car,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  Home,
  Leaf,
  List,
  Truck,
  UtensilsCrossed,
} from "lucide-react";
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
import { AdminFiltersBar, AdminPage, AdminSection, useAdminFilters } from "@/components/admin/AdminChrome";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";
import { useAdminReady, useAdminVersion } from "@/lib/admin";
import { CHART_TOOLTIP } from "@/lib/demo";
import {
  adminInsightSummary,
  buildAdminInsightStory,
  downloadAdminInsightExcel,
  downloadAdminInsightReport,
  type InsightRankedRow,
} from "@/lib/adminInsights";
import { IMPACT, formatCount, formatKg, formatMoney } from "@/lib/impact";
import { cn } from "@/lib/utils";

export function AdminInsights() {
  const { filters, update, reset, query } = useAdminFilters();
  const version = useAdminVersion();
  const ready = useAdminReady();
  const story = useMemo(() => buildAdminInsightStory(filters), [filters, version]);
  const { overview } = story;
  const [chartMetric, setChartMetric] = useState<"kg" | "collections">("kg");
  const [copied, setCopied] = useState(false);

  const claimed = Math.round((overview.operations.listingsPublished * overview.operations.claimRate) / 100);
  const recoveredDelta = overview.headlines.recovered.delta;
  const peakFood = story.foods[0];
  const peakRecipient = story.recipients[0];

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(adminInsightSummary(story));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  if (!ready) {
    return (
      <AdminPage
        workspace
        crumb={[{ href: `/admin/dashboard${query}`, label: "Dashboard" }]}
        title="Insights & Reports"
        hint="Loading platform activity…"
      >
        <AdminFiltersBar filters={filters} onChange={update} onReset={reset} />
        <SavefulPageLoader message="Loading insights…" fullScreen={false} />
      </AdminPage>
    );
  }

  return (
    <AdminPage
      workspace
      crumb={[{ href: `/admin/dashboard${query}`, label: "Dashboard" }]}
      title="Insights & Reports"
      hint="The story behind the numbers — impact, pace, and a complete report you can take away."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copySummary}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-black/[0.06] px-3 font-saveful-semibold text-sm text-gray-800 hover:bg-[#F7F6F2]"
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? "Copied" : "Copy summary"}
          </button>
          <button
            type="button"
            onClick={() => downloadAdminInsightExcel(story)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-black/[0.06] px-3 font-saveful-semibold text-sm text-gray-800 hover:bg-[#F7F6F2]"
          >
            <FileText className="h-3.5 w-3.5" />
            Excel
          </button>
          <button
            type="button"
            onClick={() => downloadAdminInsightReport(story)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-saveful-green px-3.5 font-saveful-semibold text-sm text-white hover:bg-saveful-green/90"
          >
            <Download className="h-3.5 w-3.5" />
            Download report
          </button>
        </div>
      }
    >
      <AdminFiltersBar filters={filters} onChange={update} onReset={reset} />

      <section className="overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#16382d_0%,#2d5f4f_58%,#3f7d68_100%)] text-white shadow-[0_12px_40px_rgba(22,56,45,0.18)]">
        <div className="grid gap-6 px-5 py-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:px-7 lg:py-7">
          <div>
            <p className="font-saveful text-[11px] uppercase tracking-[0.18em] text-white/60">
              {story.scopeLabel} · {story.periodLabel}
            </p>
            <p className="mt-3 font-saveful-bold text-4xl leading-none tracking-tight sm:text-5xl">
              {formatKg(overview.metrics.recoveredKg)}
            </p>
            <p className="mt-2 font-saveful text-sm text-white/75">food recovered this period</p>
            <p className="mt-4 max-w-xl font-saveful text-sm leading-6 text-white/90">{adminInsightSummary(story)}</p>
            <p className="mt-3 font-saveful text-xs text-white/55">
              {recoveredDelta === 0
                ? `In line with the ${overview.priorLabel}.`
                : `${recoveredDelta > 0 ? "Up" : "Down"} ${formatKg(Math.abs(recoveredDelta))} versus the ${overview.priorLabel}.`}
              {peakFood ? ` Most recovered food: ${peakFood.name}.` : ""}
              {peakRecipient ? ` Top recipient: ${peakRecipient.name}.` : ""}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <HeroStat label="Meals created" value={formatCount(story.equivalents.meals)} />
            <HeroStat label="CO₂ avoided" value={formatKg(story.equivalents.co2)} />
            <HeroStat label="Food value" value={formatMoney(story.equivalents.value)} />
            <HeroStat label="Collections" value={formatCount(overview.metrics.collections)} />
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <EquivalentCard
          icon={UtensilsCrossed}
          label="Meals on plates"
          value={formatCount(story.equivalents.meals)}
          hint="Official Saveful factor · 0.42 kg per meal"
        />
        <EquivalentCard
          icon={Car}
          label="Car kilometres avoided"
          value={formatCount(story.equivalents.carKm)}
          hint="Illustrated · 0.192 kg CO₂ per km"
        />
        <EquivalentCard
          icon={Leaf}
          label="Trees working for a year"
          value={formatCount(story.equivalents.trees)}
          hint="Illustrated · 21 kg CO₂ per tree per year"
        />
        <EquivalentCard
          icon={Home}
          label="Households fed for a week"
          value={formatCount(story.equivalents.households)}
          hint="Illustrated · 21 meals per household"
        />
      </div>

      <AdminSection title={story.annualised ? "If this pace continues" : "All-time impact"}>
        <div className="grid gap-px bg-gray-100 sm:grid-cols-3">
          <Projection
            label={story.annualised ? "Food this year" : "Food recovered"}
            value={formatKg(story.projection.yearKg)}
          />
          <Projection
            label={story.annualised ? "Meals this year" : "Meals created"}
            value={formatCount(story.projection.yearMeals)}
          />
          <Projection
            label={story.annualised ? "Value this year" : "Food value"}
            value={formatMoney(story.projection.yearValue)}
          />
        </div>
        <p className="px-3.5 py-3 font-saveful text-xs text-gray-500">
          {story.annualised
            ? `Projection scales the last ${story.days} days across a full year. It is a pace check, not a forecast.`
            : "All-time totals for the selected scope. Change the period to see an annualised pace."}
        </p>
      </AdminSection>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <AdminSection title="Recovery funnel" className="xl:col-span-4">
          <div className="space-y-3 p-3.5">
            <FunnelRow
              href={`/admin/listings${query}`}
              icon={List}
              label="Listings published"
              value={overview.operations.listingsPublished}
              max={Math.max(overview.operations.listingsPublished, 1)}
            />
            <FunnelRow
              href={`/admin/listings${query}`}
              icon={CheckCircle2}
              label="Claimed"
              value={claimed}
              max={Math.max(overview.operations.listingsPublished, 1)}
              note={`${overview.operations.claimRate}% claim rate`}
            />
            <FunnelRow
              href={`/admin/collections${query}`}
              icon={Truck}
              label="Collected"
              value={overview.operations.collectionsCompleted}
              max={Math.max(overview.operations.listingsPublished, 1)}
              note={`${overview.operations.recoveryRate}% recovery rate`}
            />
          </div>
        </AdminSection>

        <AdminSection title="Activity over time" className="xl:col-span-8">
          <div className="flex items-center justify-between gap-3 px-3.5 pt-3">
            <select
              value={chartMetric}
              onChange={(event) => setChartMetric(event.target.value as "kg" | "collections")}
              className="h-8 min-w-0 max-w-[220px] truncate rounded-lg border border-black/[0.06] bg-[#F7F6F2] px-2 font-saveful text-xs outline-none"
            >
              <option value="kg">Food recovered (kg)</option>
              <option value="collections">Collections completed</option>
            </select>
            <Link href={`/admin/reports/new${query}`} className="inline-flex items-center gap-1 font-saveful-semibold text-xs text-saveful-green hover:underline">
              <FileText className="h-3.5 w-3.5" />
              Customise report
            </Link>
          </div>
          <div className="h-56 px-2 pb-3 pt-1">
            {overview.series.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={overview.series} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
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
            ) : (
              <Empty>No completed collections in this period yet.</Empty>
            )}
          </div>
        </AdminSection>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <AdminSection title="Recovery pathways" className="xl:col-span-4">
          <PathwayDonut rows={overview.pathways} totalKg={overview.recoveredKg} />
        </AdminSection>
        <AdminSection title="What was recovered" className="xl:col-span-4">
          <RankedList rows={story.foods} empty="No food items recorded on completed collections." />
        </AdminSection>
        <AdminSection title="Who received it" className="xl:col-span-4">
          <RankedList rows={story.recipients} empty="No recipient organisations in this period." />
        </AdminSection>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <AdminSection title="Listing sources" className="xl:col-span-4">
          <RankedList rows={story.providers} empty="No listing sources in this period." />
        </AdminSection>
        <AdminSection title="Sites contributing" className="xl:col-span-4">
          <RankedList rows={story.sites} empty="No site-level collections in this period." />
        </AdminSection>
        <AdminSection title="Needs attention" className="xl:col-span-4">
          <ul>
            {overview.attention.map((item) => (
              <li key={item.id} className="border-b border-gray-50 last:border-0">
                <Link href={item.href} className="flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-[#FAF7F0]">
                  <span className="min-w-0 truncate font-saveful text-sm text-gray-700">{item.label}</span>
                  <span className={cn("font-saveful-semibold text-sm tabular-nums", item.count > 0 ? "text-red-600" : "text-gray-400")}>
                    {formatCount(item.count)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </AdminSection>
      </div>

      <AdminSection title="Network by type">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 font-saveful text-[11px] uppercase tracking-wide text-gray-400">
                <th className="px-3.5 py-2 font-saveful">Type</th>
                <th className="px-3.5 py-2 font-saveful">Orgs</th>
                <th className="px-3.5 py-2 font-saveful">Active</th>
                <th className="px-3.5 py-2 font-saveful">Listings</th>
                <th className="px-3.5 py-2 font-saveful">Collections</th>
                <th className="px-3.5 py-2 font-saveful">Recovered</th>
              </tr>
            </thead>
            <tbody>
              {overview.types.map((row) => (
                <tr key={row.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-3.5 py-2.5 font-saveful-semibold text-sm text-gray-800">{shortType(row.label)}</td>
                  <td className="px-3.5 py-2.5 font-saveful text-sm tabular-nums text-gray-700">{formatCount(row.organisations)}</td>
                  <td className="px-3.5 py-2.5 font-saveful text-sm tabular-nums text-gray-700">{formatCount(row.active)}</td>
                  <td className="px-3.5 py-2.5 font-saveful text-sm tabular-nums text-gray-700">{formatCount(row.listings)}</td>
                  <td className="px-3.5 py-2.5 font-saveful text-sm tabular-nums text-gray-700">{formatCount(row.collections)}</td>
                  <td className="px-3.5 py-2.5 font-saveful text-sm tabular-nums text-gray-700">{formatKg(row.recoveredKg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSection>

      <footer className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-3 font-saveful text-[11px] leading-5 text-gray-400 sm:flex-row sm:items-end sm:justify-between">
        <p>
          Official impact uses Saveful factors: 1 meal = {IMPACT.MEAL_WEIGHT_KG} kg, CO₂ = {IMPACT.CO2_PER_KG} kg per kg
          food, value = {formatMoney(IMPACT.FOOD_VALUE_PER_KG)} per kg.
          Car kilometres, trees and households are illustrated equivalents only.
        </p>
        <p className="inline-flex items-center gap-1.5">
          <Leaf className="h-3 w-3 text-saveful-green" />
          Complete report includes every table on this page.
        </p>
      </footer>
    </AdminPage>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/10 px-3.5 py-3 ring-1 ring-white/10">
      <p className="font-saveful text-[11px] uppercase tracking-wide text-white/55">{label}</p>
      <p className="mt-1 font-saveful-bold text-lg tabular-nums text-white">{value}</p>
    </div>
  );
}

function EquivalentCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Car;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3.5 py-3.5">
      <p className="flex items-center gap-1.5 font-saveful text-[11px] uppercase tracking-wide text-gray-400">
        <Icon className="h-3.5 w-3.5 text-saveful-green" />
        {label}
      </p>
      <p className="mt-2 font-saveful-bold text-2xl tabular-nums text-gray-900">{value}</p>
      <p className="mt-1 font-saveful text-[11px] text-gray-400">{hint}</p>
    </div>
  );
}

function Projection({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-3.5 py-3.5">
      <p className="font-saveful text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 font-saveful-bold text-xl tabular-nums text-gray-900">{value}</p>
    </div>
  );
}

function FunnelRow({
  href,
  icon: Icon,
  label,
  value,
  max,
  note,
}: {
  href: string;
  icon: typeof List;
  label: string;
  value: number;
  max: number;
  note?: string;
}) {
  return (
    <Link href={href} className="block rounded-xl px-1 py-0.5 hover:bg-[#FAF7F0]">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 font-saveful text-sm text-gray-700">
          <Icon className="h-3.5 w-3.5 text-saveful-green" />
          {label}
        </span>
        <span className="font-saveful-semibold text-sm tabular-nums text-gray-900">{formatCount(value)}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#F0EDE4]">
        <div className="h-full rounded-full bg-saveful-green" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
      </div>
      {note ? <p className="mt-1 font-saveful text-[11px] text-gray-400">{note}</p> : null}
    </Link>
  );
}

function RankedList({ rows, empty }: { rows: InsightRankedRow[]; empty: string }) {
  if (!rows.length) return <Empty>{empty}</Empty>;
  const top = rows.slice(0, 6);
  const widest = top[0]?.kg || 1;
  return (
    <ul className="divide-y divide-gray-50">
      {top.map((row) => (
        <li key={row.id} className="px-3.5 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate font-saveful text-sm text-gray-800">{row.name}</span>
            <span className="shrink-0 font-saveful text-sm tabular-nums text-gray-700">
              {formatKg(row.kg)} · {row.percent}%
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#F0EDE4]">
            <div className="h-full rounded-full bg-saveful-green/80" style={{ width: `${Math.max(6, (row.kg / widest) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function PathwayDonut({
  rows,
  totalKg,
}: {
  rows: { pathway: string; label: string; kg: number; percent: number; color: string }[];
  totalKg: number;
}) {
  const data = rows.filter((item) => item.kg > 0);
  return (
    <div className="px-3.5 pb-3 pt-2">
      {data.length ? (
        <>
          <div className="relative mx-auto h-40 w-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="kg" nameKey="label" innerRadius={46} outerRadius={64} paddingAngle={2} stroke="none">
                  {data.map((item) => (
                    <Cell key={item.pathway} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={CHART_TOOLTIP} formatter={(value) => [formatKg(Number(value)), "Recovered"]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="font-saveful-bold text-sm tabular-nums text-gray-900">{formatKg(totalKg)}</p>
              <p className="font-saveful text-[10px] uppercase tracking-wide text-gray-400">Total</p>
            </div>
          </div>
          <ul className="mt-1 space-y-1.5">
            {rows.map((item) => (
              <li key={item.pathway} className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 font-saveful text-sm text-gray-700">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.color }} />
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="shrink-0 font-saveful text-xs tabular-nums text-gray-500">
                  {formatKg(item.kg)} · {item.percent}%
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <Empty>No recovered food to split by pathway yet.</Empty>
      )}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="px-3.5 py-8 text-center font-saveful text-sm text-gray-500">{children}</p>;
}

function shortType(label: string) {
  return label.replace(" / Surplus Provider", "").replace(" Recovery Provider", "");
}

function axisKg(value: number) {
  if (value >= 1000) return `${Math.round(value / 100) / 10}t`;
  return `${Math.round(value)}`;
}
