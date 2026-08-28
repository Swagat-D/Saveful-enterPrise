"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AddOrganisationForm } from "@/components/admin/AdminOrganisations";
import { AdminFiltersBar, AdminPage, AdminSection, StatusPill, TablePager, useAdminFilters, type PageSize } from "@/components/admin/AdminChrome";
import { useSession } from "@/lib/auth";
import {
  buildAdminOverview,
  getOrganisation,
  listListings,
  listCollections,
  listOrgUsers,
  listOrganisations,
  orgTypeLabel,
  planLabel,
} from "@/lib/admin";
import { listAdminAudit, useAdminAuditVersion } from "@/lib/adminAudit";
import { formatDisplayDate } from "@/lib/dates";
import { IMPACT, formatCount, formatKg } from "@/lib/impact";
import { formatLastActivity } from "@/lib/networkRules";

export function AdminUsers() {
  const { filters, update, reset, query } = useAdminFilters();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const orgs = listOrganisations().filter((org) => {
    if (filters.organisationId !== "all" && org.id !== filters.organisationId) return false;
    if (filters.orgType !== "all" && org.type !== filters.orgType) return false;
    return true;
  });
  const rows = orgs.flatMap((org) =>
    listOrgUsers(org.id).map((user) => ({
      ...user,
      orgName: org.name,
      orgType: orgTypeLabel(org.type),
    })),
  );
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pageCount);
  const paged = rows.slice((current - 1) * pageSize, current * pageSize);

  return (
    <AdminPage
      workspace
      crumb={[{ href: `/admin/dashboard${query}`, label: "Dashboard" }]}
      title="Users"
      hint="People with access across the Saveful network. Last login is shown for site and organisation users."
    >
      <AdminFiltersBar filters={filters} onChange={update} onReset={reset} />
      <AdminSection title="Directory">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 font-saveful text-[11px] uppercase tracking-wide text-gray-400">
                <th className="px-3 py-2.5 font-saveful">User</th>
                <th className="px-3 py-2.5 font-saveful">Organisation</th>
                <th className="px-3 py-2.5 font-saveful">Role</th>
                <th className="px-3 py-2.5 font-saveful">Status</th>
                <th className="px-3 py-2.5 font-saveful">Last login / activity</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((row) => (
                <tr key={`${row.orgId}-${row.id}`} className="border-b border-gray-50 last:border-0">
                  <td className="px-3 py-3">
                    <p className="font-saveful-semibold text-sm text-gray-900">{row.name}</p>
                    <p className="font-saveful text-xs text-gray-500">{row.email}</p>
                  </td>
                  <td className="px-3 py-3">
                    <Link href={`/admin/organisations/${row.orgId}${query}`} className="font-saveful text-sm text-saveful-green hover:underline">
                      {row.orgName}
                    </Link>
                    <p className="font-saveful text-[11px] text-gray-400">{row.orgType}</p>
                  </td>
                  <td className="px-3 py-3 font-saveful text-sm text-gray-700">{row.role}</td>
                  <td className="px-3 py-3">
                    <StatusPill status={row.status} />
                  </td>
                  <td className="px-3 py-3 font-saveful text-sm text-gray-600">
                    {row.status === "Invited" ? "Invitation sent" : row.lastActiveAt ? formatLastActivity(row.lastActiveAt) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
  const { filters, update, reset, query } = useAdminFilters();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const rows = useMemo(() => {
    const listings = listListings()
      .filter((row) => filters.organisationId === "all" || row.orgId === filters.organisationId)
      .map((row) => ({
        id: `listing-${row.id}`,
        at: row.createdAt,
        type: "Listing",
        title: `${row.code} ${row.status.replaceAll("_", " ")}`,
        detail: `${row.food} · ${formatKg(row.quantityKg)}`,
        orgId: row.orgId,
        href: `/admin/listings/${row.id}${query}`,
      }));
    const collections = listCollections()
      .filter((row) => filters.organisationId === "all" || row.orgId === filters.organisationId || row.recipientOrgId === filters.organisationId)
      .map((row) => ({
        id: `collection-${row.id}`,
        at: row.occurredAt,
        type: "Collection",
        title: `${row.code} ${row.status.replaceAll("_", " ")}`,
        detail: `${row.food} went to ${row.recipientName}`,
        orgId: row.orgId,
        href: `/admin/collections/${row.id}${query}`,
      }));
    const audit = listAdminAudit({ q: "", period: filters.period, organisationId: filters.organisationId, page: 1 }).map((row) => ({
      id: `audit-${row.id}`,
      at: row.at,
      type: "Alert",
      title: row.action,
      detail: row.detail,
      orgId: row.organisationId,
      href: `/admin/audit${query}`,
    }));
    return [...listings, ...collections, ...audit].sort((a, b) => b.at.localeCompare(a.at));
  }, [filters.organisationId, filters.period, query]);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pageCount);
  const paged = rows.slice((current - 1) * pageSize, current * pageSize);

  return (
    <AdminPage
      workspace
      crumb={[{ href: `/admin/dashboard${query}`, label: "Dashboard" }]}
      title="Activity"
      hint="Listings, collections, and Saveful Admin changes across the network."
    >
      <AdminFiltersBar filters={filters} onChange={update} onReset={reset} />
      <AdminSection title="Recent events">
        <ul>
          {paged.map((row) => (
            <li key={row.id} className="border-b border-gray-50 last:border-0">
              <Link href={row.href} className="flex items-start justify-between gap-3 px-3.5 py-2.5 hover:bg-[#FAF7F0]">
                <div className="min-w-0">
                  <p className="font-saveful-semibold text-sm text-gray-900">{row.title}</p>
                  <p className="truncate font-saveful text-xs text-gray-500">{row.detail}</p>
                  <p className="mt-0.5 font-saveful text-[11px] text-gray-400">
                    {getOrganisation(row.orgId)?.name ?? row.orgId} · {row.type}
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
  const model = buildAdminOverview(filters);
  return (
    <AdminPage
      workspace
      crumb={[{ href: `/admin/dashboard${query}`, label: "Dashboard" }]}
      title="Network Health"
      hint="How the surplus network is participating and recovering food right now."
    >
      <AdminFiltersBar filters={filters} onChange={update} onReset={reset} />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="Organisations" value={formatCount(model.headlines.organisations.value)} />
        <Stat label="Sites" value={formatCount(model.headlines.sites.value)} />
        <Stat label="Collections" value={formatCount(model.headlines.collections.value)} />
        <Stat label="Claim rate" value={`${model.operations.claimRate}%`} />
      </div>
      <AdminSection title="Network by type">
        <ul className="divide-y divide-gray-50">
          {model.types.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
              <span className="font-saveful text-sm text-gray-700">{item.label}</span>
              <span className="font-saveful text-sm tabular-nums text-gray-800">{formatCount(item.organisations)}</span>
            </li>
          ))}
        </ul>
      </AdminSection>
    </AdminPage>
  );
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
  const { query } = useAdminFilters();
  const [period, setPeriod] = useState("30");
  return (
    <AdminPage
      crumb={[{ href: `/admin/insights${query}`, label: "Insights & Reports" }]}
      title="Create Report"
      hint="Generate a Saveful-wide impact report using the same methodology as Insights."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block font-saveful text-[11px] uppercase tracking-[0.12em] text-gray-500">Report name</span>
          <input className="h-9 w-full rounded-lg border border-black/[0.06] bg-[#F7F6F2] px-3 font-saveful text-sm outline-none focus:border-saveful-green/40" defaultValue="Platform impact report" />
        </label>
        <label className="block">
          <span className="mb-1.5 block font-saveful text-[11px] uppercase tracking-[0.12em] text-gray-500">Period</span>
          <select value={period} onChange={(event) => setPeriod(event.target.value)} className="h-9 w-full rounded-lg border border-black/[0.06] bg-[#F7F6F2] px-2.5 font-saveful text-sm outline-none">
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="all">All time</option>
          </select>
        </label>
      </div>
      <p className="font-saveful text-sm text-gray-600">
        Reports use the same conversion factors as Dashboard and Insights. Open Insights to review figures before you export.
      </p>
      <Link href={`/admin/insights${query}`} className="inline-flex h-9 items-center rounded-lg bg-saveful-green px-3.5 font-saveful-semibold text-sm text-white">
        Open Insights
      </Link>
    </AdminPage>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3.5 py-3">
      <p className="font-saveful text-[11px] text-gray-500">{label}</p>
      <p className="mt-1.5 font-saveful-bold text-lg tabular-nums text-gray-900">{value}</p>
    </div>
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
