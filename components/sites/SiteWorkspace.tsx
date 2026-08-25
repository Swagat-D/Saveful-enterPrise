"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MoreHorizontal, Pencil } from "lucide-react";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { InsightsView } from "@/components/insights/InsightsView";
import { PortalPageShell } from "@/components/ui/Portal";
import { PortalShell } from "@/components/layout/PortalShell";
import { StatusBadge } from "@/components/ui/Portal";
import { UsersDirectory } from "@/components/users/UsersDirectory";
import { periodLabel } from "@/lib/dates";
import { formatCount, formatKg, formatMoney } from "@/lib/impact";
import { impactFromTransactions, recoveryPathways, scopedTransactions } from "@/lib/networkQuery";
import { sitePermissions } from "@/lib/permissions";
import { setSiteStatus, useSiteStatus } from "@/lib/siteLifecycle";
import { parseSiteTab, SITE_TABS, siteOperations, siteRecoveryRows, type SiteTab } from "@/lib/siteWorkspace";
import { resolveSite, useOrgStructureVersion } from "@/lib/orgStructure";
import { lookupLabel } from "@/lib/sitesDirectory";
import type { SessionUser } from "@/lib/auth";
import type { AccessScope, OrganizationSite, PeriodKey } from "@/types/enterprise";
import { cn } from "@/lib/utils";

const PERIODS: { id: PeriodKey; label: string }[] = [
  { id: "7", label: "7 days" },
  { id: "30", label: "30 days" },
  { id: "90", label: "90 days" },
  { id: "all", label: "All time" },
];

const PATHWAY_COLORS: Record<string, string> = {
  people: "#2D5F4F",
  livestock: "#4C7C9B",
  circular: "#C4843C",
  bioenergy: "#7C6BB0",
};

export function SiteWorkspace({
  site,
  user,
  scope,
}: {
  site: OrganizationSite;
  user: SessionUser | null;
  scope: AccessScope;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = parseSiteTab(searchParams.get("tab"));
  const permissions = sitePermissions(user);
  useOrgStructureVersion();
  const current = resolveSite(site);
  const status = useSiteStatus(site);
  const [menuOpen, setMenuOpen] = useState(false);
  const [period, setPeriod] = useState<PeriodKey>("30");
  const ops = siteOperations(site);
  const group = lookupLabel("group", current.groupId);
  const territory = lookupLabel("territory", current.territoryId);
  const cluster = lookupLabel("cluster", current.clusterId);

  const setTab = (next: SiteTab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "overview") params.delete("tab");
    else params.set("tab", next);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <PortalShell>
      <PortalPageShell className="!space-y-3 sm:!space-y-3">
        <nav className="font-saveful text-xs text-gray-500">
          <Link href="/sites" className="hover:text-saveful-green">
            Sites
          </Link>
          <span className="px-1.5 text-gray-300">/</span>
          <span className="text-gray-700">{site.name}</span>
        </nav>

        <section className="overflow-hidden rounded-2xl border border-black/[0.05] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <header className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-saveful-bold text-xl leading-none text-gray-900 sm:text-2xl">
                  {site.name}
                </h1>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F7F6F2] px-2 py-0.5 font-saveful text-[11px] text-gray-700">
                  <span className={cn("h-1.5 w-1.5 rounded-full", status === "active" ? "bg-saveful-green" : "bg-gray-400")} />
                  {status === "active" ? "Active" : "Deactivated"}
                </span>
              </div>
              <p className="mt-1.5 truncate font-saveful text-xs text-gray-500">
                {group} · {territory} · {cluster}
                <span className="text-gray-300"> · </span>
                {site.siteCode}
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
              {permissions.edit ? (
                <Link
                  href={`/sites/${site.id}/edit`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-black/[0.06] bg-white px-3 font-saveful-semibold text-sm text-gray-800 hover:bg-[#F7F6F2]"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Link>
              ) : null}
              {permissions.manageAccess || permissions.deactivate ? (
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
                      {permissions.manageAccess ? (
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
                      ) : null}
                      {permissions.deactivate ? (
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left font-saveful text-sm hover:bg-[#F7F6F2]"
                          onClick={() => {
                            setSiteStatus(site.id, status === "deactivated" ? "active" : "deactivated", user?.name || "Enterprise user");
                            setMenuOpen(false);
                          }}
                        >
                          {status === "deactivated" ? "Reactivate site" : "Deactivate site"}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
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
                  tab === item.id
                    ? "border-saveful-green text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-800",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-5">
            {tab === "overview" ? (
              <OverviewTab
                site={site}
                scope={scope}
                period={period}
                onViewActivity={() => setTab("activity")}
                ops={ops}
              />
            ) : null}
            {tab === "activity" ? <ActivityFeed siteId={site.id} siteName={site.name} compact /> : null}
            {tab === "insights" ? <InsightsView lockedSiteId={site.id} /> : null}
            {tab === "access" ? (
              <UsersDirectory siteId={site.id} siteName={site.name} canInvite={permissions.manageAccess} compact />
            ) : null}
          </div>
        </section>
      </PortalPageShell>
    </PortalShell>
  );
}

function OverviewTab({
  site,
  scope,
  period,
  onViewActivity,
  ops,
}: {
  site: OrganizationSite;
  scope: AccessScope;
  period: PeriodKey;
  onViewActivity: () => void;
  ops: ReturnType<typeof siteOperations>;
}) {
  const filters = useMemo(
    () => ({
      groupId: "all" as const,
      territoryId: "all" as const,
      clusterId: "all" as const,
      siteId: site.id,
      period,
    }),
    [site.id, period],
  );
  const rows = scopedTransactions(filters, scope);
  const impact = impactFromTransactions(rows);
  const pathways = recoveryPathways(rows);
  const recent = siteRecoveryRows(site.id, period, 5);

  const metrics = [
    { label: "Food recovered", value: formatKg(impact.foodKg) },
    { label: "Meals created", value: formatCount(impact.mealsCreated) },
    { label: "CO₂ avoided", value: formatKg(impact.co2AvoidedKg) },
    { label: "Food value", value: formatMoney(impact.foodValue) },
    { label: "Collections", value: formatCount(impact.collectionsCompleted) },
    { label: "Organisations", value: formatCount(impact.organisationsSupported) },
  ];

  const details = [
    { label: "Address", value: [site.address, site.postCode].filter(Boolean).join(", ") },
    { label: "Primary contact", value: ops.primaryContact },
    { label: "Site admin", value: ops.siteAdmin },
    { label: "Availability", value: ops.collectionHours },
    { label: "Instructions", value: ops.collectionInstructions },
    ...(site.mobile && site.mobile !== "-" ? [{ label: "Phone", value: site.mobile }] : []),
  ];

  return (
    <div className="space-y-4">
      <OverviewSection title="Site impact" hint={periodLabel(period)}>
        <div className="grid grid-cols-2 gap-px bg-gray-100 sm:grid-cols-3 xl:grid-cols-6">
          {metrics.map((metric) => (
            <div key={metric.label} className="bg-white px-3 py-3 first:rounded-none">
              <p className="font-saveful-bold text-[1.05rem] tabular-nums leading-none text-gray-900">
                {metric.value}
              </p>
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
                          background: PATHWAY_COLORS[item.pathway],
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
          <button
            type="button"
            onClick={onViewActivity}
            className="font-saveful-semibold text-xs text-saveful-green hover:underline"
          >
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
                        <StatusBadge tone={row.status === "Completed" ? "green" : "blue"}>{row.status}</StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-gray-100 px-3.5 md:hidden">
              {recent.map((row) => (
                <article key={row.id} className="flex items-start justify-between gap-3 py-2.5">
                  <div>
                    <p className="font-saveful-semibold text-sm text-gray-900">{row.food}</p>
                    <p className="mt-0.5 font-saveful text-xs text-gray-500">
                      {row.date} · {row.quantity} · {row.recipient}
                    </p>
                  </div>
                  <StatusBadge tone={row.status === "Completed" ? "green" : "blue"}>{row.status}</StatusBadge>
                </article>
              ))}
            </div>
          </>
        ) : (
          <p className="px-3.5 pb-3.5 font-saveful text-sm text-gray-500">No recovery activity in this period.</p>
        )}
      </OverviewSection>
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
