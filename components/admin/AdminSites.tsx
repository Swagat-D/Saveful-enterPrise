"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, MoreHorizontal, Plus, Search } from "lucide-react";
import { MoreFilters } from "@/components/network/FilterBar";
import { AdminPortalShell } from "@/components/layout/AdminPortalShell";
import { AdminSection, FilterSelect, TablePager, type PageSize } from "@/components/admin/AdminChrome";
import { PortalPageShell } from "@/components/ui/Portal";
import { useSession } from "@/lib/auth";
import { periodLabel } from "@/lib/dates";
import { formatKg } from "@/lib/impact";
import {
  ACTIVITY_LABEL,
  formatLastActivity,
} from "@/lib/networkRules";
import {
  EMPTY_ADMIN_FILTERS,
  EMPTY_ADMIN_SITES_FILTERS,
  ORG_TYPES,
  adminFilterOptions,
  adminFiltersToQuery,
  adminSitesTableToQuery,
  buildSitesDirectory,
  createSite,
  exportAdminSitesCsv,
  getOrganisation,
  hasActiveAdminSitesFilters,
  parseAdminFilters,
  parseAdminSitesTable,
  rememberAdminFilters,
  updateSiteStatus,
  urlHasAdminFilters,
  useAdminVersion,
  type AdminDirectorySite,
  type AdminFilters,
  type AdminSitesTableFilters,
} from "@/lib/admin";
import { useAdminAuditVersion } from "@/lib/adminAudit";
import type { ActivityStatus, PeriodKey, SiteLifecycleStatus } from "@/types/enterprise";
import { cn } from "@/lib/utils";

const PERIODS: { id: PeriodKey; label: string }[] = [
  { id: "7", label: "7 days" },
  { id: "30", label: "30 days" },
  { id: "90", label: "90 days" },
  { id: "all", label: "All time" },
];

const headerBtn =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border border-black/[0.06] bg-white px-3 font-saveful-semibold text-sm text-gray-800 hover:bg-[#F7F6F2]";

const activityOptions = [
  { id: "all", name: "All" },
  { id: "in_period", name: ACTIVITY_LABEL.in_period },
  { id: "none_in_period", name: ACTIVITY_LABEL.none_in_period },
  { id: "never_used", name: ACTIVITY_LABEL.never_used },
  { id: "never_activated", name: ACTIVITY_LABEL.never_activated },
];

function useAdminSitesState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useAdminVersion();
  const admin = { ...parseAdminFilters(searchParams), q: "" };
  const table = parseAdminSitesTable(searchParams);

  const replace = (nextAdmin: AdminFilters, nextTable: AdminSitesTableFilters) => {
    const cleaned = { ...nextAdmin, q: "" };
    rememberAdminFilters(cleaned, true);
    const params = new URLSearchParams(adminFiltersToQuery(cleaned).replace(/^\?/, ""));
    adminSitesTableToQuery(nextTable).forEach((value, key) => params.set(key, value));
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  useEffect(() => {
    if (urlHasAdminFilters(searchParams)) return;
    const remembered = adminFiltersToQuery(admin);
    if (remembered) replace(admin, table);
    // Restore remembered admin scope once when the URL has no admin keys.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    admin,
    table,
    query: adminFiltersToQuery(admin),
    updateAdmin: (patch: Partial<AdminFilters>) => replace({ ...admin, ...patch, q: "" }, { ...table, page: 1 }),
    updateTable: (patch: Partial<AdminSitesTableFilters>) => replace(admin, { ...table, ...patch, page: patch.page ?? 1 }),
    resetTable: () => replace(admin, { ...EMPTY_ADMIN_SITES_FILTERS, page: 1 }),
  };
}

export function AdminSites() {
  const user = useSession();
  useAdminAuditVersion();
  const router = useRouter();
  const { admin, table, query, updateAdmin, updateTable, resetTable } = useAdminSitesState();
  const directory = buildSitesDirectory(admin, table);
  const pageCount = Math.max(1, Math.ceil(directory.rows.length / table.pageSize));
  const page = Math.min(table.page, pageCount);
  const paged = directory.rows.slice((page - 1) * table.pageSize, page * table.pageSize);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const orgOptions = adminFilterOptions(admin).organisations;
  const contextOrg = admin.organisationId !== "all" ? getOrganisation(admin.organisationId) : null;

  const toggleSiteStatus = (status: SiteLifecycleStatus) => {
    updateTable({ siteStatus: table.siteStatus === status ? "all" : status });
  };

  const toggleActivity = (status: ActivityStatus) => {
    updateTable({ activity: table.activity === status ? "all" : status });
  };

  const filterCount = [
    admin.orgType !== "all",
    admin.organisationId !== "all",
    table.groupId !== "all",
    table.territoryId !== "all",
    table.clusterId !== "all",
    table.siteStatus !== "all",
    table.activity !== "all",
  ].filter(Boolean).length;

  return (
    <AdminPortalShell>
      <PortalPageShell className="!space-y-3 sm:!space-y-3">
        <nav className="flex flex-wrap items-center gap-1.5 font-saveful text-xs text-gray-500">
          {contextOrg ? (
            <>
              <Link href={`/admin/organisations${query}`} className="hover:text-saveful-green">
                Organisations
              </Link>
              <span className="text-gray-300">/</span>
              <Link href={`/admin/organisations/${contextOrg.id}${query}`} className="hover:text-saveful-green">
                {contextOrg.name}
              </Link>
              <span className="text-gray-300">/</span>
            </>
          ) : null}
          <span className="text-gray-700">Sites</span>
        </nav>

        <section className="overflow-hidden rounded-2xl border border-black/[0.05] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <header className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="min-w-0">
              <h1 className="font-saveful-bold text-xl leading-none text-gray-900 sm:text-2xl">Sites</h1>
              <p className="mt-1.5 truncate font-saveful text-xs text-gray-500">
                {directory.rows.length} {directory.rows.length === 1 ? "site" : "sites"}
                <span className="text-gray-300"> · </span>
                {periodLabel(admin.period)}
                <span className="text-gray-300"> · </span>
                Group, territory and cluster are independent
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={admin.period}
                onChange={(event) => updateAdmin({ period: event.target.value as PeriodKey })}
                className="h-9 rounded-lg border border-black/[0.06] bg-[#F7F6F2] px-2.5 font-saveful text-sm outline-none focus:border-saveful-green/40"
              >
                {PERIODS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              <button type="button" className={headerBtn} onClick={() => exportAdminSitesCsv(directory.rows, admin.period)}>
                <Download className="h-3.5 w-3.5" />
                Export
              </button>
              <button
                type="button"
                onClick={() => setAdding((value) => !value)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-saveful-green px-3.5 font-saveful-semibold text-sm text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                Add site
              </button>
            </div>
          </header>

          <div className="space-y-4 p-4 sm:p-5">
            {adding ? (
              <AddSiteForm
                organisations={orgOptions}
                defaultOrgId={admin.organisationId !== "all" ? admin.organisationId : orgOptions[0]?.id ?? ""}
                actor={{ name: user?.name ?? "Saveful Admin", email: user?.email ?? "" }}
                onClose={() => setAdding(false)}
              />
            ) : null}

            <AdminSection title="Network snapshot" action={<span className="font-saveful text-[11px] text-gray-400">{periodLabel(admin.period)} · Site status and activity are separate</span>}>
              <div className="grid grid-cols-2 gap-px bg-gray-100 sm:grid-cols-3 xl:grid-cols-5">
                <SummaryCell
                  label="Total sites"
                  value={directory.counts.total}
                  active={table.siteStatus === "all" && table.activity === "all"}
                  onClick={() => updateTable({ siteStatus: "all", activity: "all" })}
                />
                <SummaryCell
                  label="Active"
                  value={directory.counts.active}
                  active={table.siteStatus === "active"}
                  onClick={() => toggleSiteStatus("active")}
                />
                <SummaryCell
                  label="No recent activity"
                  value={directory.counts.noRecent}
                  active={table.activity === "none_in_period"}
                  onClick={() => toggleActivity("none_in_period")}
                />
                <SummaryCell
                  label="Never activated"
                  value={directory.counts.neverActivated}
                  active={table.activity === "never_activated"}
                  onClick={() => toggleActivity("never_activated")}
                />
                <SummaryCell
                  label="Deactivated"
                  value={directory.counts.deactivated}
                  active={table.siteStatus === "deactivated"}
                  onClick={() => toggleSiteStatus("deactivated")}
                />
              </div>
            </AdminSection>

            <AdminSection
              title="Directory"
              action={
                hasActiveAdminSitesFilters(table) || admin.orgType !== "all" || admin.organisationId !== "all" ? (
                  <button
                    type="button"
                    onClick={() => {
                      updateAdmin({ orgType: "all", organisationId: "all" });
                      resetTable();
                    }}
                    className="font-saveful-semibold text-xs text-saveful-green hover:underline"
                  >
                    Clear filters
                  </button>
                ) : null
              }
            >
              <div className="space-y-3 p-3.5">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                  <label className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    <input
                      value={table.q}
                      onChange={(event) => updateTable({ q: event.target.value })}
                      placeholder="Search by site name or site ID"
                      className="h-9 w-full rounded-lg border border-black/[0.06] bg-[#F7F6F2] pl-8 pr-3 font-saveful text-sm outline-none focus:border-saveful-green/40 focus:bg-white"
                    />
                  </label>
                  <div className="lg:hidden">
                    <MoreFilters
                      count={filterCount}
                      summary={
                        [
                          ORG_TYPES.find((item) => item.id === admin.orgType)?.label,
                          orgOptions.find((item) => item.id === admin.organisationId)?.name,
                          directory.groups.find((item) => item.id === table.groupId)?.name,
                          directory.territories.find((item) => item.id === table.territoryId)?.name,
                          directory.clusters.find((item) => item.id === table.clusterId)?.name,
                          table.siteStatus !== "all" ? (table.siteStatus === "active" ? "Active" : "Deactivated") : "",
                          table.activity !== "all" ? ACTIVITY_LABEL[table.activity] : "",
                        ]
                          .filter(Boolean)
                          .join(" · ") || "All sites"
                      }
                      title="Filter sites"
                      subtitle="Refine the list without shrinking the table."
                      onReset={() => {
                        updateAdmin({ orgType: "all", organisationId: "all" });
                        resetTable();
                      }}
                    >
                      <div className="grid grid-cols-1 gap-3">
                        <FilterSelect label="Organisation Type" value={admin.orgType} onChange={(orgType) => updateAdmin({ orgType: orgType as AdminFilters["orgType"], organisationId: "all" })} options={[{ id: "all", name: "All" }, ...ORG_TYPES.map((item) => ({ id: item.id, name: item.label }))]} />
                        <FilterSelect label="Organisation" value={admin.organisationId} onChange={(organisationId) => updateAdmin({ organisationId })} options={[{ id: "all", name: "All" }, ...orgOptions]} />
                        <FilterSelect label="Group" value={table.groupId} onChange={(groupId) => updateTable({ groupId })} options={[{ id: "all", name: "All" }, ...directory.groups]} />
                        <FilterSelect label="Territory" value={table.territoryId} onChange={(territoryId) => updateTable({ territoryId })} options={[{ id: "all", name: "All" }, ...directory.territories]} />
                        <FilterSelect label="Cluster" value={table.clusterId} onChange={(clusterId) => updateTable({ clusterId })} options={[{ id: "all", name: "All" }, ...directory.clusters]} />
                        <FilterSelect
                          label="Site status"
                          value={table.siteStatus}
                          onChange={(siteStatus) => updateTable({ siteStatus: siteStatus as AdminSitesTableFilters["siteStatus"] })}
                          options={[
                            { id: "all", name: "All" },
                            { id: "active", name: "Active" },
                            { id: "deactivated", name: "Deactivated" },
                          ]}
                        />
                        <FilterSelect label="Activity status" value={table.activity} onChange={(activity) => updateTable({ activity: activity as AdminSitesTableFilters["activity"] })} options={activityOptions} />
                      </div>
                    </MoreFilters>
                  </div>
                  <div className="hidden min-w-0 grid-cols-7 gap-2 lg:grid lg:w-auto">
                    <FilterSelect
                      value={admin.orgType}
                      onChange={(orgType) => updateAdmin({ orgType: orgType as AdminFilters["orgType"], organisationId: "all" })}
                      options={[{ id: "all", name: "Type: All" }, ...ORG_TYPES.map((item) => ({ id: item.id, name: `Type: ${item.label}` }))]}
                    />
                    <FilterSelect
                      value={admin.organisationId}
                      onChange={(organisationId) => updateAdmin({ organisationId })}
                      options={[{ id: "all", name: "Organisation: All" }, ...orgOptions.map((item) => ({ id: item.id, name: `Organisation: ${item.name}` }))]}
                    />
                    <FilterSelect
                      value={table.groupId}
                      onChange={(groupId) => updateTable({ groupId })}
                      options={[{ id: "all", name: "Group: All" }, ...directory.groups.map((item) => ({ id: item.id, name: `Group: ${item.name}` }))]}
                    />
                    <FilterSelect
                      value={table.territoryId}
                      onChange={(territoryId) => updateTable({ territoryId })}
                      options={[{ id: "all", name: "Territory: All" }, ...directory.territories.map((item) => ({ id: item.id, name: `Territory: ${item.name}` }))]}
                    />
                    <FilterSelect
                      value={table.clusterId}
                      onChange={(clusterId) => updateTable({ clusterId })}
                      options={[{ id: "all", name: "Cluster: All" }, ...directory.clusters.map((item) => ({ id: item.id, name: `Cluster: ${item.name}` }))]}
                    />
                    <FilterSelect
                      value={table.siteStatus}
                      onChange={(siteStatus) => updateTable({ siteStatus: siteStatus as AdminSitesTableFilters["siteStatus"] })}
                      options={[
                        { id: "all", name: "Site status: All" },
                        { id: "active", name: "Site status: Active" },
                        { id: "deactivated", name: "Site status: Deactivated" },
                      ]}
                    />
                    <FilterSelect
                      value={table.activity}
                      onChange={(activity) => updateTable({ activity: activity as AdminSitesTableFilters["activity"] })}
                      options={activityOptions.map((item) => ({
                        id: item.id,
                        name: item.id === "all" ? "Activity status: All" : item.name,
                      }))}
                    />
                  </div>
                </div>
              </div>

              <div className="hidden overflow-x-auto px-3.5 pb-2 lg:block">
                <table className="min-w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 font-saveful text-[11px] uppercase tracking-wide text-gray-400">
                      <th className="pb-2 pr-3 font-saveful">Site</th>
                      <th className="pb-2 pr-3 font-saveful">Site ID</th>
                      <th className="pb-2 pr-3 font-saveful">Organisation</th>
                      <th className="pb-2 pr-3 font-saveful">Group</th>
                      <th className="pb-2 pr-3 font-saveful">Territory</th>
                      <th className="pb-2 pr-3 font-saveful">Cluster</th>
                      <th className="pb-2 pr-3 font-saveful">Site status</th>
                      <th className="pb-2 pr-3 font-saveful">Activity status</th>
                      <th className="pb-2 pr-3 font-saveful">Last activity</th>
                      <th className="pb-2 pr-3 font-saveful">Food recovered</th>
                      <th className="pb-2 font-saveful"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((site) => (
                      <tr
                        key={site.id}
                        className="cursor-pointer border-b border-gray-50 last:border-0 hover:bg-[#FAF7F0]"
                        onClick={() => router.push(`/admin/sites/${site.id}${query}`)}
                      >
                        <td className="py-2.5 pr-3">
                          <p className="font-saveful-semibold text-sm text-gray-900">{site.name}</p>
                          <p className="font-saveful text-xs text-gray-500">{site.address}</p>
                        </td>
                        <td className="py-2.5 pr-3 font-saveful text-sm text-gray-700">{site.siteCode}</td>
                        <td className="py-2.5 pr-3">
                          <Link href={`/admin/organisations/${site.orgId}${query}`} className="font-saveful text-sm text-saveful-green hover:underline" onClick={(event) => event.stopPropagation()}>
                            {site.orgName}
                          </Link>
                        </td>
                        <td className="py-2.5 pr-3 font-saveful text-sm text-gray-700">{site.groupLabel}</td>
                        <td className="py-2.5 pr-3 font-saveful text-sm text-gray-700">{site.territoryLabel}</td>
                        <td className="py-2.5 pr-3 font-saveful text-sm text-gray-700">{site.clusterLabel}</td>
                        <td className="py-2.5 pr-3">
                          <SiteStatusPill active={site.siteStatus === "active"} />
                        </td>
                        <td className="py-2.5 pr-3 font-saveful text-xs text-gray-600">{ACTIVITY_LABEL[site.activity]}</td>
                        <td className="py-2.5 pr-3 font-saveful text-sm text-gray-600">{formatLastActivity(site.lastActivityAt)}</td>
                        <td className="py-2.5 pr-3 font-saveful text-sm tabular-nums text-gray-800">{site.recoveredKg > 0 ? formatKg(site.recoveredKg) : "—"}</td>
                        <td className="py-2.5" onClick={(event) => event.stopPropagation()}>
                          <RowMenu site={site} query={query} actor={{ name: user?.name ?? "Saveful Admin", email: user?.email ?? "" }} open={menuId === site.id} onToggle={() => setMenuId((current) => (current === site.id ? null : site.id))} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-gray-100 px-3.5 lg:hidden">
                {paged.map((site) => (
                  <article key={site.id} className="py-2.5">
                    <Link href={`/admin/sites/${site.id}${query}`} className="block">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-saveful-semibold text-sm text-gray-900">{site.name}</p>
                          <p className="mt-0.5 font-saveful text-xs text-gray-500">
                            {site.siteCode} · {site.address}
                          </p>
                        </div>
                        <SiteStatusPill active={site.siteStatus === "active"} />
                      </div>
                      <p className="mt-1.5 font-saveful text-xs text-gray-500">
                        {site.orgName} · {site.groupLabel} · {site.territoryLabel} · {site.clusterLabel}
                      </p>
                      <p className="mt-0.5 font-saveful text-xs text-gray-500">{ACTIVITY_LABEL[site.activity]}</p>
                      <p className="mt-0.5 font-saveful text-xs text-gray-500">
                        {formatLastActivity(site.lastActivityAt)} · {site.recoveredKg > 0 ? formatKg(site.recoveredKg) : "No food recovered"}
                      </p>
                    </Link>
                    <div className="mt-2">
                      <RowMenu site={site} query={query} actor={{ name: user?.name ?? "Saveful Admin", email: user?.email ?? "" }} open={menuId === site.id} onToggle={() => setMenuId((current) => (current === site.id ? null : site.id))} />
                    </div>
                  </article>
                ))}
              </div>

              {directory.rows.length === 0 ? (
                <p className="px-3.5 pb-3.5 font-saveful text-sm text-gray-500">No sites match these filters.</p>
              ) : (
                <TablePager
                  page={page}
                  pageSize={table.pageSize}
                  total={directory.rows.length}
                  noun="sites"
                  onPage={(next) => updateTable({ page: next })}
                  onPageSize={(size) => updateTable({ pageSize: size, page: 1 })}
                />
              )}
            </AdminSection>
          </div>
        </section>
      </PortalPageShell>
    </AdminPortalShell>
  );
}

export function AdminOrgSitesTable({ orgId, query, period }: { orgId: string; query: string; period: PeriodKey }) {
  const router = useRouter();
  const user = useSession();
  useAdminVersion();
  const [menuId, setMenuId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const directory = buildSitesDirectory({ ...EMPTY_ADMIN_FILTERS, organisationId: orgId, period }, EMPTY_ADMIN_SITES_FILTERS);
  const pageCount = Math.max(1, Math.ceil(directory.rows.length / pageSize));
  const current = Math.min(page, pageCount);
  const paged = directory.rows.slice((current - 1) * pageSize, current * pageSize);

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-full text-left">
        <thead>
          <tr className="border-b border-gray-100 font-saveful text-[11px] uppercase tracking-wide text-gray-400">
            <th className="px-3.5 py-2.5 font-saveful">Site</th>
            <th className="px-3.5 py-2.5 font-saveful">Site ID</th>
            <th className="px-3.5 py-2.5 font-saveful">Group</th>
            <th className="px-3.5 py-2.5 font-saveful">Territory</th>
            <th className="px-3.5 py-2.5 font-saveful">Cluster</th>
            <th className="px-3.5 py-2.5 font-saveful">Site status</th>
            <th className="px-3.5 py-2.5 font-saveful">Activity status</th>
            <th className="px-3.5 py-2.5 font-saveful">Last activity</th>
            <th className="px-3.5 py-2.5 font-saveful">Food recovered</th>
            <th className="px-3.5 py-2.5 font-saveful"> </th>
          </tr>
        </thead>
        <tbody>
          {paged.map((site) => (
            <tr
              key={site.id}
              className="cursor-pointer border-b border-gray-50 last:border-0 hover:bg-[#FAF7F0]"
              onClick={() => router.push(`/admin/sites/${site.id}${query}`)}
            >
              <td className="px-3.5 py-2.5">
                <p className="font-saveful-semibold text-sm text-gray-900">{site.name}</p>
                <p className="font-saveful text-xs text-gray-500">{site.address}</p>
              </td>
              <td className="px-3.5 py-2.5 font-saveful text-sm text-gray-700">{site.siteCode}</td>
              <td className="px-3.5 py-2.5 font-saveful text-sm text-gray-700">{site.groupLabel}</td>
              <td className="px-3.5 py-2.5 font-saveful text-sm text-gray-700">{site.territoryLabel}</td>
              <td className="px-3.5 py-2.5 font-saveful text-sm text-gray-700">{site.clusterLabel}</td>
              <td className="px-3.5 py-2.5">
                <SiteStatusPill active={site.siteStatus === "active"} />
              </td>
              <td className="px-3.5 py-2.5 font-saveful text-xs text-gray-600">{ACTIVITY_LABEL[site.activity]}</td>
              <td className="px-3.5 py-2.5 font-saveful text-sm text-gray-600">{formatLastActivity(site.lastActivityAt)}</td>
              <td className="px-3.5 py-2.5 font-saveful text-sm tabular-nums text-gray-800">{site.recoveredKg > 0 ? formatKg(site.recoveredKg) : "—"}</td>
              <td className="px-3.5 py-2.5" onClick={(event) => event.stopPropagation()}>
                <RowMenu site={site} query={query} actor={{ name: user?.name ?? "Saveful Admin", email: user?.email ?? "" }} open={menuId === site.id} onToggle={() => setMenuId((current) => (current === site.id ? null : site.id))} />
              </td>
            </tr>
          ))}
          {directory.rows.length === 0 ? (
            <tr>
              <td colSpan={10} className="px-3.5 py-8 text-center font-saveful text-sm text-gray-500">
                No sites yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
      <TablePager
        page={current}
        pageSize={pageSize}
        total={directory.rows.length}
        noun="sites"
        onPage={setPage}
        onPageSize={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </div>
  );
}

function AddSiteForm({
  organisations,
  defaultOrgId,
  actor,
  onClose,
}: {
  organisations: { id: string; name: string }[];
  defaultOrgId: string;
  actor: { name: string; email: string };
  onClose: () => void;
}) {
  const [orgId, setOrgId] = useState(defaultOrgId);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  return (
    <form
      className="grid gap-3 rounded-xl border border-dashed border-saveful-green/30 bg-saveful-green/[0.03] p-3.5 sm:grid-cols-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!createSite({ orgId, name, address }, actor)) return;
        onClose();
      }}
    >
      <p className="sm:col-span-4 font-saveful text-[10px] uppercase tracking-[0.12em] text-saveful-green">Saveful only · Add site</p>
      <FilterSelect label="Organisation" value={orgId} onChange={setOrgId} options={organisations} />
      <label className="block min-w-0">
        <span className="mb-1.5 block font-saveful text-[11px] uppercase tracking-[0.12em] text-gray-500">Site name</span>
        <input value={name} onChange={(event) => setName(event.target.value)} required className="h-9 w-full rounded-lg border border-black/[0.06] bg-white px-2.5 font-saveful text-sm outline-none" />
      </label>
      <label className="block min-w-0">
        <span className="mb-1.5 block font-saveful text-[11px] uppercase tracking-[0.12em] text-gray-500">Address</span>
        <input value={address} onChange={(event) => setAddress(event.target.value)} className="h-9 w-full rounded-lg border border-black/[0.06] bg-white px-2.5 font-saveful text-sm outline-none" />
      </label>
      <div className="flex items-end gap-2">
        <button type="submit" className="h-9 rounded-lg bg-saveful-green px-3.5 font-saveful-semibold text-sm text-white">
          Create site
        </button>
        <button type="button" onClick={onClose} className="h-9 rounded-lg px-3 font-saveful text-sm text-gray-500">
          Cancel
        </button>
      </div>
    </form>
  );
}

function SummaryCell({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: number;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("bg-white px-3 py-3 text-left transition hover:bg-[#FAF7F0]", active && "bg-saveful-green/[0.04]")}
    >
      <p className="font-saveful-bold text-[1.05rem] tabular-nums leading-none text-gray-900">{value}</p>
      <p className="mt-1.5 font-saveful text-[11px] text-gray-500">{label}</p>
    </button>
  );
}

function SiteStatusPill({ active }: { active: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F7F6F2] px-2 py-0.5 font-saveful text-[11px] text-gray-700">
      <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-saveful-green" : "bg-gray-400")} />
      {active ? "Active" : "Deactivated"}
    </span>
  );
}

function RowMenu({
  site,
  query,
  actor,
  open,
  onToggle,
}: {
  site: AdminDirectorySite;
  query: string;
  actor: { name: string; email: string };
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/[0.06] text-gray-600 hover:bg-[#F7F6F2]"
        aria-label="Site actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-lg">
          <Link href={`/admin/sites/${site.id}${query}`} className="block px-3 py-2 font-saveful text-sm text-gray-800 hover:bg-[#F7F6F2]">
            View site
          </Link>
          <Link href={`/admin/organisations/${site.orgId}${query.includes("?") ? `${query}&tab=sites` : `${query}?tab=sites`}`} className="block px-3 py-2 font-saveful text-sm text-gray-800 hover:bg-[#F7F6F2]">
            View organisation
          </Link>
          <button
            type="button"
            className="block w-full px-3 py-2 text-left font-saveful text-sm hover:bg-[#F7F6F2]"
            onClick={() => {
              updateSiteStatus(site.id, site.siteStatus === "deactivated" ? "active" : "deactivated", actor);
              onToggle();
            }}
          >
            {site.siteStatus === "deactivated" ? "Reactivate site" : "Deactivate site"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

