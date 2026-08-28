"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
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
import { AdminPortalShell } from "@/components/layout/AdminPortalShell";
import { AdminSection, StatusPill, useAdminFilters } from "@/components/admin/AdminChrome";
import { PortalPageShell, StatusBadge } from "@/components/ui/Portal";
import { buildSiteDetail, orgTypeLabel, participationLabel, updateSiteStatus, useAdminVersion } from "@/lib/admin";
import { useAdminAuditVersion } from "@/lib/adminAudit";
import { useSession } from "@/lib/auth";
import { CHART_COLORS, CHART_TOOLTIP } from "@/lib/demo";
import { formatDisplayDate, periodLabel } from "@/lib/dates";
import { calculateImpact, formatCount, formatKg, formatMoney, IMPACT } from "@/lib/impact";
import { INSIGHTS_METRICS, INSIGHTS_PATHWAYS, type InsightsMetric } from "@/lib/insights";
import { ACTIVITY_LABEL, formatLastActivity } from "@/lib/networkRules";
import { PATHWAY_COLORS } from "@/lib/networkQuery";
import { parseSiteTab, SITE_TABS, type SiteTab } from "@/lib/siteWorkspace";
import type { PeriodKey, RecoveryPathway } from "@/types/enterprise";
import { cn } from "@/lib/utils";

const PERIODS: { id: PeriodKey; label: string }[] = [
  { id: "7", label: "7 days" },
  { id: "30", label: "30 days" },
  { id: "90", label: "90 days" },
  { id: "all", label: "All time" },
];

const PATHWAY_BAR: Record<string, string> = {
  people: "#2D5F4F",
  livestock: "#4C7C9B",
  circular: "#C4843C",
  bioenergy: "#7C6BB0",
};

const PARTICIPATION_COPY = {
  lists: "Lists surplus",
  collects: "Collects surplus",
  both: "Lists and collects surplus",
} as const;

const ACTIVITY_TONE = {
  Collection: "green",
  Users: "blue",
  Listing: "blue",
  Alert: "amber",
} as const;

function orgTabHref(orgId: string, query: string, tab: string) {
  const params = new URLSearchParams(query.startsWith("?") ? query.slice(1) : query);
  params.set("org", orgId);
  params.set("tab", tab);
  return `/admin/organisations/${orgId}?${params}`;
}

function withQuery(href: string, query: string) {
  if (!query) return href;
  const extra = query.startsWith("?") ? query.slice(1) : query;
  return href.includes("?") ? `${href}&${extra}` : `${href}?${extra}`;
}

function siteQuery(query: string, orgId: string) {
  const params = new URLSearchParams(query.startsWith("?") ? query.slice(1) : query);
  params.set("org", orgId);
  const next = params.toString();
  return next ? `?${next}` : "";
}

function seriesValue(kg: number, collections: number, metric: InsightsMetric) {
  const impact = calculateImpact(kg);
  if (metric === "meals") return impact.mealsCreated;
  if (metric === "co2") return impact.co2AvoidedKg;
  if (metric === "value") return impact.foodValue;
  if (metric === "collections") return collections;
  return kg;
}

function formatSeriesValue(value: number, metric: InsightsMetric) {
  if (metric === "value") return formatMoney(value);
  if (metric === "collections" || metric === "meals") return formatCount(value);
  return formatKg(value);
}

export function AdminSiteDetail({ id }: { id: string }) {
  const user = useSession();
  useAdminVersion();
  useAdminAuditVersion();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { query } = useAdminFilters();
  const tab = parseSiteTab(searchParams.get("tab"));
  const [period, setPeriod] = useState<PeriodKey>("30");
  const [menuOpen, setMenuOpen] = useState(false);
  const model = buildSiteDetail(id, period);

  const setTab = (next: SiteTab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "overview") params.delete("tab");
    else params.set("tab", next);
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  };

  if (!model) {
    return (
      <AdminPortalShell>
        <PortalPageShell>
          <p className="font-saveful text-sm text-gray-500">This site was not found.</p>
        </PortalPageShell>
      </AdminPortalShell>
    );
  }

  const { site, org, directory } = model;
  const context = siteQuery(query, org.id);

  return (
    <AdminPortalShell>
      <PortalPageShell className="!space-y-3 sm:!space-y-3">
        <nav className="flex flex-wrap items-center gap-1.5 font-saveful text-xs text-gray-500">
          <Link href={`/admin/organisations${query}`} className="hover:text-saveful-green">
            Organisations
          </Link>
          <span className="text-gray-300">/</span>
          <Link href={orgTabHref(org.id, query, "sites")} className="hover:text-saveful-green">
            {org.name}
          </Link>
          <span className="text-gray-300">/</span>
          <Link href={`/admin/sites${context}`} className="hover:text-saveful-green">
            Sites
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-700">{site.name}</span>
        </nav>

        <section className="overflow-hidden rounded-2xl border border-black/[0.05] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <header className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-saveful-bold text-xl leading-none text-gray-900 sm:text-2xl">{site.name}</h1>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F7F6F2] px-2 py-0.5 font-saveful text-[11px] text-gray-700">
                  <span className={cn("h-1.5 w-1.5 rounded-full", directory.siteStatus === "active" ? "bg-saveful-green" : "bg-gray-400")} />
                  {directory.siteStatus === "active" ? "Active" : "Deactivated"}
                </span>
                <span className="inline-flex items-center rounded-full bg-saveful-green/10 px-2 py-0.5 font-saveful text-[11px] text-saveful-green">
                  {PARTICIPATION_COPY[model.participation]}
                </span>
              </div>
              <p className="mt-1.5 truncate font-saveful text-xs text-gray-500">
                {directory.groupLabel} · {directory.territoryLabel} · {directory.clusterLabel}
                <span className="text-gray-300"> · </span>
                {directory.siteCode}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {tab === "overview" ? (
                <select
                  value={period}
                  onChange={(event) => setPeriod(event.target.value as PeriodKey)}
                  className="h-9 rounded-lg border border-black/[0.06] bg-[#F7F6F2] px-2.5 font-saveful text-sm outline-none focus:border-saveful-green/40"
                >
                  {PERIODS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              ) : null}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/[0.06] text-gray-600 hover:bg-[#F7F6F2]"
                  aria-label="Site actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {menuOpen ? (
                  <div className="absolute right-0 z-30 mt-1 w-48 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-lg">
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left font-saveful text-sm hover:bg-[#F7F6F2]"
                      onClick={() => {
                        setMenuOpen(false);
                        setTab("access");
                      }}
                    >
                      Manage access
                    </button>
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left font-saveful text-sm hover:bg-[#F7F6F2]"
                      onClick={() => {
                        updateSiteStatus(site.id, directory.siteStatus === "deactivated" ? "active" : "deactivated", {
                          name: user?.name ?? "Saveful Admin",
                          email: user?.email ?? "",
                        });
                        setMenuOpen(false);
                      }}
                    >
                      {directory.siteStatus === "deactivated" ? "Reactivate site" : "Deactivate site"}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <div className="flex gap-5 overflow-x-auto border-b border-gray-100 px-4 sm:px-5">
            {SITE_TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "-mb-px border-b-2 py-2.5 font-saveful-semibold text-sm whitespace-nowrap transition",
                  tab === item.id ? "border-saveful-green text-gray-900" : "border-transparent text-gray-500 hover:text-gray-800",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-5">
            {tab === "overview" ? (
              <OverviewTab model={model} period={period} query={context} onViewActivity={() => setTab("activity")} />
            ) : null}
            {tab === "activity" ? <ActivityTab model={model} query={context} /> : null}
            {tab === "insights" ? <InsightsTab siteId={site.id} query={query} /> : null}
            {tab === "access" ? <AccessTab model={model} /> : null}
          </div>
        </section>
      </PortalPageShell>
    </AdminPortalShell>
  );
}

function OverviewTab({
  model,
  period,
  query,
  onViewActivity,
}: {
  model: NonNullable<ReturnType<typeof buildSiteDetail>>;
  period: PeriodKey;
  query: string;
  onViewActivity: () => void;
}) {
  const { site, org, impact, pathways, recent, ops, directory } = model;
  const metrics = [
    { label: "Food recovered", value: formatKg(impact.foodKg) },
    { label: "Meals created", value: formatCount(impact.mealsCreated) },
    { label: "CO₂ avoided", value: formatKg(impact.co2AvoidedKg) },
    { label: "Food value", value: formatMoney(impact.foodValue) },
    { label: "Collections", value: formatCount(impact.collections) },
    { label: "Organisations", value: formatCount(impact.organisations) },
  ];
  const details = [
    { label: "Address", value: site.address },
    { label: "Primary contact", value: ops.primaryContact },
    { label: "Site admin", value: ops.siteAdmin },
    { label: "Availability", value: ops.collectionHours },
    { label: "Instructions", value: ops.collectionInstructions },
    ...(ops.phone ? [{ label: "Phone", value: ops.phone }] : []),
  ];

  return (
    <div className="space-y-4">
      <OverviewSection title="Site impact" hint={periodLabel(period)}>
        <div className="grid grid-cols-2 gap-px bg-gray-100 sm:grid-cols-3 xl:grid-cols-6">
          {metrics.map((metric) => (
            <div key={metric.label} className="bg-white px-3 py-3 first:rounded-none">
              <p className="font-saveful-bold text-[1.05rem] tabular-nums leading-none text-gray-900">{metric.value}</p>
              <p className="mt-1.5 font-saveful text-[11px] text-gray-500">{metric.label}</p>
            </div>
          ))}
        </div>
      </OverviewSection>

      <div className="grid gap-4 lg:grid-cols-12">
        <OverviewSection title="Site details" className="lg:col-span-5">
          <dl className="divide-y divide-gray-100 px-3.5">
            {details.map((item) => (
              <div key={item.label} className="grid grid-cols-[7.25rem_1fr] gap-3 py-2.5">
                <dt className="font-saveful text-xs text-gray-500">{item.label}</dt>
                <dd className="font-saveful text-sm leading-snug text-gray-900">{item.value}</dd>
              </div>
            ))}
          </dl>
        </OverviewSection>
        <OverviewSection title="Recovery pathways" hint={periodLabel(period)} className="lg:col-span-7">
          <div className="px-3.5 pb-3.5 pt-1">
            {pathways.some((item) => item.kg > 0) ? (
              <div className="space-y-3">
                {pathways.map((item) => (
                  <div key={item.pathway}>
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <p className="font-saveful text-sm text-gray-700">{item.label}</p>
                      <p className="font-saveful-semibold text-xs tabular-nums text-gray-900">
                        {formatKg(item.kg)} · {item.percent}%
                      </p>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#F0EEE8]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(item.percent, item.kg > 0 ? 3 : 0)}%`,
                          background: PATHWAY_BAR[item.pathway] ?? item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
                <p className="pt-1 font-saveful text-xs text-gray-500">Total recovered {formatKg(impact.foodKg)}</p>
              </div>
            ) : (
              <p className="font-saveful text-sm text-gray-500">No recovery in this period.</p>
            )}
          </div>
        </OverviewSection>
      </div>

      <OverviewSection
        title="Recent activity"
        action={
          <button type="button" onClick={onViewActivity} className="font-saveful-semibold text-xs text-saveful-green hover:underline">
            View all
          </button>
        }
      >
        {recent.length ? (
          <>
            <div className="hidden overflow-x-auto px-3.5 pb-2 md:block">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 font-saveful text-[11px] uppercase tracking-wide text-gray-400">
                    <th className="pb-2 pr-3 font-saveful">Date</th>
                    <th className="pb-2 pr-3 font-saveful">Activity</th>
                    <th className="pb-2 pr-3 font-saveful">Food</th>
                    <th className="pb-2 pr-3 font-saveful">Qty</th>
                    <th className="pb-2 pr-3 font-saveful">Recipient</th>
                    <th className="pb-2 font-saveful">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((row) => (
                    <tr key={row.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 pr-3 font-saveful text-sm text-gray-600">{row.date}</td>
                      <td className="py-2 pr-3 font-saveful text-sm text-gray-800">{row.activity}</td>
                      <td className="py-2 pr-3 font-saveful text-sm text-gray-800">{row.food}</td>
                      <td className="py-2 pr-3 font-saveful text-sm tabular-nums text-gray-800">{row.quantity}</td>
                      <td className="py-2 pr-3 font-saveful text-sm text-gray-800">{row.recipient}</td>
                      <td className="py-2">
                        <Link href={withQuery(row.href, query)} className="hover:underline">
                          <StatusBadge tone={row.status === "Completed" ? "green" : "blue"}>{row.status}</StatusBadge>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-gray-100 px-3.5 md:hidden">
              {recent.map((row) => (
                <Link key={row.id} href={withQuery(row.href, query)} className="flex items-start justify-between gap-3 py-2.5">
                  <div>
                    <p className="font-saveful-semibold text-sm text-gray-900">{row.food}</p>
                    <p className="mt-0.5 font-saveful text-xs text-gray-500">
                      {row.date} · {row.quantity} · {row.recipient}
                    </p>
                  </div>
                  <StatusBadge tone={row.status === "Completed" ? "green" : "blue"}>{row.status}</StatusBadge>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <p className="px-3.5 pb-3.5 font-saveful text-sm text-gray-500">No recovery activity in this period.</p>
        )}
      </OverviewSection>

      <AdminSection
        title="Saveful support"
        action={<span className="rounded-full bg-saveful-green/10 px-2 py-0.5 font-saveful text-[10px] uppercase tracking-wide text-saveful-green">Saveful only</span>}
      >
        <div className="grid gap-4 px-3.5 py-3 lg:grid-cols-3">
          <dl className="space-y-2">
            <SupportRow label="Parent organisation" value={org.name} href={orgTabHref(org.id, query, "sites")} />
            <SupportRow label="Organisation type" value={orgTypeLabel(org.type)} />
            <SupportRow label="Participation role" value={participationLabel(org.roles)} />
            <div className="flex items-center justify-between gap-3">
              <dt className="font-saveful text-sm text-gray-500">Account status</dt>
              <StatusPill status={org.status} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="font-saveful text-sm text-gray-500">Site status</dt>
              <StatusPill status={directory.siteStatus === "active" ? "Active" : "Deactivated"} />
            </div>
          </dl>
          <dl className="space-y-2">
            <SupportRow label="Created" value={formatDisplayDate(model.createdAt)} />
            <SupportRow label="Last activity" value={model.lastActivityAt ? formatLastActivity(model.lastActivityAt) : "Never"} />
            <SupportRow label="Last login / site users" value={model.lastUserActivityAt ? formatLastActivity(model.lastUserActivityAt) : "—"} />
            <SupportRow label="Site ID" value={directory.siteCode} />
            <SupportRow label="Activity status" value={ACTIVITY_LABEL[directory.activity]} />
          </dl>
          <div>
            <p className="mb-2 font-saveful-semibold text-xs uppercase tracking-[0.12em] text-gray-400">Notifications / system events</p>
            {model.notifications.length ? (
              <ul className="space-y-1.5">
                {model.notifications.map((item) => (
                  <li key={item} className="font-saveful text-sm text-gray-700">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="font-saveful text-sm text-gray-400">No open system events.</p>
            )}
            <p className="mb-2 mt-4 font-saveful-semibold text-xs uppercase tracking-[0.12em] text-gray-400">Support & audit</p>
            {model.audit.length ? (
              <ul className="space-y-1.5">
                {model.audit.slice(0, 3).map((row) => (
                  <li key={row.id} className="font-saveful text-sm text-gray-700">
                    {row.action} · {formatDisplayDate(row.at.slice(0, 10))}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="font-saveful text-sm text-gray-400">No Saveful Admin changes on this site yet.</p>
            )}
            <Link href={withQuery("/admin/audit", query)} className="mt-2 inline-block font-saveful-semibold text-xs text-saveful-green hover:underline">
              View admin audit
            </Link>
          </div>
        </div>
      </AdminSection>
    </div>
  );
}

function ActivityTab({ model, query }: { model: NonNullable<ReturnType<typeof buildSiteDetail>>; query: string }) {
  if (!model.activityFeed.length) {
    return <p className="font-saveful text-sm text-gray-500">No activity recorded for this site yet.</p>;
  }

  return (
    <div className="divide-y divide-gray-100">
      {model.activityFeed.map((item) => (
        <article key={item.id} className="py-3 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={ACTIVITY_TONE[item.type as keyof typeof ACTIVITY_TONE] ?? "slate"}>{item.type}</StatusBadge>
            <span className="font-saveful text-xs text-gray-500">{item.time}</span>
          </div>
          <Link href={withQuery(item.href, query)} className="mt-1 block font-saveful-semibold text-sm text-gray-900 hover:text-saveful-green">
            {item.title}
          </Link>
          <p className="mt-0.5 font-saveful text-sm text-gray-600">{item.body}</p>
        </article>
      ))}
    </div>
  );
}

function InsightsTab({ siteId, query }: { siteId: string; query: string }) {
  const [period, setPeriod] = useState<PeriodKey>("30");
  const [pathway, setPathway] = useState<"all" | RecoveryPathway>("all");
  const [metric, setMetric] = useState<InsightsMetric>("food");
  const [foodId, setFoodId] = useState("all");
  const [recipientId, setRecipientId] = useState("all");
  const [showAllFoods, setShowAllFoods] = useState(false);
  const [showAllOrgs, setShowAllOrgs] = useState(false);
  const model = buildSiteDetail(siteId, period);
  if (!model) return null;

  const activePathways = model.pathways.filter((item) => item.kg > 0);
  const foods = foodId === "all" ? model.foods : model.foods.filter((item) => item.id === foodId);
  const orgs = recipientId === "all" ? model.organisations : model.organisations.filter((item) => item.id === recipientId);
  const foodKg = foods.reduce((sum, item) => sum + item.kg, 0);
  const impact = calculateImpact(foodKg || (pathway === "all" && foodId === "all" && recipientId === "all" ? model.impact.foodKg : foods.reduce((sum, item) => sum + item.kg, 0)));
  const collections =
    foodId === "all" && recipientId === "all" && pathway === "all"
      ? model.impact.collections
      : foods.reduce((sum, item) => sum + item.collections, 0);
  const organisations =
    foodId === "all" && recipientId === "all" && pathway === "all" ? model.impact.organisations : orgs.length;
  const displayImpact =
    pathway === "all" && foodId === "all" && recipientId === "all"
      ? model.impact
      : {
          foodKg: foodKg,
          mealsCreated: impact.mealsCreated,
          co2AvoidedKg: impact.co2AvoidedKg,
          foodValue: impact.foodValue,
          collections,
          organisations,
        };
  const series = model.series.map((point) => ({
    ...point,
    value: seriesValue(point.kg, point.collections, metric),
  }));
  const metricLabel = INSIGHTS_METRICS.find((item) => item.id === metric)?.label ?? "Food recovered";
  const visibleFoods = showAllFoods ? foods : foods.slice(0, 5);
  const visibleOrgs = showAllOrgs ? orgs : orgs.slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value as PeriodKey)}
            className="h-9 rounded-lg border border-black/[0.06] bg-[#F7F6F2] px-2.5 font-saveful text-sm outline-none focus:border-saveful-green/40"
          >
            {PERIODS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <select
            value={pathway}
            onChange={(event) => setPathway(event.target.value as "all" | RecoveryPathway)}
            className="h-9 rounded-lg border border-black/[0.06] bg-[#F7F6F2] px-2.5 font-saveful text-sm outline-none focus:border-saveful-green/40"
          >
            <option value="all">All pathways</option>
            {INSIGHTS_PATHWAYS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <Link href={`/admin/insights${query}`} className="font-saveful-semibold text-xs text-saveful-green hover:underline">
          Open platform Insights
        </Link>
      </div>

      {(foodId !== "all" || recipientId !== "all" || pathway !== "all") && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-saveful-green/20 bg-saveful-green/[0.04] px-3.5 py-2.5">
          <p className="font-saveful text-xs text-gray-600">
            Showing
            {pathway !== "all" ? ` ${model.pathways.find((item) => item.pathway === pathway)?.label}` : ""}
            {foodId !== "all" ? ` · ${model.foods.find((item) => item.id === foodId)?.name}` : ""}
            {recipientId !== "all" ? ` · ${model.organisations.find((item) => item.id === recipientId)?.name}` : ""}
          </p>
          <button
            type="button"
            onClick={() => {
              setPathway("all");
              setFoodId("all");
              setRecipientId("all");
            }}
            className="font-saveful-semibold text-xs text-saveful-green hover:underline"
          >
            Clear drill-down
          </button>
        </div>
      )}

      <OverviewSection title="Impact" hint={periodLabel(period)}>
        <div className="grid grid-cols-2 gap-px bg-gray-100 sm:grid-cols-3 xl:grid-cols-6">
          <MetricCell label="Food recovered" value={formatKg(displayImpact.foodKg)} />
          <MetricCell label="Meals created" value={formatCount(displayImpact.mealsCreated)} />
          <MetricCell label="CO₂ avoided" value={formatKg(displayImpact.co2AvoidedKg)} />
          <MetricCell label="Estimated food value" value={formatMoney(displayImpact.foodValue)} />
          <MetricCell label="Completed collections" value={formatCount(displayImpact.collections)} />
          <MetricCell label="Organisations supported" value={formatCount(displayImpact.organisations)} />
        </div>
      </OverviewSection>

      <div className="grid gap-4">
        <OverviewSection
          title="Recovery pathways"
          hint={pathway === "all" ? "Click a pathway to filter" : model.pathways.find((item) => item.pathway === pathway)?.label}
          action={
            pathway !== "all" ? (
              <button type="button" onClick={() => setPathway("all")} className="font-saveful-semibold text-xs text-saveful-green hover:underline">
                Show all
              </button>
            ) : null
          }
        >
          <div className="px-3.5 pb-3.5 pt-2">
            {activePathways.length ? (
              <>
                <div className="mx-auto h-40 w-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={activePathways} dataKey="kg" nameKey="label" innerRadius={42} outerRadius={64} paddingAngle={2}>
                        {activePathways.map((item) => (
                          <Cell
                            key={item.pathway}
                            fill={PATHWAY_COLORS[item.pathway]}
                            opacity={pathway === "all" || pathway === item.pathway ? 1 : 0.35}
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
                      onClick={() => setPathway("all")}
                      className={cn("flex w-full items-center justify-between gap-3 rounded-lg px-1 py-1 text-left hover:bg-[#FAF7F0]", pathway === "all" && "bg-saveful-green/[0.06]")}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="h-2 w-2 shrink-0 rounded-full bg-gray-400" />
                        <span className="truncate font-saveful text-sm text-gray-700">All pathways</span>
                      </span>
                      <span className="shrink-0 font-saveful text-xs tabular-nums text-gray-500">{formatKg(model.pathways.reduce((sum, item) => sum + item.kg, 0))}</span>
                    </button>
                  </li>
                  {model.pathways.map((item) => (
                    <li key={item.pathway}>
                      <button
                        type="button"
                        onClick={() => setPathway(pathway === item.pathway ? "all" : item.pathway)}
                        className={cn("flex w-full items-center justify-between gap-3 rounded-lg px-1 py-1 text-left hover:bg-[#FAF7F0]", pathway === item.pathway && "bg-saveful-green/[0.06]")}
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
        </OverviewSection>

        <OverviewSection
          title="Impact over time"
          action={
            <select
              value={metric}
              onChange={(event) => setMetric(event.target.value as InsightsMetric)}
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
              <LineChart data={series} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="#EFEDE6" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={48} />
                <Tooltip contentStyle={CHART_TOOLTIP} formatter={(value) => [formatSeriesValue(Number(value), metric), metricLabel]} />
                <Line type="monotone" dataKey="value" stroke={CHART_COLORS.green} strokeWidth={2.25} dot={{ r: 3, fill: CHART_COLORS.green }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </OverviewSection>

        <OverviewSection title="Food insights" hint="Most recovered food">
          <div className="overflow-x-auto px-3.5 pb-2">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 font-saveful text-[11px] uppercase tracking-wide text-gray-400">
                  <th className="pb-2 pr-3 font-saveful">Food</th>
                  <th className="pb-2 pr-3 font-saveful">Kg</th>
                  <th className="pb-2 font-saveful">Share</th>
                </tr>
              </thead>
              <tbody>
                {visibleFoods.map((row) => (
                  <tr key={row.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 pr-3">
                      <button type="button" onClick={() => setFoodId(foodId === row.id ? "all" : row.id)} className="text-left font-saveful text-sm text-gray-800 hover:text-saveful-green">
                        {row.name}
                      </button>
                    </td>
                    <td className="py-2 pr-3 font-saveful text-sm tabular-nums text-gray-800">{formatKg(row.kg)}</td>
                    <td className="py-2 font-saveful text-sm tabular-nums text-gray-600">{row.percent}%</td>
                  </tr>
                ))}
                {foods.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 font-saveful text-sm text-gray-500">
                      No food recovered in this period.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            {foods.length > 5 ? (
              <button type="button" onClick={() => setShowAllFoods((value) => !value)} className="py-2 font-saveful-semibold text-xs text-saveful-green hover:underline">
                {showAllFoods ? "Show fewer" : "Show all"}
              </button>
            ) : null}
          </div>
        </OverviewSection>
      </div>

      <OverviewSection title="Organisations supported" hint="Who received recovered food and resources">
        <div className="overflow-x-auto px-3.5 pb-2">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 font-saveful text-[11px] uppercase tracking-wide text-gray-400">
                <th className="pb-2 pr-3 font-saveful">Organisation</th>
                <th className="pb-2 pr-3 font-saveful">Kg</th>
                <th className="pb-2 font-saveful">Share</th>
              </tr>
            </thead>
            <tbody>
              {visibleOrgs.map((row) => (
                <tr key={row.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 pr-3">
                    <button type="button" onClick={() => setRecipientId(recipientId === row.id ? "all" : row.id)} className="text-left font-saveful text-sm text-gray-800 hover:text-saveful-green">
                      {row.name}
                    </button>
                  </td>
                  <td className="py-2 pr-3 font-saveful text-sm tabular-nums text-gray-800">{formatKg(row.kg)}</td>
                  <td className="py-2 font-saveful text-sm tabular-nums text-gray-600">{row.percent}%</td>
                </tr>
              ))}
              {orgs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-6 font-saveful text-sm text-gray-500">
                    No receiving organisations in this period.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          {orgs.length > 5 ? (
            <button type="button" onClick={() => setShowAllOrgs((value) => !value)} className="py-2 font-saveful-semibold text-xs text-saveful-green hover:underline">
              {showAllOrgs ? "Show fewer" : "Show all"}
            </button>
          ) : null}
        </div>
      </OverviewSection>

      <p className="px-1 font-saveful text-[11px] leading-relaxed text-gray-400">
        Impact uses Saveful conversion factors: 1 meal = {IMPACT.MEAL_WEIGHT_KG} kg; CO₂ avoided = {IMPACT.CO2_PER_KG} kg per kg
        food; estimated value = ${IMPACT.FOOD_VALUE_PER_KG} per kg. Dashboard, Insights and generated reports use the same
        recovery data and methodology.
      </p>
    </div>
  );
}

function AccessTab({ model }: { model: NonNullable<ReturnType<typeof buildSiteDetail>> }) {
  const rows = model.users;
  const invited = rows.filter((row) => row.status === "Invited").length;
  const active = rows.filter((row) => row.status === "Active").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-gray-100">
        <CompactStat label="People" value={String(rows.length)} />
        <CompactStat label="Active" value={String(active)} muted />
        <CompactStat label="Invited" value={String(invited)} />
      </div>
      <div>
        <p className="mb-2 font-saveful-semibold text-xs uppercase tracking-[0.14em] text-gray-400">Directory</p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 font-saveful text-[11px] uppercase tracking-wide text-gray-400">
                <th className="pb-2 pr-4 font-saveful">User</th>
                <th className="pb-2 pr-4 font-saveful">Role</th>
                <th className="pb-2 pr-4 font-saveful">Scope</th>
                <th className="pb-2 font-saveful">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 pr-4">
                    <p className="font-saveful-semibold text-sm text-gray-900">{row.name}</p>
                    <p className="font-saveful text-xs text-gray-500">{row.email}</p>
                  </td>
                  <td className="py-2 pr-4 font-saveful text-sm text-gray-700">{row.role}</td>
                  <td className="py-2 pr-4 font-saveful text-sm text-gray-600">{row.scope}</td>
                  <td className="py-2">
                    <p className="font-saveful text-sm text-gray-800">{row.status}</p>
                    <p className="font-saveful text-[11px] text-gray-400">
                      {row.status === "Invited" ? "Invitation sent" : row.lastActiveAt ? formatLastActivity(row.lastActiveAt) : "—"}
                    </p>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center font-saveful text-sm text-gray-500">
                    No users on this site.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function OverviewSection({
  title,
  hint,
  action,
  children,
  className,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-xl border border-gray-200 bg-white", className)}>
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

function CompactStat({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={cn("px-3 py-2.5", muted && "bg-[#FAF9F6]")}>
      <p className="font-saveful-bold text-lg tabular-nums leading-none text-gray-900">{value}</p>
      <p className="mt-1 font-saveful text-[11px] text-gray-500">{label}</p>
    </div>
  );
}

function SupportRow({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="font-saveful text-sm text-gray-500">{label}</dt>
      {href ? (
        <Link href={href} className="truncate font-saveful-semibold text-sm text-saveful-green hover:underline">
          {value}
        </Link>
      ) : (
        <dd className="truncate font-saveful-semibold text-sm text-gray-900">{value}</dd>
      )}
    </div>
  );
}
