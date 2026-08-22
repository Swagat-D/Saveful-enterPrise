"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Ban,
  Building2,
  CheckCircle2,
  Clock3,
  Download,
  MoreHorizontal,
  Plus,
  Search,
  Upload,
  UserRound,
} from "lucide-react";
import { AppPage } from "@/components/layout/AppPage";
import { MoreFilters } from "@/components/network/FilterBar";
import { Button } from "@/components/ui/button";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";
import { useSession } from "@/lib/auth";
import { formatKg } from "@/lib/impact";
import { scopeFromUser } from "@/lib/scope";
import { sitePermissions } from "@/lib/permissions";
import { formatLastActivity } from "@/lib/networkRules";
import { getSiteStatus, setSiteStatus, useSiteLifecycleVersion } from "@/lib/siteLifecycle";
import {
  EMPTY_SITES_FILTERS,
  exportSitesCsv,
  filterDirectorySites,
  foodRecoveredKg,
  hasActiveSitesFilters,
  lookupLabel,
  parseSitesFilters,
  sitesFilterOptions,
  sitesFiltersToQuery,
  summaryCounts,
  type SitesTableFilters,
} from "@/lib/sitesDirectory";
import type { OrganizationSite, SiteSummaryKey } from "@/types/enterprise";
import { cn } from "@/lib/utils";

const selectClass =
  "h-10 appearance-none rounded-xl border border-black/[0.06] bg-white px-3 pr-8 font-saveful text-sm text-gray-800 outline-none focus:border-saveful-green/40 focus:ring-2 focus:ring-saveful-green/10";

export default function SitesPage() {
  return (
    <Suspense fallback={<SavefulPageLoader message="Loading sites…" />}>
      <SitesDirectory />
    </Suspense>
  );
}

function SitesDirectory() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const user = useSession();
  const scope = scopeFromUser(user);
  const permissions = sitePermissions(user);
  const filters = useMemo(() => parseSitesFilters(searchParams), [searchParams]);
  const options = useMemo(() => sitesFilterOptions(scope, filters), [scope, filters]);
  const counts = useMemo(() => summaryCounts(scope, filters), [scope, filters]);
  const rows = useMemo(() => filterDirectorySites(scope, filters), [scope, filters]);
  const pageCount = Math.max(1, Math.ceil(rows.length / filters.pageSize));
  const page = Math.min(filters.page, pageCount);
  const paged = rows.slice((page - 1) * filters.pageSize, page * filters.pageSize);
  const [menuId, setMenuId] = useState<string | null>(null);
  useSiteLifecycleVersion();

  const setFilters = (next: SitesTableFilters) => {
    router.replace(`${pathname}${sitesFiltersToQuery({ ...next, page: next.page || 1 })}`, { scroll: false });
  };

  const update = (patch: Partial<SitesTableFilters>) => {
    setFilters({ ...filters, ...patch, page: patch.page ?? 1 });
  };

  const toggleSummary = (key: SiteSummaryKey) => {
    update({ summary: filters.summary === key ? "all" : key });
  };

  return (
    <AppPage
      eyebrow="Network"
      title="Sites"
      description="Manage and monitor sites across your organisation."
      actions={
        <Button variant="secondary" className="w-full sm:w-auto" onClick={() => exportSitesCsv(rows, filters.period)}>
          <Download className="h-4 w-4" />
          Export
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          label="Total sites"
          value={counts.total}
          hrefLabel="View all"
          icon={Building2}
          active={filters.summary === "total" || filters.summary === "all"}
          onClick={() => update({ summary: "all", siteStatus: "all", activity: "all" })}
        />
        <SummaryCard
          label="Active"
          value={counts.active}
          hrefLabel="View active"
          icon={CheckCircle2}
          active={filters.summary === "active"}
          onClick={() => toggleSummary("active")}
        />
        <SummaryCard
          label="No recent activity"
          value={counts.noRecent}
          hrefLabel="View sites"
          icon={Clock3}
          active={filters.summary === "no_recent"}
          onClick={() => toggleSummary("no_recent")}
        />
        <SummaryCard
          label="Never activated"
          value={counts.neverActivated}
          hrefLabel="View sites"
          icon={UserRound}
          active={filters.summary === "never_activated"}
          onClick={() => toggleSummary("never_activated")}
        />
        <SummaryCard
          label="Deactivated"
          value={counts.deactivated}
          hrefLabel="View sites"
          icon={Ban}
          active={filters.summary === "deactivated"}
          onClick={() => toggleSummary("deactivated")}
        />
      </div>

      <div className="rounded-2xl border border-black/[0.04] bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={filters.q}
              onChange={(event) => update({ q: event.target.value })}
              placeholder="Search by site name or site ID"
              className="h-10 w-full rounded-xl border border-black/[0.06] bg-[#F7F6F2] pl-10 pr-3 font-saveful text-sm outline-none focus:border-saveful-green/40 focus:bg-white focus:ring-2 focus:ring-saveful-green/10"
            />
          </label>
          <div className="lg:hidden">
            <MoreFilters
              count={
                [
                  filters.groupId !== "all",
                  filters.territoryId !== "all",
                  filters.clusterId !== "all",
                  filters.siteStatus !== "all",
                  filters.activity !== "all",
                ].filter(Boolean).length
              }
              summary={
                [
                  options.groups.find((item) => item.id === filters.groupId)?.name,
                  options.territories.find((item) => item.id === filters.territoryId)?.name,
                  options.clusters.find((item) => item.id === filters.clusterId)?.name,
                  filters.siteStatus !== "all" ? (filters.siteStatus === "active" ? "Active" : "Deactivated") : "",
                  filters.activity !== "all" ? "Activity refined" : "",
                ]
                  .filter(Boolean)
                  .join(" · ") || "All sites"
              }
              title="Filter sites"
              subtitle="Refine the list without shrinking the table."
              onReset={() =>
                setFilters({
                  ...filters,
                  groupId: "all",
                  territoryId: "all",
                  clusterId: "all",
                  siteStatus: "all",
                  activity: "all",
                  page: 1,
                })
              }
            >
              <div className="grid grid-cols-1 gap-3">
                <FilterSelect
                  label="Group"
                  value={filters.groupId}
                  onChange={(groupId) => update({ groupId })}
                  options={[{ id: "all", name: "All" }, ...options.groups]}
                />
                <FilterSelect
                  label="Territory"
                  value={filters.territoryId}
                  onChange={(territoryId) => update({ territoryId })}
                  options={[{ id: "all", name: "All" }, ...options.territories]}
                />
                <FilterSelect
                  label="Cluster"
                  value={filters.clusterId}
                  onChange={(clusterId) => update({ clusterId })}
                  options={[{ id: "all", name: "All" }, ...options.clusters]}
                />
                <FilterSelect
                  label="Site status"
                  value={filters.siteStatus}
                  onChange={(siteStatus) => update({ siteStatus: siteStatus as SitesTableFilters["siteStatus"] })}
                  options={[
                    { id: "all", name: "All" },
                    { id: "active", name: "Active" },
                    { id: "deactivated", name: "Deactivated" },
                  ]}
                />
                <FilterSelect
                  label="Activity"
                  value={filters.activity}
                  onChange={(activity) => update({ activity: activity as SitesTableFilters["activity"] })}
                  options={[
                    { id: "all", name: "All" },
                    { id: "in_period", name: "Activity in period" },
                    { id: "none_in_period", name: "No activity in period" },
                    { id: "never_used", name: "Never used" },
                    { id: "never_activated", name: "Never activated" },
                  ]}
                />
              </div>
            </MoreFilters>
          </div>
          <div className="hidden grid-cols-5 gap-2 lg:grid lg:w-auto">
            <FilterSelect
              value={filters.groupId}
              onChange={(groupId) => update({ groupId })}
              options={[{ id: "all", name: "Group: All" }, ...options.groups.map((item) => ({ id: item.id, name: `Group: ${item.name}` }))]}
            />
            <FilterSelect
              value={filters.territoryId}
              onChange={(territoryId) => update({ territoryId })}
              options={[{ id: "all", name: "Territory: All" }, ...options.territories.map((item) => ({ id: item.id, name: `Territory: ${item.name}` }))]}
            />
            <FilterSelect
              value={filters.clusterId}
              onChange={(clusterId) => update({ clusterId })}
              options={[{ id: "all", name: "Cluster: All" }, ...options.clusters.map((item) => ({ id: item.id, name: `Cluster: ${item.name}` }))]}
            />
            <FilterSelect
              value={filters.siteStatus}
              onChange={(siteStatus) => update({ siteStatus: siteStatus as SitesTableFilters["siteStatus"] })}
              options={[
                { id: "all", name: "Site status: All" },
                { id: "active", name: "Site status: Active" },
                { id: "deactivated", name: "Site status: Deactivated" },
              ]}
            />
            <FilterSelect
              value={filters.activity}
              onChange={(activity) => update({ activity: activity as SitesTableFilters["activity"] })}
              options={[
                { id: "all", name: "Activity: All" },
                { id: "in_period", name: "Activity in period" },
                { id: "none_in_period", name: "No activity in period" },
                { id: "never_used", name: "Never used" },
                { id: "never_activated", name: "Never activated" },
              ]}
            />
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            {hasActiveSitesFilters(filters) ? (
              <button
                type="button"
                onClick={() => setFilters({ ...EMPTY_SITES_FILTERS, period: filters.period })}
                className="font-saveful-semibold text-sm text-saveful-green hover:underline"
              >
                Clear filters
              </button>
            ) : (
              <p className="font-saveful text-xs text-gray-400">Group, territory and cluster are independent labels.</p>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {permissions.bulkUpload ? (
              <Button href="/sites/upload" variant="secondary" size="sm" className="w-full sm:w-auto">
                <Upload className="h-3.5 w-3.5" />
                Bulk upload
              </Button>
            ) : null}
            {permissions.addSite ? (
              <Button href="/sites/new" size="sm" className="w-full sm:w-auto">
                <Plus className="h-3.5 w-3.5" />
                Add site
              </Button>
            ) : null}
            {permissions.export ? (
              <Button
                variant="secondary"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => exportSitesCsv(rows, filters.period)}
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="hidden overflow-x-auto lg:block">
          <table className="min-w-full text-left">
            <thead className="bg-[#F7F6F2]">
              <tr className="font-saveful text-[11px] uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3 font-saveful">Site</th>
                <th className="px-3 py-3 font-saveful">Site ID</th>
                <th className="px-3 py-3 font-saveful">Group</th>
                <th className="px-3 py-3 font-saveful">Territory</th>
                <th className="px-3 py-3 font-saveful">Cluster</th>
                <th className="px-3 py-3 font-saveful">Site status</th>
                <th className="px-3 py-3 font-saveful">Last activity</th>
                <th className="px-3 py-3 font-saveful">Food recovered</th>
                <th className="px-3 py-3 font-saveful"> </th>
              </tr>
            </thead>
            <tbody>
              {paged.map((site) => {
                const kg = foodRecoveredKg(site.id, filters.period);
                return (
                  <tr
                    key={site.id}
                    className="cursor-pointer border-t border-gray-100 hover:bg-[#FAF7F0]"
                    onClick={() => router.push(`/sites/${site.id}`)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-saveful-semibold text-sm text-gray-900">{site.name}</p>
                      <p className="font-saveful text-xs text-gray-500">{site.address}</p>
                    </td>
                    <td className="px-3 py-3 font-saveful text-sm text-gray-700">{site.siteCode}</td>
                    <td className="px-3 py-3 font-saveful text-sm text-gray-700">{lookupLabel("group", site.groupId)}</td>
                    <td className="px-3 py-3 font-saveful text-sm text-gray-700">{lookupLabel("territory", site.territoryId)}</td>
                    <td className="px-3 py-3 font-saveful text-sm text-gray-700">{lookupLabel("cluster", site.clusterId)}</td>
                    <td className="px-3 py-3">
                      <StatusDot active={getSiteStatus(site) === "active"} />
                    </td>
                    <td className="px-3 py-3 font-saveful text-sm text-gray-700">
                      {formatLastActivity(site.lastActivityAt)}
                    </td>
                    <td className="px-3 py-3 font-saveful text-sm tabular-nums text-gray-700">
                      {kg > 0 ? formatKg(kg) : "—"}
                    </td>
                    <td className="px-3 py-3" onClick={(event) => event.stopPropagation()}>
                      <RowMenu site={site} open={menuId === site.id} onToggle={() => setMenuId((current) => (current === site.id ? null : site.id))} permissions={permissions} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-gray-100 lg:hidden">
          {paged.map((site) => {
            const kg = foodRecoveredKg(site.id, filters.period);
            return (
              <article key={site.id} className="p-4">
                <Link href={`/sites/${site.id}`} className="block">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-saveful-semibold text-sm text-gray-900">{site.name}</p>
                      <p className="mt-0.5 font-saveful text-xs text-gray-500">{site.siteCode} · {site.address}</p>
                    </div>
                    <StatusDot active={getSiteStatus(site) === "active"} />
                  </div>
                  <p className="mt-2 font-saveful text-xs text-gray-500">
                    {lookupLabel("group", site.groupId)} · {lookupLabel("territory", site.territoryId)} · {lookupLabel("cluster", site.clusterId)}
                  </p>
                  <p className="mt-1 font-saveful text-xs text-gray-500">
                    {formatLastActivity(site.lastActivityAt)} · {kg > 0 ? formatKg(kg) : "No food recovered"}
                  </p>
                </Link>
                <div className="mt-3">
                  <RowMenu site={site} open={menuId === site.id} onToggle={() => setMenuId((current) => (current === site.id ? null : site.id))} permissions={permissions} />
                </div>
              </article>
            );
          })}
        </div>

        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center font-saveful text-sm text-gray-500">No sites match these filters.</p>
        ) : (
          <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-saveful text-xs text-gray-500">
              Showing {(page - 1) * filters.pageSize + 1}–{Math.min(page * filters.pageSize, rows.length)} of {rows.length} sites
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 font-saveful text-xs text-gray-500">
                Rows per page
                <select
                  value={filters.pageSize}
                  onChange={(event) => update({ pageSize: Number(event.target.value) as 25 | 50 | 100, page: 1 })}
                  className="h-8 rounded-lg border border-black/[0.06] bg-white px-2"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </label>
              <div className="flex items-center gap-1">
                <PageButton disabled={page <= 1} onClick={() => update({ page: page - 1 })}>
                  ‹
                </PageButton>
                <span className="min-w-8 px-2 text-center font-saveful text-sm">{page}</span>
                <PageButton disabled={page >= pageCount} onClick={() => update({ page: page + 1 })}>
                  ›
                </PageButton>
              </div>
            </div>
          </div>
        )}
      </section>
    </AppPage>
  );
}

function SummaryCard({
  label,
  value,
  hrefLabel,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  value: number;
  hrefLabel: string;
  icon: typeof Building2;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border bg-white p-4 text-left shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition",
        active ? "border-saveful-green/30 ring-1 ring-saveful-green/15" : "border-black/[0.04] hover:border-saveful-green/20",
      )}
    >
      <Icon className="h-4 w-4 text-saveful-green" />
      <p className="mt-3 font-saveful-bold text-2xl tabular-nums text-gray-900">{value}</p>
      <p className="mt-1 font-saveful-semibold text-sm text-gray-800">{label}</p>
      <p className="mt-2 font-saveful text-xs text-saveful-green">{hrefLabel} →</p>
    </button>
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
  options: { id: string; name: string }[];
}) {
  return (
    <label className="block min-w-0">
      {label ? (
        <span className="mb-1.5 block font-saveful text-[11px] uppercase tracking-[0.14em] text-gray-500">
          {label}
        </span>
      ) : null}
      <div className="relative">
        <select value={value} onChange={(event) => onChange(event.target.value)} className={cn(selectClass, "w-full")}>
          {options.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
      </div>
    </label>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-saveful text-sm text-gray-800">
      <span className={cn("h-2 w-2 rounded-full", active ? "bg-saveful-green" : "border border-gray-400")} />
      {active ? "Active" : "Deactivated"}
    </span>
  );
}

function RowMenu({
  site,
  open,
  onToggle,
  permissions,
}: {
  site: OrganizationSite;
  open: boolean;
  onToggle: () => void;
  permissions: ReturnType<typeof sitePermissions>;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="rounded-lg p-1.5 text-gray-500 hover:bg-[#F7F6F2]"
        aria-label="Site actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-lg">
          <MenuLink href={`/sites/${site.id}`}>View site</MenuLink>
          {permissions.edit ? <MenuLink href={`/sites/${site.id}/edit`}>Edit site</MenuLink> : null}
          {permissions.manageAccess ? <MenuLink href={`/sites/${site.id}?tab=access`}>Manage access</MenuLink> : null}
          {permissions.deactivate ? (
            <button
              type="button"
              className="block w-full px-3 py-2 text-left font-saveful text-sm hover:bg-[#F7F6F2]"
              onClick={() => setSiteStatus(site.id, getSiteStatus(site) === "deactivated" ? "active" : "deactivated")}
            >
              {getSiteStatus(site) === "deactivated" ? "Reactivate site" : "Deactivate site"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({ href, children }: { href: string; children: string }) {
  return (
    <Link href={href} className="block px-3 py-2 font-saveful text-sm text-gray-800 hover:bg-[#F7F6F2]">
      {children}
    </Link>
  );
}

function PageButton({
  children,
  disabled,
  onClick,
}: {
  children: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg font-saveful text-sm text-gray-700 hover:bg-[#F7F6F2] disabled:opacity-40"
    >
      {children}
    </button>
  );
}
