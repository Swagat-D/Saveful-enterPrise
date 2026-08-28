"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  ChevronDown,
  Cloud,
  Download,
  Heart,
  Leaf,
  Recycle,
  Truck,
  Users,
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
import { AdminPortalShell } from "@/components/layout/AdminPortalShell";
import { AdminSection, StatusPill, TablePager, useAdminFilters, type PageSize } from "@/components/admin/AdminChrome";
import { AdminOrgSitesTable } from "@/components/admin/AdminSites";
import { PortalPageShell } from "@/components/ui/Portal";
import {
  ORG_DETAIL_TABS,
  buildOrgDetail,
  orgTypeLabel,
  parseOrgDetailTab,
  participationLabel,
  planLabel,
  refreshOrganisationDetail,
  updateOrganisation,
  useAdminVersion,
  type OrgDetailTab,
  type OrgTypeId,
} from "@/lib/admin";
import { listAdminAudit, useAdminAuditVersion } from "@/lib/adminAudit";
import { useSession } from "@/lib/auth";
import { CHART_TOOLTIP } from "@/lib/demo";
import { formatDisplayDate } from "@/lib/dates";
import { formatCount, formatKg, formatMoney } from "@/lib/impact";
import type { PeriodKey } from "@/types/enterprise";
import { cn } from "@/lib/utils";

const PERIODS: { id: PeriodKey; label: string }[] = [
  { id: "7", label: "7 days" },
  { id: "30", label: "30 days" },
  { id: "90", label: "90 days" },
  { id: "all", label: "All time" },
];

export function AdminOrganisationDetail({ id }: { id: string }) {
  const user = useSession();
  useAdminVersion();
  useAdminAuditVersion();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { query, filters } = useAdminFilters();
  const tab = parseOrgDetailTab(searchParams.get("tab"));
  const [period, setPeriod] = useState<PeriodKey>("30");
  const [menuOpen, setMenuOpen] = useState(false);
  const model = buildOrgDetail(id, period);

  useEffect(() => {
    void refreshOrganisationDetail(id).catch(() => undefined);
  }, [id]);

  const setTab = (next: OrgDetailTab) => {
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
          <p className="font-saveful text-sm text-gray-500">This organisation was not found.</p>
        </PortalPageShell>
      </AdminPortalShell>
    );
  }

  const { org, profile } = model;
  const orgQuery = withTab(query, tab, org.id);
  const Icon = orgIcon(org.type);

  return (
    <AdminPortalShell>
      <PortalPageShell className="!space-y-3 sm:!space-y-3">
        <nav className="flex flex-wrap items-center gap-1.5 font-saveful text-xs text-gray-500">
          <Link href={`/admin/organisations${query}`} className="hover:text-saveful-green">
            Organisations
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-700">{org.name}</span>
        </nav>

        <section className="overflow-hidden rounded-2xl border border-black/[0.05] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <header className="border-b border-gray-100 px-4 py-3.5 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full", orgIconTone(org.type))}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate font-saveful-bold text-xl leading-none text-gray-900">{org.name}</h1>
                    <StatusPill status={org.status} />
                  </div>
                  <p className="mt-1.5 truncate font-saveful text-xs text-gray-500">
                    {orgTypeLabel(org.type)} · {participationLabel(org.roles)}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((open) => !open)}
                    className="inline-flex h-9 items-center gap-1 rounded-lg bg-saveful-green px-3 font-saveful-semibold text-sm text-white"
                  >
                    Actions
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  {menuOpen ? (
                    <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                      <Link href={`/admin/sites/new${query}${query ? "&" : "?"}organisationId=${org.id}`} className="block px-3 py-2 font-saveful text-sm text-gray-800 hover:bg-[#F7F6F2]" onClick={() => setMenuOpen(false)}>
                        Add site
                      </Link>
                      <button type="button" className="block w-full px-3 py-2 text-left font-saveful text-sm hover:bg-[#F7F6F2]" onClick={() => { setMenuOpen(false); setTab("account"); }}>
                        Edit account
                      </button>
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left font-saveful text-sm hover:bg-[#F7F6F2]"
                        onClick={() => {
                          updateOrganisation(org.id, { status: org.status === "Suspended" ? "Active" : "Suspended" }, { name: user?.name ?? "Saveful Admin", email: user?.email ?? "" });
                          setMenuOpen(false);
                        }}
                      >
                        {org.status === "Suspended" ? "Reactivate account" : "Suspend account"}
                      </button>
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => exportOrg(model)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-black/[0.06] bg-white px-3 font-saveful-semibold text-sm text-gray-800 hover:bg-[#F7F6F2]"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export
                </button>
              </div>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-7">
              <Meta label="Enterprise ID" value={profile.code} />
              <Meta label="Primary contact" value={profile.contactName} />
              <Meta label="Email" value={profile.contactEmail} />
              <Meta label="Phone" value={profile.contactPhone} />
              <Meta label="Territory" value={`${org.state}, ${org.country}`} />
              <Meta label="Joined" value={formatDisplayDate(profile.joinedAt)} />
              <Meta label="Last activity" value={model.lastActivityAt ? formatDisplayDate(model.lastActivityAt.slice(0, 10)) : "—"} />
            </dl>
          </header>

          <div className="flex gap-5 overflow-x-auto border-b border-gray-100 px-4 sm:px-5">
            {ORG_DETAIL_TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "-mb-px border-b-2 py-2.5 font-saveful-semibold text-sm whitespace-nowrap",
                  tab === item.id ? "border-saveful-green text-saveful-green" : "border-transparent text-gray-500 hover:text-gray-800",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="space-y-3 p-4 sm:p-5">
            {tab === "overview" ? (
              <OverviewTab model={model} query={orgQuery} period={period} onPeriod={setPeriod} onTab={setTab} />
            ) : null}
            {tab === "sites" ? <AdminOrgSitesTable orgId={org.id} query={orgQuery} period={period} /> : null}
            {tab === "users" ? (
              <RecordTable
                columns={["Name", "Email", "Role", "Status"]}
                rows={model.users.map((row) => [row.name, row.email, row.role, <StatusPill key={row.id} status={row.status} />])}
                empty="No users."
                noun="users"
              />
            ) : null}
            {tab === "listings" ? (
              <RecordTable
                columns={["Listing", "Food", "Site", "Status"]}
                rows={model.listings.map((row) => [
                  <Link key={row.id} href={`/admin/listings/${row.id}${orgQuery}`} className="font-saveful-semibold text-sm text-saveful-green hover:underline">{row.code}</Link>,
                  row.food,
                  model.sites.find((site) => site.id === row.siteId)?.name ?? row.siteId,
                  <StatusPill key={`${row.id}-s`} status={row.status} />,
                ])}
                empty="No listings."
                noun="listings"
              />
            ) : null}
            {tab === "collections" ? (
              <RecordTable
                columns={["Collection", "Food", "Recipient", "Kg", "Status"]}
                rows={model.collections.map((row) => [
                  <Link key={row.id} href={`/admin/collections/${row.id}${orgQuery}`} className="font-saveful-semibold text-sm text-saveful-green hover:underline">{row.code}</Link>,
                  row.food,
                  row.recipientName,
                  formatKg(row.quantityKg),
                  <StatusPill key={`${row.id}-s`} status={row.status} />,
                ])}
                empty="No collections."
                noun="collections"
              />
            ) : null}
            {tab === "insights" ? <InsightsTab model={model} /> : null}
            {tab === "account" ? (
              <AccountTab
                orgName={org.name}
                typeLabel={orgTypeLabel(org.type)}
                roleLabel={participationLabel(org.roles)}
                status={org.status}
                profile={profile}
                plan={planLabel(org.plan)}
                activityStatus={model.activityStatus}
              />
            ) : null}
            {tab === "audit" ? (
              <AuditTab orgId={org.id} period={filters.period} query={query} />
            ) : null}
          </div>
        </section>
      </PortalPageShell>
    </AdminPortalShell>
  );
}

function OverviewTab({
  model,
  query,
  period,
  onPeriod,
  onTab,
}: {
  model: NonNullable<ReturnType<typeof buildOrgDetail>>;
  query: string;
  period: PeriodKey;
  onPeriod: (period: PeriodKey) => void;
  onTab: (tab: OrgDetailTab) => void;
}) {
  const { headlines, allTime, relationships, priorLabel } = model;
  const [chartMetric, setChartMetric] = useState<"collections" | "kg">("collections");
  const periodHint = period === "all" ? "all time" : `${period} days`;
  const cards = [
    { label: "Sites", value: formatCount(headlines.sites), hint: `${formatCount(headlines.activeSites)} active`, icon: Building2, tone: "bg-saveful-green/10 text-saveful-green" },
    { label: "Users", value: formatCount(headlines.users), hint: `${formatCount(headlines.activeUsers)} active`, icon: Users, tone: "bg-sky-50 text-sky-700" },
    { label: `Collections (${periodHint})`, value: formatCount(headlines.collections), hint: `${signed(headlines.collectionsDelta)} vs ${priorLabel}`, icon: Truck, tone: "bg-saveful-green/10 text-saveful-green" },
    { label: "Food recovered", value: formatKg(headlines.recoveredKg), hint: `${signed(Math.round(headlines.recoveredDelta))} kg vs ${priorLabel}`, icon: Leaf, tone: "bg-violet-50 text-violet-700" },
    { label: "CO₂ avoided", value: formatKg(headlines.co2), hint: `${signed(Math.round(headlines.co2Delta))} kg vs ${priorLabel}`, icon: Cloud, tone: "bg-sky-50 text-sky-700" },
    { label: "Meals provided", value: formatCount(headlines.meals), hint: `${signed(Math.round(headlines.mealsDelta))} vs ${priorLabel}`, icon: UtensilsCrossed, tone: "bg-orange-50 text-orange-700" },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className="rounded-xl border border-gray-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="truncate font-saveful text-[11px] uppercase tracking-[0.12em] text-gray-500">{card.label}</p>
                <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-lg", card.tone)}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
              </div>
              <p className="mt-2 font-saveful-bold text-lg tabular-nums leading-none text-gray-900">{card.value}</p>
              <p className="mt-1.5 truncate font-saveful text-[11px] text-gray-500">{card.hint}</p>
            </article>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <AdminSection title="Impact overview (all time)">
          <dl className="space-y-2 px-3.5 py-3">
            <ImpactRow label="Food recovered" value={formatKg(allTime.recoveredKg)} />
            <ImpactRow label="Meals provided" value={formatCount(allTime.meals)} />
            <ImpactRow label="CO₂ avoided" value={formatKg(allTime.co2)} />
            <ImpactRow label="Estimated food value" value={formatMoney(allTime.value)} />
            <ImpactRow label="Total collections" value={formatCount(allTime.collections)} />
            <ImpactRow label="Since joined Saveful" value={formatDisplayDate(model.profile.joinedAt)} />
          </dl>
        </AdminSection>
        <AdminSection title="Collections over time">
          <div className="flex items-center justify-between gap-2 px-3.5 pt-3">
            <select
              value={chartMetric}
              onChange={(event) => setChartMetric(event.target.value as "collections" | "kg")}
              className="h-8 min-w-0 max-w-[160px] truncate rounded-lg border border-black/[0.06] bg-[#F7F6F2] px-2 font-saveful text-xs outline-none"
            >
              <option value="collections">Collections</option>
              <option value="kg">Food recovered (kg)</option>
            </select>
            <select
              value={period}
              onChange={(event) => onPeriod(event.target.value as PeriodKey)}
              className="h-8 rounded-lg border border-black/[0.06] bg-[#F7F6F2] px-2 font-saveful text-xs outline-none"
            >
              {PERIODS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className="h-48 px-2 pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={model.series} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="#EFEDE6" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={40} />
                <Tooltip
                  contentStyle={CHART_TOOLTIP}
                  formatter={(value) => [chartMetric === "kg" ? formatKg(Number(value)) : formatCount(Number(value)), chartMetric === "kg" ? "Recovered" : "Collections"]}
                />
                <Line type="monotone" dataKey={chartMetric} stroke="#2D5F4F" strokeWidth={2} dot={{ r: 3, fill: "#2D5F4F" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </AdminSection>
        <AdminSection title="Recovery by pathway" action={<button type="button" onClick={() => onTab("insights")} className="font-saveful-semibold text-xs text-saveful-green hover:underline">View insights →</button>}>
          <div className="px-3.5 pt-3">
            <div className="relative mx-auto h-28 w-28">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={model.pathways.filter((item) => item.kg > 0)} dataKey="kg" nameKey="label" innerRadius={32} outerRadius={46} paddingAngle={2}>
                    {model.pathways.filter((item) => item.kg > 0).map((item) => (
                      <Cell key={item.pathway} fill={item.color} stroke="#fff" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP} formatter={(value) => formatKg(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <PathwayLegend rows={model.pathways} />
        </AdminSection>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <AdminSection title="Who we work with">
          <div className="px-3.5 py-3">
            <p className="mb-3 font-saveful text-sm text-gray-600">{relationshipCopy(relationships)}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {relationships.isReceiver ? (
                <PartnerList title="Top provider organisations" rows={relationships.providers} query={query} />
              ) : null}
              {relationships.isProvider ? (
                <PartnerList title="Top receiving organisations" rows={relationships.receivers} query={query} />
              ) : null}
              <PartnerList
                title={relationships.isReceiver ? "Top receiving sites" : "Top providing sites"}
                rows={relationships.ownSites}
                href={(id) => `/admin/sites/${id}${query}`}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
              {relationships.isReceiver ? (
                <button type="button" onClick={() => onTab("collections")} className="font-saveful-semibold text-xs text-saveful-green hover:underline">
                  View all providers →
                </button>
              ) : null}
              {relationships.isProvider ? (
                <button type="button" onClick={() => onTab("collections")} className="font-saveful-semibold text-xs text-saveful-green hover:underline">
                  View all receivers →
                </button>
              ) : null}
              <button type="button" onClick={() => onTab("sites")} className="font-saveful-semibold text-xs text-saveful-green hover:underline">
                View all sites →
              </button>
            </div>
          </div>
        </AdminSection>
        <AdminSection title="Account & status" action={<button type="button" onClick={() => onTab("account")} className="font-saveful-semibold text-xs text-saveful-green hover:underline">View account →</button>}>
          <dl className="space-y-2 px-3.5 py-3">
            <div className="flex items-center justify-between gap-3">
              <dt className="font-saveful text-sm text-gray-500">Account status</dt>
              <StatusPill status={model.org.status} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="font-saveful text-sm text-gray-500">Activity status</dt>
              <StatusPill status={model.activityStatus} />
            </div>
            <ImpactRow label="Plan" value={planLabel(model.org.plan)} />
            <ImpactRow label="Contract start" value={formatDisplayDate(model.profile.contractStart)} />
            <ImpactRow label="Next review" value={formatDisplayDate(model.profile.nextReview)} />
            <ImpactRow label="Billing" value={model.profile.billing} />
          </dl>
        </AdminSection>
        <AdminSection title="Recent activity" action={<button type="button" onClick={() => onTab("audit")} className="font-saveful-semibold text-xs text-saveful-green hover:underline">View all activity →</button>}>
          <ul>
            {model.recentActivity.map((item) => (
              <li key={item.id} className="border-b border-gray-50 px-3.5 py-2.5 last:border-0">
                <p className="font-saveful-semibold text-sm text-gray-900">{item.kind}</p>
                <p className="truncate font-saveful text-xs text-gray-500">{item.detail}</p>
                <p className="mt-0.5 font-saveful text-[11px] text-gray-400">{formatDisplayDate(item.at.slice(0, 10))}</p>
              </li>
            ))}
            {model.recentActivity.length === 0 ? (
              <li className="px-3.5 py-6 font-saveful text-sm text-gray-400">No recent activity.</li>
            ) : null}
          </ul>
        </AdminSection>
      </div>
    </div>
  );
}

function InsightsTab({ model }: { model: NonNullable<ReturnType<typeof buildOrgDetail>> }) {
  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      <AdminSection title="Recovery pathways">
        <div className="px-3.5 py-3">
          <div className="relative mx-auto h-40 w-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={model.pathways.filter((item) => item.kg > 0)} dataKey="kg" nameKey="label" innerRadius={46} outerRadius={64} paddingAngle={2}>
                  {model.pathways.filter((item) => item.kg > 0).map((item) => (
                    <Cell key={item.pathway} fill={item.color} stroke="#fff" />
                  ))}
                </Pie>
                <Tooltip contentStyle={CHART_TOOLTIP} formatter={(value) => formatKg(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <PathwayLegend rows={model.pathways} />
        </div>
      </AdminSection>
      <AdminSection title="Impact">
        <dl className="space-y-2 px-3.5 py-3">
          <ImpactRow label="Food recovered" value={formatKg(model.allTime.recoveredKg)} />
          <ImpactRow label="CO₂ avoided" value={formatKg(model.allTime.co2)} />
          <ImpactRow label="Meals provided" value={formatCount(model.allTime.meals)} />
          <ImpactRow label="Estimated food value" value={formatMoney(model.allTime.value)} />
        </dl>
      </AdminSection>
    </div>
  );
}

function AccountTab({
  orgName,
  typeLabel,
  roleLabel,
  status,
  profile,
  plan,
  activityStatus,
}: {
  orgName: string;
  typeLabel: string;
  roleLabel: string;
  status: string;
  profile: ReturnType<typeof buildOrgDetail> extends infer T ? T extends { profile: infer P } ? P : never : never;
  plan: string;
  activityStatus: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      <AdminSection title="Organisation">
        <div className="flex items-start gap-3 border-b border-gray-50 px-3.5 py-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#F7F6F2]">
            {profile.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.logoUrl} alt={`${orgName} logo`} className="h-full w-full object-cover" />
            ) : (
              <Building2 className="h-5 w-5 text-gray-400" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-saveful-semibold text-sm text-gray-900">{orgName}</p>
            <p className="mt-0.5 font-saveful text-xs text-gray-500">{typeLabel} · {roleLabel}</p>
          </div>
        </div>
        <dl className="space-y-2 px-3.5 py-3">
          <ImpactRow label="Enterprise ID" value={profile.code} />
          <ImpactRow label="Address" value={profile.address || "—"} />
          <ImpactRow label="Country" value={profile.country || "—"} />
          <ImpactRow label="Timezone" value={profile.timezone || "—"} />
          <ImpactRow label="Currency" value={profile.currency || "—"} />
          <ImpactRow label="Measurement unit" value={profile.measurementUnit || "—"} />
        </dl>
      </AdminSection>
      <AdminSection title="Account & contract">
        <dl className="space-y-2 px-3.5 py-3">
          <div className="flex items-center justify-between gap-3">
            <dt className="font-saveful text-sm text-gray-500">Account status</dt>
            <StatusPill status={status} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="font-saveful text-sm text-gray-500">Activity status</dt>
            <StatusPill status={activityStatus} />
          </div>
          <ImpactRow label="Plan" value={plan} />
          <ImpactRow label="Primary contact" value={profile.contactName} />
          <ImpactRow label="Email" value={profile.contactEmail} />
          <ImpactRow label="Phone" value={profile.contactPhone} />
          <ImpactRow label="Joined" value={formatDisplayDate(profile.joinedAt)} />
          <ImpactRow label="Contract start" value={formatDisplayDate(profile.contractStart)} />
          <ImpactRow label="Contract end" value={formatDisplayDate(profile.nextReview)} />
          <ImpactRow label="Billing" value={profile.billing} />
        </dl>
      </AdminSection>
    </div>
  );
}

function AuditTab({ orgId, period, query }: { orgId: string; period: PeriodKey; query: string }) {
  const rows = listAdminAudit({ q: "", period, organisationId: orgId, page: 1 });
  return (
    <AdminSection
      title="Support & audit"
      action={<Link href={`/admin/audit${query}`} className="font-saveful-semibold text-xs text-saveful-green hover:underline">View full audit →</Link>}
    >
      <p className="px-3.5 pt-3 font-saveful text-xs text-gray-500">Saveful Admin changes to this organisation. Customer activity stays in listings and collections.</p>
      <RecordTable
        columns={["When", "Action", "Actor", "Change"]}
        rows={rows.map((row) => [
          formatDisplayDate(row.at.slice(0, 10)),
          row.action,
          row.actor,
          row.changes[0] ? `${row.changes[0].previous} → ${row.changes[0].next}` : row.detail,
        ])}
        empty="No admin changes recorded for this organisation."
        noun="entries"
      />
    </AdminSection>
  );
}

function PartnerList({
  title,
  rows,
  query,
  href,
}: {
  title: string;
  rows: { id: string; name: string; collections: number }[];
  query?: string;
  href?: (id: string) => string;
}) {
  return (
    <div>
      <p className="mb-2 font-saveful-semibold text-xs uppercase tracking-[0.12em] text-gray-400">{title}</p>
      <ul className="space-y-1.5">
        {rows.slice(0, 4).map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-3">
            {href || query ? (
              <Link href={href ? href(row.id) : partnerHref(row.id, query)} className="truncate font-saveful text-sm text-saveful-green hover:underline">
                {row.name}
              </Link>
            ) : (
              <span className="truncate font-saveful text-sm text-gray-700">{row.name}</span>
            )}
            <span className="shrink-0 font-saveful text-xs tabular-nums text-gray-500">{formatCount(row.collections)}</span>
          </li>
        ))}
        {rows.length === 0 ? <li className="font-saveful text-sm text-gray-400">None yet.</li> : null}
      </ul>
    </div>
  );
}

function PathwayLegend({ rows }: { rows: { pathway: string; label: string; kg: number; percent: number; color: string }[] }) {
  return (
    <ul className="space-y-1.5 px-3.5 pb-3">
      {rows.map((item) => (
        <li key={item.pathway} className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.color }} />
            <span className="truncate font-saveful text-sm text-gray-700">{item.label}</span>
          </span>
          <span className="shrink-0 font-saveful text-sm tabular-nums text-gray-800">{item.percent}%</span>
        </li>
      ))}
    </ul>
  );
}

function RecordTable({ columns, rows, empty, noun = "rows" }: { columns: string[]; rows: ReactNode[][]; empty: string; noun?: string }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pageCount);
  const paged = rows.slice((current - 1) * pageSize, current * pageSize);

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-full text-left">
        <thead>
          <tr className="border-b border-gray-100 font-saveful text-[11px] uppercase tracking-wide text-gray-400">
            {columns.map((column) => (
              <th key={column} className="px-3.5 py-2.5 font-saveful">{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paged.map((row, index) => (
            <tr key={index} className="border-b border-gray-50 last:border-0">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3.5 py-2.5 font-saveful text-sm text-gray-700">{cell}</td>
              ))}
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3.5 py-8 text-center font-saveful text-sm text-gray-500">{empty}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
      <TablePager
        page={current}
        pageSize={pageSize}
        total={rows.length}
        noun={noun}
        onPage={setPage}
        onPageSize={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate font-saveful text-[10px] uppercase tracking-[0.12em] text-gray-400">{label}</dt>
      <dd className="truncate font-saveful text-xs text-gray-800">{value}</dd>
    </div>
  );
}

function ImpactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="font-saveful text-sm text-gray-500">{label}</dt>
      <dd className="font-saveful-semibold text-sm tabular-nums text-gray-900">{value}</dd>
    </div>
  );
}

function relationshipCopy(relationships: NonNullable<ReturnType<typeof buildOrgDetail>>["relationships"]) {
  const parts: string[] = [];
  if (relationships.isReceiver) {
    parts.push(`${formatCount(relationships.collectionsAsReceiver)} collections from ${formatCount(relationships.providerCount)} provider organisations across ${formatCount(relationships.siteCount)} sites`);
  }
  if (relationships.isProvider) {
    const { charities, farms } = relationships.receiverSummary;
    parts.push(`${formatCount(relationships.collectionsAsProvider)} collections by ${formatCount(charities)} charities / ${formatCount(farms)} farms`);
  }
  return parts.join(". ") || "No collection relationships recorded yet.";
}

function orgIcon(type: OrgTypeId) {
  if (type === "charity") return Heart;
  if (type === "farmer") return Leaf;
  if (type === "circular") return Recycle;
  return Building2;
}

function orgIconTone(type: OrgTypeId) {
  if (type === "charity") return "bg-violet-100 text-violet-700";
  if (type === "farmer") return "bg-saveful-green/10 text-saveful-green";
  if (type === "circular") return "bg-orange-100 text-orange-700";
  return "bg-saveful-green/10 text-saveful-green";
}

function partnerHref(orgId: string, query?: string) {
  const params = new URLSearchParams(query?.startsWith("?") ? query.slice(1) : query ?? "");
  params.set("org", orgId);
  params.delete("tab");
  const next = params.toString();
  return next ? `/admin/organisations/${orgId}?${next}` : `/admin/organisations/${orgId}`;
}

function withTab(query: string, tab: OrgDetailTab, orgId?: string) {
  const params = new URLSearchParams(query.startsWith("?") ? query.slice(1) : query);
  if (orgId) params.set("org", orgId);
  if (tab === "overview") params.delete("tab");
  else params.set("tab", tab);
  const next = params.toString();
  return next ? `?${next}` : "";
}

function signed(value: number) {
  const rounded = Math.round(value);
  if (rounded > 0) return `+${formatCount(rounded)}`;
  if (rounded < 0) return formatCount(rounded);
  return "0";
}

function exportOrg(model: NonNullable<ReturnType<typeof buildOrgDetail>>) {
  const lines = [
    ["Field", "Value"],
    ["Organisation", model.org.name],
    ["Type", orgTypeLabel(model.org.type)],
    ["Participation", participationLabel(model.org.roles)],
    ["Account status", model.org.status],
    ["Activity status", model.activityStatus],
    ["Plan", planLabel(model.org.plan)],
    ["Sites", String(model.headlines.sites)],
    ["Users", String(model.headlines.users)],
    ["Food recovered", formatKg(model.allTime.recoveredKg)],
    ["CO2 avoided", formatKg(model.allTime.co2)],
  ];
  const csv = lines.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${model.org.id}-overview.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
