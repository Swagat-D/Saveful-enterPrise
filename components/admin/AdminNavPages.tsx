"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { PeriodFilter } from "@/components/filters/PeriodFilter";
import Link from "next/link";
import { ChevronDown, Search } from "lucide-react";
import { AddOrganisationForm } from "@/components/admin/AdminOrganisations";
import { AdminFiltersBar, AdminPage, AdminSection, StatusPill, TablePager, useAdminFilters, type PageSize } from "@/components/admin/AdminChrome";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";
import { useSession } from "@/lib/auth";
import {
  assignedSitesForUser,
  buildAdminOverview,
  formatEnterpriseId,
  getOrganisation,
  isEnterpriseWideUser,
  listLiveEnterprises,
  listNetworkActivity,
  listOrgUsers,
  listOrganisations,
  listSites,
  orgTypeLabel,
  planLabel,
  refreshEnterpriseUsers,
  refreshSites,
  useAdminReady,
  useAdminVersion,
  type AdminSite,
} from "@/lib/admin";
import { cn } from "@/lib/utils";
import { useAdminAuditVersion } from "@/lib/adminAudit";
import { formatDisplayDate } from "@/lib/dates";
import { adminInsightSummary, buildAdminInsightStory, downloadAdminInsightExcel, downloadAdminInsightReport } from "@/lib/adminInsights";
import { IMPACT, formatCount, formatKg, formatMoney } from "@/lib/impact";
import { formatLastActivity } from "@/lib/networkRules";

function siteLine(site: AdminSite) {
  return [site.siteCode, site.address.split("\n")[0]?.trim() || site.address, site.postcode].filter(Boolean).join(" · ");
}

export function AdminUsers() {
  const { filters, update, reset, query } = useAdminFilters();
  useAdminVersion();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [openId, setOpenId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void Promise.all([refreshEnterpriseUsers(), refreshSites().catch(() => undefined)])
      .then(() => {
        if (!cancelled) setLoadError("");
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : "Enterprise users could not be loaded.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const orgs = listLiveEnterprises().filter((org) => {
    if (filters.organisationId !== "all" && org.id !== filters.organisationId) return false;
    if (filters.country !== "all" && org.country !== filters.country) return false;
    return true;
  });
  const needle = search.trim().toLowerCase();
  const rows = orgs
    .flatMap((org) =>
      listOrgUsers(org.id).map((user) => {
        const sites = assignedSitesForUser(user);
        const allSites = isEnterpriseWideUser(user);
        return {
          ...user,
          orgName: org.name,
          orgType: org.enterpriseId ? `Enterprise · ${formatEnterpriseId(org.enterpriseId)}` : "Enterprise",
          sites,
          allSites,
          orgSiteCount: listSites().filter((site) => site.orgId === org.id).length,
        };
      }),
    )
    .filter((row) => {
      if (!needle) return true;
      return [
        row.name,
        row.email,
        row.mobile,
        row.orgName,
        row.role,
        row.status,
        row.allSites ? "all sites" : "",
        ...row.sites.flatMap((site) => [site.name, site.siteCode, site.address, site.postcode, site.groupLabel, site.territoryLabel, site.clusterLabel]),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pageCount);
  const paged = rows.slice((current - 1) * pageSize, current * pageSize);

  return (
    <AdminPage
      workspace
      crumb={[{ href: `/admin/dashboard${query}`, label: "Dashboard" }]}
      title="Enterprise users"
      hint="People with access across provisioned Enterprises. App signups are under App users."
    >
      <AdminFiltersBar filters={filters} onChange={update} onReset={reset} />
      {loadError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-saveful text-sm text-red-700">
          {loadError} Restart the API with the latest admin users endpoint, then refresh this page.
        </p>
      ) : null}
      <AdminSection
        title="Directory"
        action={<span className="font-saveful text-xs text-gray-500">{rows.length} {rows.length === 1 ? "user" : "users"}</span>}
      >
        <div className="border-b border-gray-100 px-3.5 py-3">
          <label className="relative block max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search name, email, organisation or site"
              className="h-10 w-full rounded-xl border border-black/[0.06] bg-[#F7F6F2] pl-10 pr-3 font-saveful text-sm outline-none placeholder:text-gray-400 focus:border-saveful-green/40 focus:bg-white"
            />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 font-saveful text-[11px] uppercase tracking-wide text-gray-400">
                <th className="px-3 py-2.5 font-saveful">User</th>
                <th className="px-3 py-2.5 font-saveful">Organisation</th>
                <th className="px-3 py-2.5 font-saveful">Site</th>
                <th className="px-3 py-2.5 font-saveful">Role</th>
                <th className="px-3 py-2.5 font-saveful">Status</th>
                <th className="px-3 py-2.5 font-saveful">Last login / activity</th>
                <th className="w-10 px-3 py-2.5 font-saveful" />
              </tr>
            </thead>
            <tbody>
              {paged.map((row) => {
                const key = `${row.orgId}-${row.id}`;
                const open = openId === key;
                const primary = row.sites[0];
                return (
                  <Fragment key={key}>
                    <tr
                      className="cursor-pointer border-b border-gray-50 last:border-0 hover:bg-[#FAF7F0]"
                      onClick={() => setOpenId(open ? null : key)}
                    >
                      <td className="px-3 py-3">
                        <p className="font-saveful-semibold text-sm text-gray-900">{row.name}</p>
                        <p className="font-saveful text-xs text-gray-500">{row.email}</p>
                        {row.mobile ? <p className="font-saveful text-[11px] text-gray-400">{row.mobile}</p> : null}
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          href={`/admin/organisations/${row.orgId}${query}`}
                          className="font-saveful text-sm text-saveful-green hover:underline"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {row.orgName}
                        </Link>
                        <p className="font-saveful text-[11px] text-gray-400">{row.orgType}</p>
                      </td>
                      <td className="px-3 py-3">
                        {row.allSites ? (
                          <>
                            <p className="font-saveful text-sm text-gray-800">All sites</p>
                            <p className="font-saveful text-[11px] text-gray-400">
                              {row.orgSiteCount} {row.orgSiteCount === 1 ? "site" : "sites"} across the enterprise
                            </p>
                          </>
                        ) : primary ? (
                          <>
                            <Link
                              href={`/admin/sites/${primary.id}?org=${row.orgId}`}
                              className="font-saveful text-sm text-saveful-green hover:underline"
                              onClick={(event) => event.stopPropagation()}
                            >
                              {primary.name}
                            </Link>
                            <p className="font-saveful text-[11px] text-gray-400">{siteLine(primary)}</p>
                            {row.sites.length > 1 ? (
                              <p className="font-saveful text-[11px] text-gray-400">+{row.sites.length - 1} more</p>
                            ) : null}
                          </>
                        ) : row.siteIds?.length ? (
                          <p className="font-saveful text-sm text-gray-800">
                            {row.siteIds.length === 1 ? `Site ${row.siteIds[0]}` : `${row.siteIds.length} sites`}
                          </p>
                        ) : (
                          <p className="font-saveful text-sm text-gray-400">No site assigned</p>
                        )}
                      </td>
                      <td className="px-3 py-3 font-saveful text-sm text-gray-700">{row.role}</td>
                      <td className="px-3 py-3">
                        <StatusPill status={row.status} />
                      </td>
                      <td className="px-3 py-3 font-saveful text-sm text-gray-600">
                        {row.status === "Invited" ? "Invitation sent" : row.lastActiveAt ? formatLastActivity(row.lastActiveAt) : "—"}
                        {row.joinedAt ? (
                          <p className="font-saveful text-[11px] text-gray-400">Joined {formatDisplayDate(row.joinedAt)}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">
                        <ChevronDown className={cn("h-4 w-4 text-gray-400 transition", open && "rotate-180")} />
                      </td>
                    </tr>
                    {open ? (
                      <tr className="border-b border-gray-50 bg-[#FAF7F0]">
                        <td colSpan={7} className="px-3 py-3">
                          <div className="grid gap-3 md:grid-cols-3">
                            <div className="rounded-xl border border-black/[0.06] bg-white px-3 py-2.5">
                              <p className="font-saveful text-[10px] uppercase tracking-wide text-gray-400">Person</p>
                              <p className="mt-1 font-saveful-semibold text-sm text-gray-900">{row.name}</p>
                              <p className="font-saveful text-xs text-gray-600">{row.email}</p>
                              <p className="font-saveful text-xs text-gray-500">{row.mobile || "No mobile on file"}</p>
                            </div>
                            <div className="rounded-xl border border-black/[0.06] bg-white px-3 py-2.5">
                              <p className="font-saveful text-[10px] uppercase tracking-wide text-gray-400">Access</p>
                              <p className="mt-1 font-saveful-semibold text-sm text-gray-900">{row.role}</p>
                              <p className="font-saveful text-xs text-gray-600">{row.status}</p>
                              <p className="font-saveful text-xs text-gray-500">
                                {row.allSites
                                  ? "Enterprise-wide access"
                                  : row.sites.length
                                    ? `${row.sites.length} assigned ${row.sites.length === 1 ? "site" : "sites"}`
                                    : "No site scope"}
                              </p>
                            </div>
                            <div className="rounded-xl border border-black/[0.06] bg-white px-3 py-2.5">
                              <p className="font-saveful text-[10px] uppercase tracking-wide text-gray-400">Organisation</p>
                              <p className="mt-1 font-saveful-semibold text-sm text-gray-900">{row.orgName}</p>
                              <p className="font-saveful text-xs text-gray-500">{row.orgType}</p>
                            </div>
                          </div>
                          {row.sites.length ? (
                            <div className="mt-3 space-y-2">
                              {row.sites.map((site) => (
                                <div key={site.id} className="rounded-xl border border-black/[0.06] bg-white px-3 py-2.5">
                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                      <Link
                                        href={`/admin/sites/${site.id}?org=${row.orgId}`}
                                        className="font-saveful-semibold text-sm text-saveful-green hover:underline"
                                      >
                                        {site.name}
                                      </Link>
                                      <p className="font-saveful text-xs text-gray-600">{siteLine(site)}</p>
                                    </div>
                                    <StatusPill status={site.status} />
                                  </div>
                                  <p className="mt-1 font-saveful text-[11px] text-gray-400">
                                    {[site.groupLabel, site.territoryLabel, site.clusterLabel].filter(Boolean).join(" · ") || "No group, territory or cluster"}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : row.allSites ? (
                            <p className="mt-3 font-saveful text-xs text-gray-500">
                              This person can access every site in {row.orgName}.
                            </p>
                          ) : null}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 ? (
          <p className="px-3 py-8 text-center font-saveful text-sm text-gray-500">
            {needle ? "No enterprise users match that search." : "No enterprise users in this view."}
          </p>
        ) : null}
        <TablePager
          page={current}
          pageSize={pageSize}
          total={rows.length}
          noun="users"
          onPage={setPage}
          onPageSize={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </AdminSection>
    </AdminPage>
  );
}

export function AdminActivity() {
  useAdminAuditVersion();
  const version = useAdminVersion();
  const { filters, update, reset, query } = useAdminFilters();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const rows = useMemo(() => {
    return listNetworkActivity(filters).map((row) => ({
      id: row.id,
      at: row.at,
      type: row.kind,
      title: row.kind,
      detail: row.detail,
      orgId: row.organisationId,
      orgName: row.organisationName,
      href: row.href ? `${row.href}${row.href.includes("?") ? "" : query}` : `/admin/organisations/${row.organisationId}${query}`,
    }));
  }, [filters, query, version]);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pageCount);
  const paged = rows.slice((current - 1) * pageSize, current * pageSize);

  return (
    <AdminPage
      workspace
      crumb={[{ href: `/admin/dashboard${query}`, label: "Dashboard" }]}
      title="Activity"
      hint="Enterprise, charity, and business app activity across the network."
    >
      <AdminFiltersBar filters={filters} onChange={update} onReset={reset} />
      <AdminSection title="Recent events">
        {rows.length === 0 ? (
          <p className="px-3.5 py-8 text-center font-saveful text-sm text-gray-500">No activity in this period.</p>
        ) : null}
        <ul>
          {paged.map((row) => (
            <li key={row.id} className="border-b border-gray-50 last:border-0">
              <Link href={row.href} className="flex items-start justify-between gap-3 px-3.5 py-2.5 hover:bg-[#FAF7F0]">
                <div className="min-w-0">
                  <p className="font-saveful-semibold text-sm text-gray-900">{row.title}</p>
                  <p className="truncate font-saveful text-xs text-gray-500">{row.detail}</p>
                  <p className="mt-0.5 font-saveful text-[11px] text-gray-400">
                    {row.orgName || getOrganisation(row.orgId)?.name || row.orgId} · {row.type}
                  </p>
                </div>
                <span className="shrink-0 font-saveful text-xs text-gray-400">{formatLastActivity(row.at)}</span>
              </Link>
            </li>
          ))}
        </ul>
        <TablePager
          page={current}
          pageSize={pageSize}
          total={rows.length}
          noun="events"
          onPage={setPage}
          onPageSize={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </AdminSection>
    </AdminPage>
  );
}

export function AdminNetworkHealth() {
  const { filters, update, reset, query } = useAdminFilters();
  const ready = useAdminReady();
  const model = buildAdminOverview(filters);
  const orgs = model.headlines.organisations.value;
  const activeOrgs = model.organisations.filter((org) => org.status === "Active").length;
  const sites = model.headlines.sites.value;
  const activeSites = model.sites.filter((site) => site.status === "Active").length;
  const recoveringSites = model.sites.filter((site) =>
    model.collections.some((row) => row.siteId === site.id),
  ).length;
  const orgRate = orgs ? Math.round((activeOrgs / orgs) * 100) : 0;
  const siteRate = activeSites ? Math.round((recoveringSites / activeSites) * 100) : 0;
  const widest = Math.max(...model.types.map((row) => row.recoveredKg), 1);

  if (!ready) {
    return (
      <AdminPage
        workspace
        crumb={[{ href: `/admin/dashboard${query}`, label: "Dashboard" }]}
        title="Network Health"
        hint="Loading participation across organisations and sites…"
      >
        <AdminFiltersBar filters={filters} onChange={update} onReset={reset} />
        <SavefulPageLoader message="Loading network health…" fullScreen={false} />
      </AdminPage>
    );
  }

  return (
    <AdminPage
      workspace
      crumb={[{ href: `/admin/dashboard${query}`, label: "Dashboard" }]}
      title="Network Health"
      hint="Whether organisations are actually using Saveful — listing surplus, claiming it, and completing collections."
    >
      <AdminFiltersBar filters={filters} onChange={update} onReset={reset} />

      <section className="overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#16382d_0%,#2d5f4f_70%)] px-5 py-5 text-white">
        <p className="font-saveful text-[11px] uppercase tracking-[0.16em] text-white/60">Participation this period</p>
        <p className="mt-2 max-w-2xl font-saveful text-lg leading-snug text-white">
          {formatCount(activeOrgs)} of {formatCount(orgs)} organisations are active, and {formatCount(recoveringSites)} of{" "}
          {formatCount(activeSites)} active sites recovered food.
        </p>
        <p className="mt-2 font-saveful text-sm text-white/70">
          Listings are claimed {model.operations.claimRate}% of the time and collected {model.operations.recoveryRate}% of the time.
          {model.headlines.recovered.delta === 0
            ? ` Recovery is in line with the ${model.priorLabel}.`
            : ` Food recovered is ${model.headlines.recovered.delta > 0 ? "up" : "down"} ${formatKg(Math.abs(model.headlines.recovered.delta))} versus the ${model.priorLabel}.`}
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <HealthStat
          href={`/admin/organisations${query}`}
          label="Organisations active"
          value={`${orgRate}%`}
          note={`${formatCount(activeOrgs)} of ${formatCount(orgs)}`}
          width={orgRate}
        />
        <HealthStat
          href={`/admin/sites${query}`}
          label="Sites recovering food"
          value={`${siteRate}%`}
          note={`${formatCount(recoveringSites)} of ${formatCount(activeSites)} active sites`}
          width={siteRate}
        />
        <HealthStat
          href={`/admin/listings${query}`}
          label="Listings claimed"
          value={`${model.operations.claimRate}%`}
          note={`${formatCount(model.operations.listingsPublished)} published`}
          width={model.operations.claimRate}
        />
        <HealthStat
          href={`/admin/collections${query}`}
          label="Listings collected"
          value={`${model.operations.recoveryRate}%`}
          note={`${formatCount(model.headlines.collections.value)} collections · ${formatKg(model.recoveredKg)}`}
          width={model.operations.recoveryRate}
        />
      </div>

      <AdminSection title="Who is participating">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 font-saveful text-[11px] uppercase tracking-wide text-gray-400">
                <th className="px-3.5 py-2 font-saveful">Type</th>
                <th className="px-3.5 py-2 font-saveful">Orgs</th>
                <th className="px-3.5 py-2 font-saveful">Active</th>
                <th className="px-3.5 py-2 font-saveful">Listings</th>
                <th className="px-3.5 py-2 font-saveful">Claims</th>
                <th className="px-3.5 py-2 font-saveful">Collections</th>
                <th className="px-3.5 py-2 font-saveful">Recovered</th>
              </tr>
            </thead>
            <tbody>
              {model.types.map((row) => (
                <tr key={row.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-3.5 py-2.5">
                    <p className="font-saveful-semibold text-sm text-gray-900">{shortNetworkType(row.label)}</p>
                    <div className="mt-1.5 h-1.5 w-28 overflow-hidden rounded-full bg-[#F0EDE4]">
                      <div
                        className="h-full rounded-full bg-saveful-green"
                        style={{ width: `${Math.max(row.recoveredKg > 0 ? 8 : 0, (row.recoveredKg / widest) * 100)}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-3.5 py-2.5 font-saveful text-sm tabular-nums text-gray-700">{formatCount(row.organisations)}</td>
                  <td className="px-3.5 py-2.5 font-saveful text-sm tabular-nums text-gray-700">{formatCount(row.active)}</td>
                  <td className="px-3.5 py-2.5 font-saveful text-sm tabular-nums text-gray-700">{formatCount(row.listings)}</td>
                  <td className="px-3.5 py-2.5 font-saveful text-sm tabular-nums text-gray-700">{formatCount(row.claims)}</td>
                  <td className="px-3.5 py-2.5 font-saveful text-sm tabular-nums text-gray-700">{formatCount(row.collections)}</td>
                  <td className="px-3.5 py-2.5 font-saveful text-sm tabular-nums text-gray-700">{formatKg(row.recoveredKg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSection>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <AdminSection title="Where recovered food goes">
          <ul className="divide-y divide-gray-50">
            {model.pathways.map((item) => (
              <li key={item.pathway} className="px-3.5 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2 font-saveful text-sm text-gray-700">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.color }} />
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span className="shrink-0 font-saveful text-sm tabular-nums text-gray-800">
                    {formatKg(item.kg)} · {item.percent}%
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#F0EDE4]">
                  <div className="h-full rounded-full" style={{ width: `${item.percent}%`, background: item.color }} />
                </div>
              </li>
            ))}
          </ul>
        </AdminSection>
        <AdminSection title="Where participation is stalling" action={<Link href={`/admin/gaps${query}`} className="font-saveful-semibold text-xs text-saveful-green hover:underline">View gaps</Link>}>
          <AttentionList items={model.attention} />
        </AdminSection>
      </div>

      <p className="font-saveful text-[11px] text-gray-400">
        {formatCount(sites)} sites in scope · {formatCount(activeSites)} active. A site counts as recovering food when it has a collection in the selected period.
      </p>
    </AdminPage>
  );
}

function HealthStat({
  href,
  label,
  value,
  note,
  width,
}: {
  href: string;
  label: string;
  value: string;
  note: string;
  width: number;
}) {
  return (
    <Link href={href} className="rounded-xl border border-gray-200 bg-white px-3.5 py-3 hover:bg-[#FAF7F0]">
      <p className="font-saveful text-[11px] text-gray-500">{label}</p>
      <p className="mt-1.5 font-saveful-bold text-lg tabular-nums text-gray-900">{value}</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#F0EDE4]">
        <div className="h-full rounded-full bg-saveful-green" style={{ width: `${Math.min(100, Math.max(0, width))}%` }} />
      </div>
      <p className="mt-1.5 font-saveful text-[11px] text-gray-400">{note}</p>
    </Link>
  );
}

function shortNetworkType(label: string) {
  return label.replace(" / Surplus Provider", "").replace(" Recovery Provider", "");
}

export function AdminGaps() {
  const { filters, update, reset, query } = useAdminFilters();
  const model = buildAdminOverview(filters);
  return (
    <AdminPage
      workspace
      crumb={[{ href: `/admin/dashboard${query}`, label: "Dashboard" }]}
      title="Supply & Recovery Gaps"
      hint="Where surplus is listed but not recovered, or recovery demand is not being met."
    >
      <AdminFiltersBar filters={filters} onChange={update} onReset={reset} />
      <AdminSection title="Open gaps">
        <AttentionList items={model.attention} />
      </AdminSection>
    </AdminPage>
  );
}

export function AdminCreateReport() {
  const { filters, query } = useAdminFilters();
  const version = useAdminVersion();
  const [period, setPeriod] = useState(filters.period);
  const [from, setFrom] = useState(filters.from);
  const [to, setTo] = useState(filters.to);
  const story = useMemo(
    () => buildAdminInsightStory({ ...filters, period, from, to }),
    [filters, period, from, to, version],
  );

  return (
    <AdminPage
      crumb={[{ href: `/admin/insights${query}`, label: "Insights & Reports" }]}
      title="Create Report"
      hint="Download a complete platform report using the same figures as Insights."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <PeriodFilter
          period={period}
          from={from}
          to={to}
          onChange={(next) => {
            setPeriod(next.period);
            setFrom(next.from);
            setTo(next.to);
          }}
        />
        <div className="rounded-xl border border-gray-200 bg-[#F7F6F2] px-3.5 py-3">
          <p className="font-saveful text-[11px] uppercase tracking-wide text-gray-400">Included in the report</p>
          <p className="mt-1 font-saveful text-sm text-gray-700">
            Impact summary, equivalents, pathways, foods, recipients, sources, sites, network by type, activity and attention items.
          </p>
        </div>
      </div>
      <AdminSection title="Preview">
        <div className="grid gap-2 p-3.5 sm:grid-cols-2 xl:grid-cols-4">
          <PreviewStat label="Food recovered" value={formatKg(story.overview.metrics.recoveredKg)} />
          <PreviewStat label="Meals" value={formatCount(story.equivalents.meals)} />
          <PreviewStat label="CO₂ avoided" value={formatKg(story.equivalents.co2)} />
          <PreviewStat label="Food value" value={formatMoney(story.equivalents.value)} />
        </div>
        <p className="border-t border-gray-100 px-3.5 py-3 font-saveful text-sm text-gray-600">{adminInsightSummary(story)}</p>
      </AdminSection>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => downloadAdminInsightReport(story)}
          className="inline-flex h-9 items-center rounded-lg bg-saveful-green px-3.5 font-saveful-semibold text-sm text-white"
        >
          Download report
        </button>
        <button
          type="button"
          onClick={() => downloadAdminInsightExcel(story)}
          className="inline-flex h-9 items-center rounded-lg border border-black/[0.06] px-3.5 font-saveful-semibold text-sm text-gray-800"
        >
          Download Excel
        </button>
        <Link href={`/admin/insights${query}`} className="inline-flex h-9 items-center rounded-lg px-3.5 font-saveful-semibold text-sm text-saveful-green hover:underline">
          Back to Insights
        </Link>
      </div>
    </AdminPage>
  );
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2.5 ring-1 ring-black/[0.04]">
      <p className="font-saveful text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 font-saveful-bold text-lg tabular-nums text-gray-900">{value}</p>
    </div>
  );
}

export function AdminSupport() {
  const { query } = useAdminFilters();
  const links = [
    { href: `/admin/exceptions${query}`, label: "Exceptions & Data Quality", detail: "Unclaimed listings, overdue collections, and quiet sites." },
    { href: `/admin/audit${query}`, label: "Platform Audit Log", detail: "Who changed organisation, site, or account data." },
    { href: `/admin/notifications${query}`, label: "Platform Notifications & Rules", detail: "System events and notification rules." },
  ];
  return (
    <AdminPage
      crumb={[{ href: `/admin/dashboard${query}`, label: "Dashboard" }]}
      title="Support & Troubleshooting"
      hint="Start here when a customer cannot list, collect, or see expected activity."
    >
      <ul className="divide-y divide-gray-100">
        {links.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="block py-3 hover:text-saveful-green">
              <p className="font-saveful-semibold text-sm text-gray-900">{item.label}</p>
              <p className="font-saveful text-xs text-gray-500">{item.detail}</p>
            </Link>
          </li>
        ))}
      </ul>
    </AdminPage>
  );
}

export function AdminExceptions() {
  const { filters, update, reset, query } = useAdminFilters();
  const model = buildAdminOverview(filters);
  return (
    <AdminPage
      workspace
      crumb={[{ href: `/admin/dashboard${query}`, label: "Dashboard" }]}
      title="Exceptions & Data Quality"
      hint="Configuration and operational issues that need a Saveful Admin."
    >
      <AdminFiltersBar filters={filters} onChange={update} onReset={reset} />
      <AdminSection title="Open exceptions">
        <AttentionList items={model.attention} />
      </AdminSection>
    </AdminPage>
  );
}

export function AdminProvision() {
  const user = useSession();
  const { query } = useAdminFilters();
  const [notice, setNotice] = useState("");
  const [adding, setAdding] = useState(false);
  return (
    <AdminPage
      crumb={[{ href: `/admin/organisations${query}`, label: "Organisations" }]}
      title="Provision Organisations"
      hint="Create a customer organisation. The nominated Super Admin receives an activation invitation."
      actions={
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex h-9 items-center rounded-lg bg-saveful-green px-3.5 font-saveful-semibold text-sm text-white"
        >
          Add Organisation
        </button>
      }
    >
      {notice ? (
        <p className="rounded-xl border border-saveful-green/20 bg-saveful-green/[0.06] px-3.5 py-2.5 font-saveful text-sm text-saveful-green">
          {notice}
        </p>
      ) : null}
      {adding ? (
        <AddOrganisationForm
          onClose={() => setAdding(false)}
          actor={{ name: user?.name ?? "Saveful Admin", email: user?.email ?? "" }}
          onCreated={(message) => {
            setNotice(message);
            setAdding(false);
          }}
        />
      ) : null}
      <Link href={`/admin/organisations${query}`} className="inline-flex h-9 items-center font-saveful-semibold text-sm text-saveful-green hover:underline">
        View organisations →
      </Link>
    </AdminPage>
  );
}

export function AdminPlans() {
  const { query } = useAdminFilters();
  const rows = listOrganisations();
  return (
    <AdminPage
      crumb={[{ href: `/admin/dashboard${query}`, label: "Dashboard" }]}
      title="Plans & Accounts"
      hint="Account status and plan for every organisation on Saveful."
    >
      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 font-saveful text-[11px] uppercase tracking-wide text-gray-400">
              <th className="px-3 py-2.5 font-saveful">Organisation</th>
              <th className="px-3 py-2.5 font-saveful">Type</th>
              <th className="px-3 py-2.5 font-saveful">Plan</th>
              <th className="px-3 py-2.5 font-saveful">Account status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((org) => (
              <tr key={org.id} className="border-b border-gray-50 last:border-0">
                <td className="px-3 py-3">
                  <Link href={`/admin/organisations/${org.id}${query}`} className="font-saveful-semibold text-sm text-saveful-green hover:underline">
                    {org.name}
                  </Link>
                </td>
                <td className="px-3 py-3 font-saveful text-sm text-gray-700">{orgTypeLabel(org.type)}</td>
                <td className="px-3 py-3 font-saveful text-sm text-gray-700">{planLabel(org.plan)}</td>
                <td className="px-3 py-3">
                  <StatusPill status={org.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminPage>
  );
}

export function AdminMethodology() {
  const { query } = useAdminFilters();
  return (
    <AdminPage
      crumb={[{ href: `/admin/insights${query}`, label: "Insights & Reports" }]}
      title="Impact Methodology"
      hint="Every Admin and Enterprise surface uses these conversion factors. Always label CO₂ avoided, never CO₂e."
    >
      <dl className="divide-y divide-gray-100">
        <MethodRow label="Meal weight" value={`${IMPACT.MEAL_WEIGHT_KG} kg per meal`} />
        <MethodRow label="CO₂ avoided" value={`${IMPACT.CO2_PER_KG} kg CO₂ avoided per kg food`} />
        <MethodRow label="Estimated food value" value={`$${IMPACT.FOOD_VALUE_PER_KG} per kg`} />
      </dl>
    </AdminPage>
  );
}

function AttentionList({ items }: { items: { id: string; label: string; count: number; href: string }[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id} className="border-b border-gray-50 last:border-0">
          <Link href={item.href} className="flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-[#FAF7F0]">
            <span className="min-w-0 truncate font-saveful text-sm text-gray-700">{item.label}</span>
            <span className="font-saveful-semibold text-sm tabular-nums text-gray-800">{formatCount(item.count)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function MethodRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="font-saveful text-sm text-gray-500">{label}</dt>
      <dd className="font-saveful-semibold text-sm text-gray-900">{value}</dd>
    </div>
  );
}
